"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react"
import * as XLSX from "xlsx"

// ---------- helpers for Out-of-Section Excel processing ----------
const normalize = (value: unknown) =>
  (value === null || value === undefined ? "" : String(value)).toLowerCase().trim().replace(/\s+/g, "")

const HEADER_ROW_MAPPING = {
  línea: "lineOrRouteNumber",
  linea: "lineOrRouteNumber",
  lugar: "placeOfWork",
  sentido: "direction",
  fecha: "date",
  totalservicios: "totalOfServices",
  pasajeros: "totalOfPassengers",
  pasados: "totalOfOOS",
  pases: "totalOfPasses",
}

const COLUMN_MAPPING = {
  serv: "serviceCode",
  servicio: "serviceCode",
  bandera: "lineRouteBranch",
  hora: "exactHourOfSchedule",
  gps: "gpsStatus",
  pasajeros: "passengersOnBoard",
  pasados: "outOfSectionTickets",
  pases: "passesUsed",
  observación: "observations",
  observacion: "observations",
  observaciones: "observations",
  obs: "observations",
}

function parseGps(v) {
  if (v === null || v === undefined || String(v).trim() === "") return { minutes: 0, seconds: 0 }
  let s = String(v).trim()

  // Remove parentheses if present
  s = s.replace(/[()]/g, "")

  if (/^[+-]?\d+:\d+$/.test(s)) {
    const match = s.match(/^([+-]?)(\d+):(\d+)$/)
    if (match) {
      const sign = match[1] === "-" ? -1 : 1
      const min = Number.parseInt(match[2], 10) || 0
      const sec = Number.parseInt(match[3], 10) || 0
      const totalSeconds = sign * (min * 60 + sec)
      return {
        minutes: Math.floor(totalSeconds / 60),
        seconds: totalSeconds % 60,
      }
    }
  }
  if (/^[+-]?\d+$/.test(s)) {
    const totalSeconds = +s
    return {
      minutes: Math.floor(totalSeconds / 60),
      seconds: totalSeconds % 60,
    }
  }
  const n = Number.parseFloat(s)
  if (!isNaN(n)) {
    return {
      minutes: Math.floor(n / 60),
      seconds: Math.floor(n % 60),
    }
  }
  return { minutes: 0, seconds: 0 }
}

function findDataStartRow(rawData: any[][]): number {
  // Define critical columns that must be present in the header row
  const criticalColumns = [
    "serv",
    "servicio", // serviceCode
    "bandera", // lineRouteBranch
    "hora", // exactHourOfSchedule
    "gps", // gpsStatus
    "pasajeros", // passengersOnBoard
    "pasados", // outOfSectionTickets
    "pases", // passesUsed
  ].map(normalize)

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i]
    if (row && row.length > 0) {
      const normalizedRowCells = row.map((cell) => normalize(cell))
      console.log(`DEBUG: findDataStartRow: Checking row ${i}, normalized cells:`, normalizedRowCells)

      let foundCriticalCount = 0
      for (const criticalCol of criticalColumns) {
        if (normalizedRowCells.includes(criticalCol)) {
          foundCriticalCount++
        }
      }

      // Require at least 5 out of the 8 critical columns to be present
      if (foundCriticalCount >= 5) {
        console.log(
          `DEBUG: findDataStartRow: Found potential header row at index ${i} with ${foundCriticalCount} critical matches.`,
        )
        return i
      }
    }
  }
  return -1
}

