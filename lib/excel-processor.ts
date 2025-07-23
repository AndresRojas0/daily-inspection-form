"use server"

import * as XLSX from "xlsx"

interface ProcessedServiceCheck {
  id: string
  lineOrRouteNumber: string
  driverName: string
  serviceCode: string
  fleetCoachNumber: string
  exactHourOfArrival: string
  gpsStatus: {
    minutes: number
    status: "on-time" | "early" | "late"
  }
  passengersOnBoard: number
  passesUsed: number
  addressOfStop: string
  observations: string
  nonCompliance: boolean
}

interface ProcessedFormHeader {
  title: string
  inspectorName: string
  date: string
  placeOfWork: string
}

interface ProcessedExcelData {
  formHeader: ProcessedFormHeader
  serviceChecks: ProcessedServiceCheck[]
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
  nonCompliance?: boolean
}

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
  notas: "observations", // Alternative word for notes
  comentarios: "observations", // Alternative word for comments
  infracción: "nonCompliance", // Non-compliance with accent
  infraccion: "nonCompliance", // Non-compliance without accent
  incumplimiento: "nonCompliance", // Alternative word
}

// Helper function to parse GPS variance from various formats
const parseGpsVariance = (gpsValue: any): number => {
  if (gpsValue === null || gpsValue === undefined || gpsValue === "") {
    console.log(`parseGpsVariance: Input is empty/null, returning 0.`)
    return 0
  }

  // If it's already a number, use it directly
  if (typeof gpsValue === "number") {
    console.log(`parseGpsVariance: Input was already a number, returning ${gpsValue}.`)
    return gpsValue
  }

  let gpsString = gpsValue.toString().trim()
  console.log(`parseGpsVariance: Original input string: "${gpsString}"`)

  // Step 1: Remove outer parentheses if they exist, e.g., "(+02:30)" -> "+02:30"
  const parenMatch = gpsString.match(/^$$(.*)$$$/) // Corrected regex for literal parentheses
  if (parenMatch && parenMatch[1]) {
    gpsString = parenMatch[1]
    console.log(`parseGpsVariance: After removing outer parentheses: "${gpsString}"`)
  }

  // Step 2: Try to parse as hh:mm format (from Excel) and convert to minutes.seconds
  // User wants hh from Excel to be minutes, and mm from Excel to be seconds.
  const timeMatch = gpsString.match(/^([+-]?)(\d+):(\d+)$/)
  if (timeMatch) {
    const sign = timeMatch[1] === "-" ? -1 : 1
    const hours = Number.parseInt(timeMatch[2], 10) || 0 // This is 'hh' from Excel
    const minutes = Number.parseInt(timeMatch[3], 10) || 0 // This is 'mm' from Excel
    const totalMinutes = hours + minutes / 60
    console.log(
      `parseGpsVariance: Parsed as hh:mm. Sign: ${sign}, Hours (as minutes): ${hours}, Minutes (as seconds): ${minutes}, Total: ${sign * totalMinutes}`,
    )
    return sign * totalMinutes
  }

  // Step 3: Try to parse as mm format (e.g., "+5", "-3", "10")
  const minuteMatch = gpsString.match(/^([+-]?)(\d+)$/)
  if (minuteMatch) {
    const sign = minuteMatch[1] === "-" ? -1 : 1
    const minutes = Number.parseInt(minuteMatch[2], 10) || 0
    console.log(`parseGpsVariance: Parsed as mm. Sign: ${sign}, Minutes: ${minutes}, Total: ${sign * minutes}`)
    return sign * minutes
  }

  // Fallback: Try to parse as a regular float (e.g., "2.5", "-1.75")
  const numValue = Number.parseFloat(gpsString)
  if (!isNaN(numValue)) {
    console.log(`parseGpsVariance: Fallback to float parsing, returning ${numValue}.`)
    return numValue
  }

  console.warn(`parseGpsVariance: Could not parse "${gpsValue}", returning 0.`)
  return 0
}

// Helper function to determine GPS status
const calculateGpsStatus = (minutes: number): "on-time" | "early" | "late" => {
  if (minutes < 0) return "late"
  if (minutes >= 2) return "early"
  return "on-time"
}

// Helper function to detect non-compliance from observations
const detectNonComplianceFromObservations = (observations: string): boolean => {
  if (!observations) return false

  const observationsLower = observations.toLowerCase()
  return observationsLower.includes("informe")
}

