"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react"
import * as XLSX from "xlsx"

// ---------- helpers that used to live in lib/excel-processor.ts ----------
const normalize = (value: unknown) =>
  (value === null || value === undefined ? "" : String(value)).toLowerCase().trim().replace(/\s+/g, "")
const HEADER_ROW_MAPPING = {
  apellido: "inspectorName",
  día: "date",
  dia: "date",
  lugar: "placeOfWork",
  sentido: "direction",
}
const COLUMN_MAPPING = {
  línea: "lineOrRouteNumber",
  linea: "lineOrRouteNumber",
  conductor: "driverName",
  servicio: "serviceCode",
  coche: "fleetCoachNumber",
  hora: "exactHourOfArrival",
  gps: "gpsMinutes",
  pasajeros: "passengersOnBoard",
  pases: "passesUsed",
  parada: "addressOfStop",
  observación: "observations",
  observaciones: "observations",
  observacion: "observations",
  notas: "observations",
  comentarios: "observations",
  infracción: "nonCompliance",
  infraccion: "nonCompliance",
  incumplimiento: "nonCompliance",
}

const gpsStatus = (m: number) => (m < 0 ? "late" : m >= 2 ? "early" : "on-time")

function parseGps(v: any) {
  if (!v) return 0
  const s = String(v).trim() // Ensure it's a string
  if (/^[+-]?\d+:\d+$/.test(s)) {
    const match = s.match(/^([+-]?)(\d+):(\d+)$/)
    if (match) {
      const sign = match[1] === "-" ? -1 : 1
      const min = Number.parseInt(match[2], 10) || 0
      const sec = Number.parseInt(match[3], 10) || 0
      return sign * (min + sec / 60)
    }
  }
  if (/^[+-]?\d+$/.test(s)) {
    return +s
  }
  const n = Number.parseFloat(s)
  return isNaN(n) ? 0 : n
}

function excelArrayToJson(uint8: Uint8Array) {
  const wb = XLSX.read(uint8, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

  console.log("Excel Raw Data:", JSON.stringify(raw, null, 2)) // DEBUG: Log raw data

  if (raw.length < 2) throw new Error("Excel must contain header and data rows")

  // header rows
  const headerInfo: any = {}
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const r = raw[i]
    if (r?.length >= 2) {
      const label = r[0]
      const val = r[1]
      const key = HEADER_ROW_MAPPING[normalize(label)] as string | undefined
      if (key) {
        headerInfo[key] = key === "date" ? new Date(val).toISOString().split("T")[0] : String(val || "").trim()
      }
    }
  }
  console.log("Extracted Header Info:", headerInfo) // DEBUG: Log extracted header info

  // find data header
  const dataHeaderRow = raw.findIndex((r) => r.some((c: any) => COLUMN_MAPPING[normalize(String(c || ""))]))
  console.log("Detected Data Header Row Index:", dataHeaderRow) // DEBUG: Log detected header row index

  if (dataHeaderRow === -1) throw new Error("Service-data columns (Línea, Conductor …) not found")

  const dataHeaders = raw[dataHeaderRow]
  console.log("Data Headers Row Content:", dataHeaders) // DEBUG: Log content of the detected header row

  const map: Record<number, string> = {}
  dataHeaders.forEach((h: any, i: number) => {
    const k = COLUMN_MAPPING[normalize(String(h || ""))]
    if (k) map[i] = k
  })
  console.log("Column Mapping (Index to Field Name):", map) // DEBUG: Log the final column mapping

  const rows = raw.slice(dataHeaderRow + 1)
  console.log("Data Rows to Process (after header):", JSON.stringify(rows, null, 2)) // DEBUG: Log data rows

  const serviceChecks = rows.flatMap((row, idx) =>
    (() => {
      const obj: any = { ...headerInfo }
      Object.entries(map).forEach(([col, field]) => {
        const val = row[+col]
        if (val === undefined || val === null || String(val).trim() === "") return // Also check for empty string after trim
        if (field === "exactHourOfArrival") {
          obj[field] = typeof val === "number" ? XLSX.SSF.format("hh:mm:ss", val) : String(val)
        } else if (field === "gpsMinutes") {
          obj[field] = parseGps(val)
        } else if (field === "passengersOnBoard" || field === "passesUsed") {
          obj[field] = +val || 0
        } else if (field === "nonCompliance") {
          obj[field] = /^(true|1|yes|sí|si)$/i.test(String(val))
        } else {
          obj[field] = String(val).trim()
        }
      })

      console.log(`Processed Row ${idx}:`, obj) // DEBUG: Log each processed row object

      // The condition that filters out rows
      if (!obj.lineOrRouteNumber && !obj.driverName && !obj.serviceCode) {
        console.log(`Row ${idx} filtered out: Missing key service data.`) // DEBUG: Log why a row is filtered
        return []
      }
      return [
        {
          id: `excel-${Date.now()}-${idx}`,
          lineOrRouteNumber: obj.lineOrRouteNumber || "",
          driverName: obj.driverName || "",
          serviceCode: obj.serviceCode || "",
          fleetCoachNumber: obj.fleetCoachNumber || "",
          exactHourOfArrival: obj.exactHourOfArrival || "",
          gpsStatus: { minutes: obj.gpsMinutes || 0, status: gpsStatus(obj.gpsMinutes || 0) },
          passengersOnBoard: obj.passengersOnBoard || 0,
          passesUsed: obj.passesUsed || 0,
          addressOfStop: obj.addressOfStop || "",
          observations: [obj.observations || "", obj.direction || ""].filter(Boolean).join(" - "),
          nonCompliance: obj.nonCompliance || false,
        },
      ]
    })(),
  )
  console.log("Final Service Checks Count:", serviceChecks.length) // DEBUG: Final count
  return {
    formHeader: {
      title: "DAILY INSPECTION FORM",
      inspectorName: headerInfo.inspectorName || "",
      date: headerInfo.date || new Date().toISOString().split("T")[0],
      placeOfWork: headerInfo.placeOfWork || "",
    },
    serviceChecks,
  }
}
// ------------------- end helpers -------------------

