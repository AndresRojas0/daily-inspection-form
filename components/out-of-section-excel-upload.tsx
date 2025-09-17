"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, X, AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"

interface ExcelData {
  formHeader: {
    title: string
    inspectorName: string
    date: string
    placeOfWork: string
    lineOrRouteNumber: string
    direction: string
    totalOfServices: number
    totalOfPassengers: number
    totalOfOOS: number
    totalOfPasses: number
  }
  serviceChecks: Array<{
    id: string
    serviceCode: string
    lineRouteBranch: string
    exactHourOfSchedule: string
    gpsStatus: {
      minutes: number
      seconds: number
      status: string
    }
    passengersOnBoard: number
    outOfSectionTickets: number
    passesUsed: number
    observations: string
  }>
}

interface OutOfSectionExcelUploadProps {
  onDataLoaded: (data: ExcelData) => void
  onClose: () => void
}

// Mapping from Spanish field names to our form fields (case-insensitive)
const HEADER_ROW_MAPPING = {
  // Header information mapping
  línea: "lineOrRouteNumber",
  linea: "lineOrRouteNumber", // Alternative without accent
  lugar: "placeOfWork",
  sentido: "direction",
  fecha: "date",
  servicios: "totalOfServices",
  pasajeros: "totalOfPassengers",
  pasados: "totalOfOOS",
  pases: "totalOfPasses",
}

const COLUMN_MAPPING = {
  // Service check columns mapping
  serv: "serviceCode",
  servicio: "serviceCode",
  "bandera por ramal": "lineRouteBranch",
  bandera: "lineRouteBranch", // Short form
  ramal: "lineRouteBranch", // Alternative
  hora: "exactHourOfSchedule",
  gps: "gpsStatus",
  pasajeros: "passengersOnBoard",
  pasados: "outOfSectionTickets",
  pases: "passesUsed",
  observación: "observations", // With accent (singular)
  observaciones: "observations", // With accent (plural)
  observacion: "observations", // Without accent (singular)
  obs: "observations", // Short form
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, "")
}

function parseGpsVariance(gpsValue: any): { minutes: number; seconds: number; status: string } {
  if (!gpsValue) return { minutes: 0, seconds: 0, status: "on-time" }

  let gpsString = gpsValue.toString().trim()

  // Remove parentheses if present: (+mm:ss) or (-mm:ss)
  gpsString = gpsString.replace(/^$$(.+)$$$/, "$1")

  let totalSeconds = 0

  // Check if it contains a colon (mm:ss format)
  if (gpsString.includes(":")) {
    const match = gpsString.match(/^([+-]?)(\d+):(\d+)$/)
    if (match) {
      const sign = match[1] === "-" ? -1 : 1
      const minutes = Number.parseInt(match[2], 10) || 0
      const seconds = Number.parseInt(match[3], 10) || 0
      totalSeconds = sign * (minutes * 60 + seconds)
    }
  } else {
    // Handle +mm or -mm format
    const match = gpsString.match(/^([+-]?)(\d+)$/)
    if (match) {
      const sign = match[1] === "-" ? -1 : 1
      const minutes = Number.parseInt(match[2], 10) || 0
      totalSeconds = sign * (minutes * 60)
    }
  }

  // If it's already a number, use it directly (assume it's in seconds)
  if (typeof gpsValue === "number") {
    totalSeconds = gpsValue
  }

  // Calculate status
  let status = "on-time"
  if (totalSeconds < 0) status = "late"
  else if (totalSeconds >= 120)
    status = "early" // 2 minutes or more early
  else status = "on-time"

  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
    status,
  }
}

function formatTime(timeValue: any): string {
  if (!timeValue) return ""

  // Handle different time formats
  if (typeof timeValue === "string") {
    // If it's already in HH:MM format
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeValue)) {
      return timeValue.length === 5 ? `${timeValue}:00` : timeValue
    }
  }

  // Handle Excel time serial numbers
  if (typeof timeValue === "number") {
    const date = XLSX.SSF.parse_date_code(timeValue)
    if (date) {
      const hours = String(date.H || 0).padStart(2, "0")
      const minutes = String(date.M || 0).padStart(2, "0")
      const seconds = String(date.S || 0).padStart(2, "0")
      return `${hours}:${minutes}:${seconds}`
    }
  }

  return ""
}