function excelArrayToJson(uint8: Uint8Array) {
  const wb = XLSX.read(uint8, { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

  console.log("DEBUG: Out-of-Section Excel Raw Data (first 15 rows):", JSON.stringify(raw.slice(0, 15), null, 2))

  if (raw.length < 2) throw new Error("Excel must contain header and data rows")

  // Extract header rows information
  const headerInfo: any = {}
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const r = raw[i]
    if (r?.length >= 2) {
      const label = r[0]
      const val = r[1]
      const key = HEADER_ROW_MAPPING[normalize(label)] as string | undefined
      if (key) {
        if (key === "date") {
          headerInfo[key] = new Date(val).toISOString().split("T")[0]
        } else if (key.startsWith("total")) {
          headerInfo[key] = Number.parseInt(val) || 0
        } else {
          headerInfo[key] = String(val || "").trim()
        }
      }
    }
  }
  console.log("DEBUG: Extracted Header Info:", headerInfo)

  // Find data header row
  const dataHeaderRowIndex = findDataStartRow(raw)
  console.log("DEBUG: Detected Data Header Row Index:", dataHeaderRowIndex)

  if (dataHeaderRowIndex === -1) throw new Error("Service-data columns (Serv, Bandera, Hora, GPS, etc.) not found")

  const dataHeaders = raw[dataHeaderRowIndex]
  console.log("DEBUG: Data Headers Row Content:", dataHeaders)

  const map: Record<number, string> = {}
  dataHeaders.forEach((h: any, i: number) => {
    const k = COLUMN_MAPPING[normalize(String(h || ""))]
    if (k) {
      map[i] = k
      console.log(`DEBUG: Mapped column index ${i} ('${h}') to field '${k}'`)
    } else {
      console.log(`DEBUG: Column index ${i} ('${h}') did not match any known field.`)
    }
  })
  console.log("DEBUG: Final Column Mapping (Index to Field Name):", map)

  const rows = raw.slice(dataHeaderRowIndex + 1)
  console.log("DEBUG: Number of Data Rows to Process:", rows.length)
  console.log("DEBUG: First 5 Data Rows to Process:", JSON.stringify(rows.slice(0, 5), null, 2))

  const serviceChecks = rows.flatMap((row, idx) =>
    (() => {
      const obj: any = {}
      let rowHasKeyData = false

      Object.entries(map).forEach(([colIndex, fieldName]) => {
        const val = row[Number.parseInt(colIndex)]
        const trimmedVal = String(val || "").trim()

        console.log(
          `DEBUG: Row ${idx}, Col ${colIndex} (Field: ${fieldName}): Raw Value='${val}', Trimmed='${trimmedVal}'`,
        )

        if (trimmedVal !== "") {
          if (fieldName === "exactHourOfSchedule") {
            obj[fieldName] = typeof val === "number" ? XLSX.SSF.format("hh:mm:ss", val) : trimmedVal
          } else if (fieldName === "gpsStatus") {
            const gpsData = parseGps(val)
            obj[fieldName] = gpsData
          } else if (
            fieldName === "passengersOnBoard" ||
            fieldName === "outOfSectionTickets" ||
            fieldName === "passesUsed"
          ) {
            obj[fieldName] = +trimmedVal || 0
          } else {
            obj[fieldName] = trimmedVal
          }
        } else {
          obj[fieldName] = ""
          if (fieldName === "passengersOnBoard" || fieldName === "outOfSectionTickets" || fieldName === "passesUsed") {
            obj[fieldName] = 0
          } else if (fieldName === "gpsStatus") {
            obj[fieldName] = { minutes: 0, seconds: 0 }
          }
        }

        // Check if any of the key fields are populated
        if (["serviceCode"].includes(fieldName) && obj[fieldName]) {
          rowHasKeyData = true
        }
      })

      console.log(`DEBUG: Processed Row ${idx} Object:`, obj)

      if (!rowHasKeyData) {
        console.log(`DEBUG: Row ${idx} filtered out: Missing key service data (serviceCode).`)
        return []
      }

      // Determine GPS status
      const gpsData = obj.gpsStatus || { minutes: 0, seconds: 0 }
      const totalSeconds = gpsData.minutes * 60 + gpsData.seconds
      let status = "on-time"
      if (totalSeconds < 0) status = "late"
      else if (totalSeconds >= 120)
        status = "early" // 2 minutes
      else status = "on-time"

      return [
        {
          id: `excel-${Date.now()}-${idx}`,
          serviceCode: obj.serviceCode || "",
          lineRouteBranch: obj.lineRouteBranch || "",
          exactHourOfSchedule: obj.exactHourOfSchedule || "",
          gpsStatus: {
            minutes: gpsData.minutes || 0,
            seconds: gpsData.seconds || 0,
            status: status,
          },
          passengersOnBoard: obj.passengersOnBoard || 0,
          outOfSectionTickets: obj.outOfSectionTickets || 0,
          passesUsed: obj.passesUsed || 0,
          observations: obj.observations || "",
        },
      ]
    })(),
  )

  console.log("DEBUG: Final Service Checks Count:", serviceChecks.length)

  return {
    formHeader: {
      title: "OUT-OF-SECTION TICKETS (PASADOS)",
      inspectorName: "", // This should be filled manually
      date: headerInfo.date || new Date().toISOString().split("T")[0],
      placeOfWork: headerInfo.placeOfWork || "",
      lineOrRouteNumber: headerInfo.lineOrRouteNumber || "",
      direction: headerInfo.direction || "",
      totalOfServices: headerInfo.totalOfServices || serviceChecks.length,
      totalOfPassengers:
        headerInfo.totalOfPassengers || serviceChecks.reduce((sum, check) => sum + check.passengersOnBoard, 0),
      totalOfOOS: headerInfo.totalOfOOS || serviceChecks.reduce((sum, check) => sum + check.outOfSectionTickets, 0),
      totalOfPasses: headerInfo.totalOfPasses || serviceChecks.reduce((sum, check) => sum + check.passesUsed, 0),
    },
    serviceChecks,
  }
}

interface OutOfSectionExcelUploadProps {
  onDataLoaded: (data: any) => void
  onClose: () => void
}

export function OutOfSectionExcelUpload({ onDataLoaded, onClose }: OutOfSectionExcelUploadProps) {
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
        setResult({ success: true, message: `Loaded ${parsed.serviceChecks.length} service checks` })
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
              <CardTitle>Upload Out-of-Section Excel File</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            Upload an Excel file with out-of-section ticket data to automatically fill the form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Expected Format Info */}
          <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
            <p className="font-medium mb-3">Expected Excel structure:</p>

            <div className="mb-3">
              <p className="font-medium text-xs text-blue-700 mb-1">Header Information (as rows):</p>
              <div className="grid grid-cols-2 gap-1 text-xs pl-2">
                <span>• Línea (Route)</span>
                <span>• Lugar (Place)</span>
                <span>• Sentido (Direction)</span>
                <span>• Fecha (Date)</span>
                <span>• Total Servicios</span>
                <span>• Pasajeros</span>
                <span>• Pasados</span>
                <span>• Pases</span>
              </div>
            </div>

            <div>
              <p className="font-medium text-xs text-green-700 mb-1">Service Data (as columns):</p>
              <div className="grid grid-cols-2 gap-1 text-xs pl-2">
                <span>• Serv/Servicio</span>
                <span>• Bandera</span>
                <span>• Hora</span>
                <span>• GPS</span>
                <span>• Pasajeros</span>
                <span>• Pasados</span>
                <span>• Pases</span>
                <span>• Observación</span>
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
