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

export function OutOfSectionExcelUpload({ onDataLoaded, onClose }: OutOfSectionExcelUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<any[] | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setPreview(null)
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
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      console.log("Raw Excel data:", jsonData)

      // Find header row (look for "Service Code" or similar)
      let headerRowIndex = -1
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i] as any[]
        if (row && row.some((cell) => String(cell).toLowerCase().includes("service"))) {
          headerRowIndex = i
          break
        }
      }

      if (headerRowIndex === -1) {
        throw new Error("Could not find header row. Please ensure your Excel file has proper headers.")
      }

      const headers = jsonData[headerRowIndex] as string[]
      const dataRows = jsonData.slice(headerRowIndex + 1) as any[][]

      console.log("Headers found:", headers)
      console.log("Data rows:", dataRows.length)

      // Map headers to expected field names (case-insensitive)
      const headerMap: { [key: string]: string } = {}
      headers.forEach((header, index) => {
        const normalizedHeader = String(header).toLowerCase().trim()
        if (normalizedHeader.includes("service") && normalizedHeader.includes("code")) {
          headerMap["serviceCode"] = String(index)
        } else if (
          normalizedHeader.includes("line") ||
          normalizedHeader.includes("route") ||
          normalizedHeader.includes("branch")
        ) {
          headerMap["lineRouteBranch"] = String(index)
        } else if (normalizedHeader.includes("hour") || normalizedHeader.includes("schedule")) {
          headerMap["exactHourOfSchedule"] = String(index)
        } else if (normalizedHeader.includes("gps") && normalizedHeader.includes("minute")) {
          headerMap["gpsMinutes"] = String(index)
        } else if (normalizedHeader.includes("gps") && normalizedHeader.includes("second")) {
          headerMap["gpsSeconds"] = String(index)
        } else if (normalizedHeader.includes("gps") && normalizedHeader.includes("status")) {
          headerMap["gpsStatus"] = String(index)
        } else if (normalizedHeader.includes("passenger")) {
          headerMap["passengersOnBoard"] = String(index)
        } else if (normalizedHeader.includes("out") && normalizedHeader.includes("section")) {
          headerMap["outOfSectionTickets"] = String(index)
        } else if (normalizedHeader.includes("pass")) {
          headerMap["passesUsed"] = String(index)
        } else if (normalizedHeader.includes("observation")) {
          headerMap["observations"] = String(index)
        }
      })

      console.log("Header mapping:", headerMap)

      // Process data rows
      const serviceChecks = dataRows
        .filter((row) => row && row.length > 0 && row[Number.parseInt(headerMap["serviceCode"] || "0")])
        .map((row, index) => ({
          id: `imported-${index}`,
          serviceCode: String(row[Number.parseInt(headerMap["serviceCode"] || "0")] || ""),
          lineRouteBranch: String(row[Number.parseInt(headerMap["lineRouteBranch"] || "1")] || ""),
          exactHourOfSchedule: String(row[Number.parseInt(headerMap["exactHourOfSchedule"] || "2")] || ""),
          gpsStatus: {
            minutes: Number.parseInt(String(row[Number.parseInt(headerMap["gpsMinutes"] || "3")] || "0")) || 0,
            seconds: Number.parseInt(String(row[Number.parseInt(headerMap["gpsSeconds"] || "4")] || "0")) || 0,
            status: String(row[Number.parseInt(headerMap["gpsStatus"] || "5")] || "on-time"),
          },
          passengersOnBoard:
            Number.parseInt(String(row[Number.parseInt(headerMap["passengersOnBoard"] || "6")] || "0")) || 0,
          outOfSectionTickets:
            Number.parseInt(String(row[Number.parseInt(headerMap["outOfSectionTickets"] || "7")] || "0")) || 0,
          passesUsed: Number.parseInt(String(row[Number.parseInt(headerMap["passesUsed"] || "8")] || "0")) || 0,
          observations: String(row[Number.parseInt(headerMap["observations"] || "9")] || ""),
        }))

      console.log("Processed service checks:", serviceChecks.length)

      // Calculate totals
      const totalServices = serviceChecks.length
      const totalPassengers = serviceChecks.reduce((sum, check) => sum + check.passengersOnBoard, 0)
      const totalOOS = serviceChecks.reduce((sum, check) => sum + check.outOfSectionTickets, 0)
      const totalPasses = serviceChecks.reduce((sum, check) => sum + check.passesUsed, 0)

      // Create form data
      const formData: ExcelData = {
        formHeader: {
          title: "OUT-OF-SECTION TICKETS (PASADOS)",
          inspectorName: "", // Will be filled by user
          date: new Date().toLocaleDateString("en-CA"),
          placeOfWork: "", // Will be filled by user
          lineOrRouteNumber: "", // Will be filled by user
          direction: "", // Will be filled by user
          totalOfServices: totalServices,
          totalOfPassengers: totalPassengers,
          totalOfOOS: totalOOS,
          totalOfPasses: totalPasses,
        },
        serviceChecks: serviceChecks,
      }

      setPreview(serviceChecks.slice(0, 5)) // Show first 5 rows as preview
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
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                Upload Excel File
              </CardTitle>
              <CardDescription>
                Upload an Excel file with out-of-section ticket data. The file should contain columns for service codes,
                passengers, tickets, etc.
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
              Supported formats: .xlsx, .xls. The file should have headers in the first few rows.
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
                      <th className="border border-gray-200 p-1">Passengers</th>
                      <th className="border border-gray-200 p-1">OOS Tickets</th>
                      <th className="border border-gray-200 p-1">Passes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <tr key={index}>
                        <td className="border border-gray-200 p-1">{row.serviceCode}</td>
                        <td className="border border-gray-200 p-1">{row.passengersOnBoard}</td>
                        <td className="border border-gray-200 p-1">{row.outOfSectionTickets}</td>
                        <td className="border border-gray-200 p-1">{row.passesUsed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

          <div className="text-xs text-gray-500 space-y-1">
            <p>
              <strong>Expected columns:</strong> Service Code, Line/Route/Branch, Hour of Schedule, GPS Minutes, GPS
              Seconds, GPS Status, Passengers on Board, Out of Section Tickets, Passes Used, Observations
            </p>
            <p>
              <strong>Note:</strong> Column names are matched automatically and are case-insensitive. Make sure your
              Excel file has clear column headers.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