function formatDate(dateValue: any): string {
  if (!dateValue) return ""

  // Handle different date formats
  if (typeof dateValue === "string") {
    // Try to parse various date formats
    const date = new Date(dateValue)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0]
    }
  }

  // Handle Excel date serial numbers
  if (typeof dateValue === "number") {
    const date = XLSX.SSF.parse_date_code(dateValue)
    if (date) {
      const year = date.y
      const month = String(date.m).padStart(2, "0")
      const day = String(date.d).padStart(2, "0")
      return `${year}-${month}-${day}`
    }
  }

  return ""
}

function findHeaderInfo(rawData: any[][]): { [key: string]: any } {
  const headerInfo: { [key: string]: any } = {}

  // Look through the first several rows to find header information
  for (let i = 0; i < Math.min(15, rawData.length); i++) {
    const row = rawData[i]
    if (row && row.length >= 2) {
      const label = row[0]?.toString()
      const value = row[1]

      if (label && value !== undefined && value !== null && value !== "") {
        const normalizedLabel = normalizeText(label)
        const mappedField = HEADER_ROW_MAPPING[normalizedLabel as keyof typeof HEADER_ROW_MAPPING]

        if (mappedField) {
          switch (mappedField) {
            case "date":
              headerInfo[mappedField] = formatDate(value)
              break
            case "totalOfServices":
            case "totalOfPassengers":
            case "totalOfOOS":
            case "totalOfPasses":
              headerInfo[mappedField] = Number.parseInt(value?.toString() || "0") || 0
              break
            default:
              headerInfo[mappedField] = value.toString().trim()
          }
        }
      }
    }
  }

  return headerInfo
}

function findDataStartRow(rawData: any[][]): number {
  // Look for a row that contains column headers for service data
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i]
    if (row && row.length > 3) {
      // Check if this row contains service check column headers
      let matchCount = 0
      for (const cell of row) {
        if (cell) {
          const normalizedCell = normalizeText(cell.toString())
          if (COLUMN_MAPPING[normalizedCell as keyof typeof COLUMN_MAPPING]) {
            matchCount++
          }
        }
      }
      // If we find at least 2 matching column headers, this is likely the header row
      if (matchCount >= 2) {
        return i
      }
    }
  }
  return -1
}