interface ExcelUploadProps {
  onDataLoaded: (data: any) => void
  onClose: () => void
}

export function ExcelUpload({ onDataLoaded, onClose }: ExcelUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setResult({
        success: false,
        message: "Please upload a valid Excel file (.xlsx or .xls)",
      })
      return
    }

    setIsProcessing(true)
    setResult(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        if (!arrayBuffer) {
          setResult({ success: false, message: "Failed to read file as ArrayBuffer." })
          setIsProcessing(false)
          return
        }

        const uint8Array = new Uint8Array(arrayBuffer)

        const parsed = excelArrayToJson(uint8Array)
        setResult({ success: true, message: `Loaded ${parsed.serviceChecks.length} checks` })
        setTimeout(() => {
          onDataLoaded(parsed)
          onClose()
        }, 1000)
      } catch (error) {
        setResult({
          success: false,
          message: "Failed to process the Excel file. Please check the file format.",
        })
        console.error("Error during Excel file processing:", error)
      } finally {
        setIsProcessing(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <CardTitle>Upload Excel File</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>Upload an Excel file with inspection data to automatically fill the form</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Expected Format Info */}
          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
            <p className="font-medium mb-3">Expected Excel structure:</p>

            <div className="mb-3">
              <p className="font-medium text-xs text-blue-700 mb-1">Header Information (as rows):</p>
              <div className="grid grid-cols-2 gap-1 text-xs pl-2">
                <span>• Apellido (Inspector)</span>
                <span>• Día (Date)</span>
                <span>• Lugar (Place)</span>
                <span>• Sentido (Direction)</span>
              </div>
            </div>

            <div>
              <p className="font-medium text-xs text-green-700 mb-1">Service Data (as columns):</p>
              <div className="grid grid-cols-2 gap-1 text-xs pl-2">
                <span>• Línea</span>
                <span>• Conductor</span>
                <span>• Servicio</span>
                <span>• Coche</span>
                <span>• Hora</span>
                <span>• GPS</span>
                <span>• Pasajeros</span>
                <span>• Pases</span>
                <span>• Parada</span>
                <span>• Observaciones</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2 italic">
              * Case insensitive - works with uppercase, lowercase, or mixed case
            </p>
          </div>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 mb-2">Drag and drop your Excel file here, or</p>
            <Button onClick={openFileDialog} disabled={isProcessing} variant="outline">
              {isProcessing ? "Processing..." : "Browse Files"}
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" />
          </div>

          {/* Result Message */}
          {result && (
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                {result.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Processing Excel file...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
