"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Trash2, Clock, MapPin, Users, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react"
import { saveDailyInspectionForm } from "@/lib/actions"
import { ExcelUpload } from "@/components/excel-upload"
import Link from "next/link"

interface ServiceCheck {
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

interface DailyInspectionForm {
  formHeader: {
    title: string
    inspectorName: string
    date: string
    placeOfWork: string
  }
  serviceChecks: ServiceCheck[]
}

export default function DailyInspectionApp() {
  const [form, setForm] = useState<DailyInspectionForm>({
    formHeader: {
      title: "DAILY INSPECTION FORM",
      inspectorName: "",
      date: new Date().toISOString().split("T")[0],
      placeOfWork: "",
    },
    serviceChecks: [],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showExcelUpload, setShowExcelUpload] = useState(false)

  const addServiceCheck = () => {
    const newCheck: ServiceCheck = {
      id: Date.now().toString(),
      lineOrRouteNumber: "",
      driverName: "",
      serviceCode: "",
      fleetCoachNumber: "",
      exactHourOfArrival: "",
      gpsStatus: {
        minutes: 0,
        status: "on-time",
      },
      passengersOnBoard: 0,
      passesUsed: 0,
      addressOfStop: "",
      observations: "",
      nonCompliance: false,
    }

    setForm((prev) => ({
      ...prev,
      serviceChecks: [...prev.serviceChecks, newCheck],
    }))
  }

  const removeServiceCheck = (id: string) => {
    setForm((prev) => ({
      ...prev,
      serviceChecks: prev.serviceChecks.filter((check) => check.id !== id),
    }))
  }

  const updateServiceCheck = (id: string, field: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      serviceChecks: prev.serviceChecks.map((check) => (check.id === id ? { ...check, [field]: value } : check)),
    }))
  }

  const updateGpsStatus = (id: string, minutes: number) => {
    let status: "on-time" | "early" | "late" = "on-time"
    if (minutes < 0) status = "late"
    else if (minutes >= 2) status = "early"
    else status = "on-time"

    setForm((prev) => ({
      ...prev,
      serviceChecks: prev.serviceChecks.map((check) =>
        check.id === id ? { ...check, gpsStatus: { minutes, status } } : check,
      ),
    }))
  }

  const updateFormHeader = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      formHeader: { ...prev.formHeader, [field]: value },
    }))
  }

  const handleExcelDataLoaded = (data: any) => {
    setForm({
      formHeader: data.formHeader,
      serviceChecks: data.serviceChecks,
    })
    setSubmitResult({
      success: true,
      message: `Successfully loaded ${data.serviceChecks.length} service checks from Excel file`,
    })
  }

  const handleSubmit = async () => {
    console.log("Form submission started", form)

    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      console.log("Calling saveDailyInspectionForm...")
      const result = await saveDailyInspectionForm(form)
      console.log("Save result:", result)

      setSubmitResult(result)

      if (result.success) {
        console.log("Form saved successfully, resetting form")
        // Reset form after successful submission
        setForm({
          formHeader: {
            title: "DAILY INSPECTION FORM",
            inspectorName: "",
            date: new Date().toISOString().split("T")[0],
            placeOfWork: "",
          },
          serviceChecks: [],
        })
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      setSubmitResult({
        success: false,
        message: "An unexpected error occurred while saving the form",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-time":
        return "bg-green-100 text-green-800"
      case "early":
        return "bg-red-100 text-red-800"
      case "late":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Helper function to format GPS variance as mm:ss
  const formatGpsVariance = (minutes: number): string => {
    const absMinutes = Math.abs(minutes)
    const wholeMinutes = Math.floor(absMinutes)
    const seconds = Math.round((absMinutes - wholeMinutes) * 60)
    const sign = minutes < 0 ? "-" : "+"
    return `${sign}${wholeMinutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  // Helper function to parse GPS variance from mm:ss format
  const parseGpsVariance = (value: string): number => {
    if (!value) return 0

    const match = value.match(/^([+-]?)(\d+):(\d+)$/)
    if (match) {
      const sign = match[1] === "-" ? -1 : 1
      const minutes = Number.parseInt(match[2]) || 0
      const seconds = Number.parseInt(match[3]) || 0
      return sign * (minutes + seconds / 60)
    }

    // Fallback to number parsing
    return Number.parseFloat(value) || 0
  }

  const isFormValid =
    form.formHeader.inspectorName &&
    form.formHeader.placeOfWork &&
    form.serviceChecks.length > 0 &&
    form.serviceChecks.every(
      (check) =>
        check.lineOrRouteNumber &&
        check.driverName &&
        check.serviceCode &&
        check.fleetCoachNumber &&
        check.exactHourOfArrival &&
        check.addressOfStop,
    )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Debug Links */}
        <div className="flex gap-2 mb-4">
          <Link href="/debug">
            <Button variant="outline" size="sm">
              Debug Database
            </Button>
          </Link>
          <Link href="/test-form">
            <Button variant="outline" size="sm">
              Test Form
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Submit Result Alert */}
        {submitResult && (
          <Alert className={submitResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {submitResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={submitResult.success ? "text-green-800" : "text-red-800"}>
              {submitResult.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-blue-900">{form.formHeader.title}</CardTitle>
            <CardDescription>Complete your daily service inspection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inspector">Inspector Name *</Label>
              <Input
                id="inspector"
                placeholder="Enter inspector name"
                value={form.formHeader.inspectorName}
                onChange={(e) => updateFormHeader("inspectorName", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={form.formHeader.date}
                onChange={(e) => updateFormHeader("date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="place">Place of Work *</Label>
              <Input
                id="place"
                placeholder="City or address"
                value={form.formHeader.placeOfWork}
                onChange={(e) => updateFormHeader("placeOfWork", e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Service Checks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Service Inspections</CardTitle>
                <CardDescription>Record details for each service check</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{form.serviceChecks.length} checks</Badge>
                {form.serviceChecks.filter((check) => check.nonCompliance).length > 0 && (
                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                    {form.serviceChecks.filter((check) => check.nonCompliance).length} non-compliance
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button onClick={addServiceCheck} className="flex-1 bg-transparent" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Service Check
              </Button>
              <Button
                onClick={() => setShowExcelUpload(true)}
                variant="outline"
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Upload Excel
              </Button>
            </div>

            <div className="space-y-4">
              {form.serviceChecks.map((check, index) => (
                <Card
                  key={check.id}
                  className={`border-l-4 ${check.nonCompliance ? "border-l-red-500 bg-red-50" : "border-l-blue-500"}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Service Check #{index + 1}</CardTitle>
                      <div className="flex items-center gap-2">
                        {check.nonCompliance && (
                          <Badge variant="destructive" className="bg-red-100 text-red-800">
                            Non-Compliance
                          </Badge>
                        )}
                        <Button
                          onClick={() => removeServiceCheck(check.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Route and Service Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Route Number *</Label>
                        <Input
                          placeholder="e.g., Route 101"
                          value={check.lineOrRouteNumber}
                          onChange={(e) => updateServiceCheck(check.id, "lineOrRouteNumber", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Service Code *</Label>
                        <Input
                          placeholder="e.g., SVC001"
                          value={check.serviceCode}
                          onChange={(e) => updateServiceCheck(check.id, "serviceCode", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Driver Name *</Label>
                        <Input
                          placeholder="Enter driver name"
                          value={check.driverName}
                          onChange={(e) => updateServiceCheck(check.id, "driverName", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fleet Coach Number *</Label>
                        <Input
                          placeholder="e.g., FC-123"
                          value={check.fleetCoachNumber}
                          onChange={(e) => updateServiceCheck(check.id, "fleetCoachNumber", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Timing and GPS */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Clock className="w-4 h-4" />
                        Timing Information
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Arrival Time *</Label>
                          <Input
                            type="time"
                            step="1"
                            value={check.exactHourOfArrival}
                            onChange={(e) => updateServiceCheck(check.id, "exactHourOfArrival", e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>GPS Variance (mm:ss)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="+00:00"
                              value={formatGpsVariance(check.gpsStatus.minutes)}
                              onChange={(e) => {
                                const minutes = parseGpsVariance(e.target.value)
                                updateGpsStatus(check.id, minutes)
                              }}
                              className="flex-1"
                            />
                            <Badge className={getStatusColor(check.gpsStatus.status)}>{check.gpsStatus.status}</Badge>
                          </div>
                          <p className="text-xs text-gray-500">Format: +mm:ss (early) or -mm:ss (late)</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Passenger Info */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Users className="w-4 h-4" />
                        Passenger Information
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Passengers on Board</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={check.passengersOnBoard}
                            onChange={(e) =>
                              updateServiceCheck(check.id, "passengersOnBoard", Number.parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Passes Used</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={check.passesUsed}
                            onChange={(e) =>
                              updateServiceCheck(check.id, "passesUsed", Number.parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Location and Notes */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <MapPin className="w-4 h-4" />
                        Location & Notes
                      </div>

                      <div className="space-y-2">
                        <Label>Address of Stop *</Label>
                        <Input
                          placeholder="Enter stop address"
                          value={check.addressOfStop}
                          onChange={(e) => updateServiceCheck(check.id, "addressOfStop", e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Observations</Label>
                        <Textarea
                          placeholder="Any additional observations or notes..."
                          value={check.observations}
                          onChange={(e) => updateServiceCheck(check.id, "observations", e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* Non-Compliance Checkbox */}
                      <div className="flex items-center space-x-2 p-3 border rounded-lg bg-gray-50">
                        <input
                          type="checkbox"
                          id={`non-compliance-${check.id}`}
                          checked={check.nonCompliance}
                          onChange={(e) => updateServiceCheck(check.id, "nonCompliance", e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                        />
                        <Label
                          htmlFor={`non-compliance-${check.id}`}
                          className="text-sm font-medium text-red-700 cursor-pointer"
                        >
                          Informe de Infracción (Non-Compliance Report)
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {form.serviceChecks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No service checks added yet.</p>
                <p className="text-sm">Click "Add Service Check" to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <Button onClick={handleSubmit} className="w-full" size="lg" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? "Saving..." : "Submit Daily Inspection Form"}
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Complete all required fields (*) and add at least one service check
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">
              Form valid: {isFormValid ? "✓" : "✗"} | Service checks: {form.serviceChecks.length}
            </p>
          </CardContent>
        </Card>

        {/* Excel Upload Modal */}
        {showExcelUpload && (
          <ExcelUpload onDataLoaded={handleExcelDataLoaded} onClose={() => setShowExcelUpload(false)} />
        )}
      </div>
    </div>
  )
}