export function OutOfSectionExcelUpload({ onDataLoaded, onClose }: OutOfSectionExcelUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<any[] | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setPreview(null)
      setDebugInfo(null)
    }
  }

  const processExcelFile = async () => {
    if (!file) return

    setIsProcessing(true)
    setError(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      console.log("Raw Excel data:", rawData)

      if (rawData.length < 2) {
        throw new Error("Excel file must contain header information and service data")
      }

      // Extract header information from rows
      const headerInfo = findHeaderInfo(rawData)
      console.log("Header info found:", headerInfo)

      // Find where the service data starts
      const dataStartRow = findDataStartRow(rawData)
      console.log("Data start row:", dataStartRow)

      if (dataStartRow === -1) {
        throw new Error(
          "Could not find service data columns. Please ensure your Excel file contains columns like Serv, Hora, GPS, Pasajeros, etc.",
        )
      }

      const columnHeaders = rawData[dataStartRow] as string[]
      const dataRows = rawData.slice(dataStartRow + 1)

      console.log("Column headers:", columnHeaders)
      console.log("Data rows count:", dataRows.length)

      // Map column headers to our field names (case-insensitive)
      const headerMapping: { [key: number]: string } = {}
      columnHeaders.forEach((header, index) => {
        if (header) {
          const normalizedHeader = normalizeText(header.toString())
          const mappedField = COLUMN_MAPPING[normalizedHeader as keyof typeof COLUMN_MAPPING]
          if (mappedField) {
            headerMapping[index] = mappedField
          }
        }
      })

      console.log("Header mapping:", headerMapping)

      // Process each data row
      const processedRows: any[] = []
      for (const row of dataRows) {
        const processedRow: any = {}

        // Process column data
        Object.entries(headerMapping).forEach(([colIndex, fieldName]) => {
          const cellValue = row[Number.parseInt(colIndex)]
          if (cellValue !== undefined && cellValue !== null && cellValue !== "") {
            switch (fieldName) {
              case "exactHourOfSchedule":
                processedRow[fieldName] = formatTime(cellValue)
                break
              case "gpsStatus":
                processedRow[fieldName] = parseGpsVariance(cellValue)
                break
              case "passengersOnBoard":
              case "outOfSectionTickets":
              case "passesUsed":
                processedRow[fieldName] =
                  typeof cellValue === "number" ? cellValue : Number.parseInt(cellValue?.toString() || "0") || 0
                break
              default:
                processedRow[fieldName] = cellValue?.toString().trim() || ""
            }
          }
        })

        // Only add rows that have some service data
        if (processedRow.serviceCode || processedRow.lineRouteBranch) {
          processedRows.push(processedRow)
        }
      }

      console.log("Processed rows:", processedRows.length)

      if (processedRows.length === 0) {
        throw new Error("No valid service data rows found in the Excel file")
      }

      // Create service checks
      const serviceChecks = processedRows.map((row, index) => ({
        id: `excel-${Date.now()}-${index}`,
        serviceCode: row.serviceCode || "",
        lineRouteBranch: row.lineRouteBranch || "",
        exactHourOfSchedule: row.exactHourOfSchedule || "",
        gpsStatus: row.gpsStatus || { minutes: 0, seconds: 0, status: "on-time" },
        passengersOnBoard: row.passengersOnBoard || 0,
        outOfSectionTickets: row.outOfSectionTickets || 0,
        passesUsed: row.passesUsed || 0,
        observations: row.observations || "",
      }))

      // Calculate totals from processed data if not found in header
      const calculatedTotals = {
        totalOfServices: serviceChecks.length,
        totalOfPassengers: serviceChecks.reduce((sum, check) => sum + check.passengersOnBoard, 0),
        totalOfOOS: serviceChecks.reduce((sum, check) => sum + check.outOfSectionTickets, 0),
        totalOfPasses: serviceChecks.reduce((sum, check) => sum + check.passesUsed, 0),
      }

      // Create form header from the extracted header information
      const formHeader = {
        title: "OUT-OF-SECTION TICKETS (PASADOS)",
        inspectorName: "", // Will be filled by user
        date: headerInfo.date || new Date().toISOString().split("T")[0],
        placeOfWork: headerInfo.placeOfWork || "",
        lineOrRouteNumber: headerInfo.lineOrRouteNumber || "",
        direction: headerInfo.direction || "",
        // Use header values if available, otherwise use calculated values
        totalOfServices: headerInfo.totalOfServices || calculatedTotals.totalOfServices,
        totalOfPassengers: headerInfo.totalOfPassengers || calculatedTotals.totalOfPassengers,
        totalOfOOS: headerInfo.totalOfOOS || calculatedTotals.totalOfOOS,
        totalOfPasses: headerInfo.totalOfPasses || calculatedTotals.totalOfPasses,
      }

      const debugData = {
        headerInfo,
        dataStartRow,
        columnHeaders,
        headerMapping,
        processedRowsCount: processedRows.length,
        serviceChecksCount: serviceChecks.length,
        sampleProcessedRow: processedRows[0],
        sampleServiceCheck: serviceChecks[0],
        calculatedTotals,
        formHeader,
      }

      setDebugInfo(debugData)
      setPreview(serviceChecks.slice(0, 5)) // Show first 5 rows as preview

      const formData: ExcelData = {
        formHeader,
        serviceChecks,
      }

      onDataLoaded(formData)
      onClose()
    } catch (error) {
      console.error("Error processing Excel file:", error)
      setError(error instanceof Error ? error.message : "Failed to process Excel file")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Upload Out-of-Section Excel File
              </CardTitle>
              <CardDescription>
                Upload an Excel file with out-of-section ticket data. The file should contain header information and
                service check columns.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="excel-file">Select Excel File</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-gray-500">
              Supported formats: .xlsx, .xls. The file should have headers in the first few rows and service data
              columns.
            </p>
          </div>

          {file && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">{file.name}</span>
                <span className="text-xs text-blue-600">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            </div>
          )}

          {preview && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Preview (first 5 rows):</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 p-1">Service Code</th>
                      <th className="border border-gray-200 p-1">Branch</th>
                      <th className="border border-gray-200 p-1">Hour</th>
                      <th className="border border-gray-200 p-1">GPS</th>
                      <th className="border border-gray-200 p-1">Passengers</th>
                      <th className="border border-gray-200 p-1">OOS</th>
                      <th className="border border-gray-200 p-1">Passes</th>
                      <th className="border border-gray-200 p-1">Observations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <tr key={index}>
                        <td className="border border-gray-200 p-1">{row.serviceCode}</td>
                        <td className="border border-gray-200 p-1">{row.lineRouteBranch}</td>
                        <td className="border border-gray-200 p-1">{row.exactHourOfSchedule}</td>
                        <td className="border border-gray-200 p-1">
                          {row.gpsStatus.minutes}:{String(Math.abs(row.gpsStatus.seconds)).padStart(2, "0")} (
                          {row.gpsStatus.status})
                        </td>
                        <td className="border border-gray-200 p-1">{row.passengersOnBoard}</td>
                        <td className="border border-gray-200 p-1">{row.outOfSectionTickets}</td>
                        <td className="border border-gray-200 p-1">{row.passesUsed}</td>
                        <td className="border border-gray-200 p-1">{row.observations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {debugInfo && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Debug Information:</h4>
              <div className="text-xs bg-gray-50 p-3 rounded-lg space-y-1">
                <p>
                  <strong>Header Info Found:</strong> {Object.keys(debugInfo.headerInfo).join(", ") || "None"}
                </p>
                <p>
                  <strong>Data Start Row:</strong> {debugInfo.dataStartRow}
                </p>
                <p>
                  <strong>Column Mapping:</strong> {Object.keys(debugInfo.headerMapping).length} columns mapped
                </p>
                <p>
                  <strong>Service Checks:</strong> {debugInfo.serviceChecksCount} found
                </p>
                <p>
                  <strong>Totals:</strong> Services: {debugInfo.formHeader.totalOfServices}, Passengers:{" "}
                  {debugInfo.formHeader.totalOfPassengers}, OOS: {debugInfo.formHeader.totalOfOOS}, Passes:{" "}
                  {debugInfo.formHeader.totalOfPasses}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={processExcelFile} disabled={!file || isProcessing} className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              {isProcessing ? "Processing..." : "Import Data"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-2">
            <div>
              <p>
                <strong>Expected Header Rows (first column contains label, second column contains value):</strong>
              </p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Línea/Linea → Route Number</li>
                <li>Lugar → Place of Work</li>
                <li>Sentido → Direction</li>
                <li>Fecha → Date</li>
                <li>Servicios → Total Services</li>
                <li>Pasajeros → Total Passengers</li>
                <li>Pasados → Total Out-of-Section</li>
                <li>Pases → Total Passes</li>
              </ul>
            </div>
            <div>
              <p>
                <strong>Expected Service Data Columns:</strong>
              </p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Serv/Servicio → Service Code</li>
                <li>Bandera por Ramal → Line/Route/Branch</li>
                <li>Hora → Hour of Schedule</li>
                <li>GPS → GPS Variance (±mm:ss format)</li>
                <li>Pasajeros → Passengers on Board</li>
                <li>Pasados → Out-of-Section Tickets</li>
                <li>Pases → Passes Used</li>
                <li>Observación/Observaciones/Obs → Observations</li>
              </ul>
            </div>
            <p>
              <strong>Note:</strong> Column names are matched automatically and are case-insensitive. The system will
              look for header information in the first 15 rows and service data columns after that.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