// Helper function to format time from various formats
const formatTime = (timeValue: any): string => {
  if (!timeValue) return ""

  // Handle different time formats
  if (typeof timeValue === "string") {
    // If it's already in HH:MM:SS or HH:MM format
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

// Helper function to format date from various formats
const formatDate = (dateValue: any): string => {
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

// Helper function to normalize text
const normalizeText = (text: string): string => {
  return text.toLowerCase().trim().replace(/\s+/g, "")
}

// Helper function to find header information from rows
const findHeaderInfo = (rawData: any[][]): { [key: string]: any } => {
  const headerInfo: { [key: string]: any } = {}
  console.log("findHeaderInfo: Starting search for header information.")

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
          console.log(`findHeaderInfo: Found potential header "${label}" -> "${mappedField}" with value "${value}"`)
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
  console.log("findHeaderInfo: Extracted header info:", headerInfo)
  return headerInfo
}

// Helper function to find where the service data starts
const findDataStartRow = (rawData: any[][]): number => {
  console.log("findDataStartRow: Starting search for data start row.")
  // Look for a row that contains column headers for service data
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i]
    if (row && row.length > 5) {
      // Check if this row contains service check column headers
      let matchCount = 0
      const matchedHeaders = []
      for (const cell of row) {
        if (cell) {
          const normalizedCell = normalizeText(cell.toString())
          if (COLUMN_MAPPING[normalizedCell as keyof typeof COLUMN_MAPPING]) {
            matchCount++
            matchedHeaders.push(cell.toString())
          }
        }
      }
      // If we find at least 3 matching column headers, this is likely the header row
      if (matchCount >= 3) {
        console.log(`findDataStartRow: Found data header row at index ${i} with matches:`, matchedHeaders)
        return i
      }
    }
  }
  console.log("findDataStartRow: No data header row found.")
  return -1
}

export async function processExcelFile(fileBuffer: ArrayBuffer) {
  console.log("processExcelFile: Starting Excel file processing.")
  try {
    // Parse the Excel file
    const workbook = XLSX.read(fileBuffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON with header row
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
    console.log("processExcelFile: Raw data from Excel:", rawData.slice(0, 15)) // Log first 15 rows for brevity

    if (rawData.length < 2) {
      console.error("processExcelFile: Excel file too short.")
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
      console.error("processExcelFile: Could not find service data start row.")
      return {
        success: false,
        message:
          "Could not find service data columns. Please ensure your Excel file contains columns like Línea, Conductor, Servicio, etc.",
      }
    }

    const columnHeaders = rawData[dataStartRow] as string[]
    const dataRows = rawData.slice(dataStartRow + 1)
    console.log("processExcelFile: Column headers identified:", columnHeaders)
    console.log(
      "processExcelFile: Data rows starting from index:",
      dataStartRow + 1,
      "Total data rows:",
      dataRows.length,
    )

    // Map column headers to our field names (case-insensitive)
    const headerMapping: { [key: number]: string } = {}
    columnHeaders.forEach((header, index) => {
      if (header) {
        const normalizedHeader = normalizeText(header.toString())
        const mappedField = COLUMN_MAPPING[normalizedHeader as keyof typeof COLUMN_MAPPING]
        if (mappedField) {
          headerMapping[index] = mappedField
          console.log(`processExcelFile: Mapped column "${header}" (index ${index}) to field "${mappedField}"`)
        }
      }
    })
    console.log("processExcelFile: Final header mapping:", headerMapping)

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
              // Use the new GPS parsing function
              processedRow[fieldName] = parseGpsVariance(cellValue)
              break
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
      } else {
        console.log("processExcelFile: Skipping row due to missing key service data:", row)
      }
    }

    if (processedRows.length === 0) {
      console.error("processExcelFile: No valid service data rows found after processing.")
      return {
        success: false,
        message: "No valid service data rows found in the Excel file",
      }
    }
    console.log("processExcelFile: Successfully processed rows count:", processedRows.length)
    console.log("processExcelFile: Sample processed row:", processedRows[0])

    // Create form header from the extracted header information
    const formHeader = {
      title: "DAILY INSPECTION FORM",
      inspectorName: headerInfo.inspectorName || "",
      date: headerInfo.date || new Date().toISOString().split("T")[0],
      placeOfWork: headerInfo.placeOfWork || "",
    }
    console.log("processExcelFile: Final form header:", formHeader)

    // Process service checks
    const serviceChecks = processedRows.map((row, index) => {
      const observations =
        [row.observations || "", row.direction || ""].filter((text) => text && text.trim() !== "").join(" - ") || ""

      // Auto-detect non-compliance from observations
      const autoDetectedNonCompliance = detectNonComplianceFromObservations(observations)
      const explicitNonCompliance = row.nonCompliance || false

      return {
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
        observations: observations,
        nonCompliance: autoDetectedNonCompliance || explicitNonCompliance, // Auto-detect or explicit
      }
    })
    console.log("processExcelFile: Final service checks count:", serviceChecks.length)
    console.log("processExcelFile: Sample final service check:", serviceChecks[0])

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
        sampleProcessedRow: processedRows[0],
        sampleServiceCheck: serviceChecks[0],
        autoDetectedNonCompliance: serviceChecks.filter((check) =>
          detectNonComplianceFromObservations(check.observations),
        ).length,
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
