"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from "lucide-react"
import { processExcelFile } from "@/lib/excel-processor"

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
        const base64String = e.target?.result?.toString().split(",")[1] // Get the Base64 part of the Data URL

        if (!base64String) {
          setResult({ success: false, message: "Failed to read file as Base64." })
          setIsProcessing(false)
          return
        }

        const result = await processExcelFile(base64String) // Pass Base64 string to Server Action

        console.log("Excel processing result:", result) // Add this debug log
        console.log(
          "Service checks with observations:",
          result.data?.serviceChecks?.map((check) => ({
            id: check.id,
            observations: check.observations,
            hasObservations: !!check.observations && check.observations.trim() !== "",
          })),
        ) // Add this debug log

        setResult(result)

        if (result.success && result.data) {
          // Wait a moment to show success message, then load data
          setTimeout(() => {
            onDataLoaded(result.data)
            onClose()
          }, 1500)
        }
      } catch (error) {
        setResult({
          success: false,
          message: "Failed to process the Excel file. Please check the file format.",
        })
        console.log("Error with Excel", error)
      } finally {
        setIsProcessing(false)
      }
    }
    reader.readAsDataURL(file) // Read the file as a Data URL
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
