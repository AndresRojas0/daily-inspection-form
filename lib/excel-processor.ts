"use server"

import * as XLSX from "xlsx"

// Mapping from Spanish field names to our form fields (case-insensitive)
const HEADER_ROW_MAPPING = {
  apellido: "inspectorName",
  día: "date",
  dia: "date", // Alternative without accent
  lugar: "placeOfWork",
  sentido: "direction",
}

const COLUMN_MAPPING = {
  línea: "lineOrRouteNumber",
  linea: "lineOrRouteNumber", // Alternative without accent
  conductor: "driverName",
  servicio: "serviceCode",
  coche: "fleetCoachNumber",
  hora: "exactHourOfArrival",
  gps: "gpsMinutes",
  pasajeros: "passengersOnBoard",
  pases: "passesUsed",
  parada: "addressOfStop",
  observación: "observations", // With accent (singular)
  observaciones: "observations", // With accent (plural)
  observacion: "observations", // Without accent (singular)
  observaciones: "observations", // Without accent (plural) - duplicate but kept for safety
  notas: "observations", // Alternative word for notes
  comentarios: "observations", // Alternative word for comments
  infracción: "nonCompliance", // Non-compliance with accent
  infraccion: "nonCompliance", // Non-compliance without accent
  incumplimiento: "nonCompliance", // Alternative word
}

interface ExcelRow {
  inspectorName?: string
  date?: string
  placeOfWork?: string
  direction?: string
  lineOrRouteNumber?: string
  driverName?: string
  serviceCode?: string
  fleetCoachNumber?: string
  exactHourOfArrival?: string
  gpsMinutes?: number
  passengersOnBoard?: number
  passesUsed?: number
  addressOfStop?: string
  observations?: string
  nonCompliance?: boolean // Add this field
}

function calculateGpsStatus(minutes: number): "on-time" | "early" | "late" {
  if (minutes < 0) return "late"
  if (minutes >= 2) return "early"
  return "on-time"
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

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, "")
}

function findHeaderInfo(rawData: any[][]): { [key: string]: any } {
  const headerInfo: { [key: string]: any } = {}

  // Look through the first several rows to find header information
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
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
    if (row && row.length > 5) {
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
      // If we find at least 3 matching column headers, this is likely the header row
      if (matchCount >= 3) {
        return i
      }
    }
  }
  return -1
}

export async function processExcelFile(fileBuffer: ArrayBuffer) {
  try {
    // Parse the Excel file
    const workbook = XLSX.read(fileBuffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON with header row
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (rawData.length < 2) {
      return {
        success: false,
        message: "Excel file must contain header information and service data",
      }
    }

    // Extract header information from rows
    const headerInfo = findHeaderInfo(rawData)

    // Find where the service data starts
    const dataStartRow = findDataStartRow(rawData)

    if (dataStartRow === -1) {
      return {
        success: false,
        message:
          "Could not find service data columns. Please ensure your Excel file contains columns like Línea, Conductor, Servicio, etc.",
      }
    }

    const columnHeaders = rawData[dataStartRow] as string[]
    const dataRows = rawData.slice(dataStartRow + 1)

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

    // Process each data row
    const processedRows: ExcelRow[] = []
    for (const row of dataRows) {
      const processedRow: ExcelRow = {}

      // Add header information to each row
      Object.assign(processedRow, headerInfo)

      // Process column data
      Object.entries(headerMapping).forEach(([colIndex, fieldName]) => {
        const cellValue = row[Number.parseInt(colIndex)]
        if (cellValue !== undefined && cellValue !== null && cellValue !== "") {
          switch (fieldName) {
            case "exactHourOfArrival":
              processedRow[fieldName] = formatTime(cellValue)
              break
            case "gpsMinutes":
            case "passengersOnBoard":
            case "passesUsed":
              processedRow[fieldName] =
                typeof cellValue === "number" ? cellValue : Number.parseInt(cellValue?.toString() || "0") || 0
              break
            case "nonCompliance":
              // Handle boolean values from Excel (true/false, 1/0, yes/no, sí/no)
              const boolValue = cellValue?.toString().toLowerCase().trim()
              processedRow[fieldName] =
                boolValue === "true" ||
                boolValue === "1" ||
                boolValue === "yes" ||
                boolValue === "sí" ||
                boolValue === "si"
              break
            default:
              processedRow[fieldName] = cellValue?.toString().trim() || ""
          }
        }
      })

      // Only add rows that have some service data
      if (processedRow.lineOrRouteNumber || processedRow.driverName || processedRow.serviceCode) {
        processedRows.push(processedRow)
      }
    }

    if (processedRows.length === 0) {
      return {
        success: false,
        message: "No valid service data rows found in the Excel file",
      }
    }

    // Create form header from the extracted header information
    const formHeader = {
      title: "DAILY INSPECTION FORM",
      inspectorName: headerInfo.inspectorName || "",
      date: headerInfo.date || new Date().toISOString().split("T")[0],
      placeOfWork: headerInfo.placeOfWork || "",
    }

    // Process service checks
    const serviceChecks = processedRows.map((row, index) => ({
      id: `excel-${Date.now()}-${index}`,
      lineOrRouteNumber: row.lineOrRouteNumber || "",
      driverName: row.driverName || "",
      serviceCode: row.serviceCode || "",
      fleetCoachNumber: row.fleetCoachNumber || "",
      exactHourOfArrival: row.exactHourOfArrival || "",
      gpsStatus: {
        minutes: row.gpsMinutes || 0,
        status: calculateGpsStatus(row.gpsMinutes || 0),
      },
      passengersOnBoard: row.passengersOnBoard || 0,
      passesUsed: row.passesUsed || 0,
      addressOfStop: row.addressOfStop || "",
      observations:
        [row.observations || "", row.direction || ""].filter((text) => text && text.trim() !== "").join(" - ") || "",
      nonCompliance: row.nonCompliance || false, // Add this field
    }))

    return {
      success: true,
      data: {
        formHeader,
        serviceChecks,
      },
      message: `Successfully processed ${serviceChecks.length} service checks from Excel file`,
      debug: {
        headerInfo,
        dataStartRow,
        columnHeaders,
        processedRowsCount: processedRows.length,
        sampleProcessedRow: processedRows[0], // Add sample row for debugging
        sampleServiceCheck: serviceChecks[0], // Add sample service check for debugging
      },
    }
  } catch (error) {
    console.error("Error processing Excel file:", error)
    return {
      success: false,
      message: `Error processing Excel file: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
