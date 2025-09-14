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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Users, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react"

interface ServiceCheck {
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
}

interface OutOfSectionForm {
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
  serviceChecks: ServiceCheck[]
}

export default function OutOfSectionApp() {
  const [form, setForm] = useState<OutOfSectionForm>({
    formHeader: {
      title: "OUT-OF-SECTION TICKETS (PASADOS)",
      inspectorName: "",
      date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
      placeOfWork: "",
      lineOrRouteNumber: "",
      direction: "",
      totalOfServices: 0,
      totalOfPassengers: 0,
      totalOfOOS: 0,
      totalOfPasses: 0,
    },
    serviceChecks: [],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showExcelUpload, setShowExcelUpload] = useState(false)

  // Calculate totals automatically
  const calculateTotals = (serviceChecks: ServiceCheck[]) => {
    const totalOfServices = serviceChecks.length
    const totalOfPassengers = serviceChecks.reduce((sum, check) => sum + check.passengersOnBoard, 0)
    const totalOfOOS = serviceChecks.reduce((sum, check) => sum + check.outOfSectionTickets, 0)
    const totalOfPasses = serviceChecks.reduce((sum, check) => sum + check.passesUsed, 0)

    return {
      totalOfServices,
      totalOfPassengers,
      totalOfOOS,
      totalOfPasses,
    }
  }

  const addOutOfSectionForm = () => {
    // Create 50 empty service checks
    const newServiceChecks: ServiceCheck[] = Array.from({ length: 50 }, (_, index) => ({
      id: `${Date.now()}-${index}`,
      serviceCode: "",
      lineRouteBranch: "",
      exactHourOfSchedule: "",
      gpsStatus: {
        minutes: 0,
        seconds: 0,
        status: "on-time",
      },
      passengersOnBoard: 0,
      outOfSectionTickets: 0,
      passesUsed: 0,
      observations: "",
    }))

    setForm((prev) => ({
      ...prev,
      serviceChecks: newServiceChecks,
    }))
  }

  const updateServiceCheck = (id: string, field: string, value: any) => {
    setForm((prev) => {
      const updatedServiceChecks = prev.serviceChecks.map((check) =>
        check.id === id ? { ...check, [field]: value } : check,
      )

      const totals = calculateTotals(updatedServiceChecks)

      return {
        ...prev,
        serviceChecks: updatedServiceChecks,
        formHeader: {
          ...prev.formHeader,
          ...totals,
        },
      }
    })
  }

  const updateGpsStatus = (id: string, minutes: number, seconds: number) => {
    let status = "on-time"
    const totalSeconds = minutes * 60 + seconds
    if (totalSeconds < 0) status = "late"
    else if (totalSeconds >= 120)
      status = "early" // 2 minutes
    else status = "on-time"

    setForm((prev) => {
      const updatedServiceChecks = prev.serviceChecks.map((check) =>
        check.id === id ? { ...check, gpsStatus: { minutes, seconds, status } } : check,
      )

      const totals = calculateTotals(updatedServiceChecks)

      return {
        ...prev,
        serviceChecks: updatedServiceChecks,
        formHeader: {
          ...prev.formHeader,
          ...totals,
        },
      }
    })
  }

  const updateFormHeader = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      formHeader: { ...prev.formHeader, [field]: value },
    }))
  }

  const handleSubmit = async () => {
    console.log("Out-of-section form submission:", form)
    setIsSubmitting(true)
    setSubmitResult(null)

    try {
      // TODO: Implement server action for out-of-section forms
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate API call

      setSubmitResult({
        success: true,
        message: "Out-of-section form saved successfully",
      })

      // Reset form after successful submission
      setForm({
        formHeader: {
          title: "OUT-OF-SECTION TICKETS (PASADOS)",
          inspectorName: "",
          date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
          placeOfWork: "",
          lineOrRouteNumber: "",
          direction: "",
          totalOfServices: 0,
          totalOfPassengers: 0,
          totalOfOOS: 0,
          totalOfPasses: 0,
        },
        serviceChecks: [],
      })
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

  // Helper function to format GPS variance as mm:ss
  const formatGpsVariance = (minutes: number, seconds: number): string => {
    const totalSeconds = minutes * 60 + seconds
    const absSeconds = Math.abs(totalSeconds)
    const mins = Math.floor(absSeconds / 60)
    const secs = absSeconds % 60
    const sign = totalSeconds < 0 ? "-" : "+"
    return `${sign}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Helper function to parse GPS variance from mm:ss format
  const parseGpsVariance = (value: string): { minutes: number; seconds: number } => {
    if (!value) return { minutes: 0, seconds: 0 }

    const match = value.match(/^([+-]?)(\d+):(\d+)$/)
    if (match) {
      const sign = match[1] === "-" ? -1 : 1
      const minutes = Number.parseInt(match[2]) || 0
      const seconds = Number.parseInt(match[3]) || 0
      const totalSeconds = sign * (minutes * 60 + seconds)
      return {
        minutes: Math.floor(totalSeconds / 60),
        seconds: totalSeconds % 60,
      }
    }

    return { minutes: 0, seconds: 0 }
  }

  const calculatePercentage = (value: number, total: number): string => {
    if (total === 0) return "0.0%"
    return `${((value / total) * 100).toFixed(1)}%`
  }

  const isFormValid =
    form.formHeader.inspectorName &&
    form.formHeader.placeOfWork &&
    form.formHeader.lineOrRouteNumber &&
    form.formHeader.direction &&
    form.serviceChecks.length > 0

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
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
            <CardDescription>Complete your out-of-section tickets inspection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Out-of-Section Forms */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Out-of-Section Tickets</CardTitle>
                <CardDescription>Record details for out-of-section ticket inspections</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{form.serviceChecks.length} rows</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button onClick={addOutOfSectionForm} className="flex-1 bg-transparent" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Out-Of-Section Form
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

            {form.serviceChecks.length > 0 && (
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Route Number *</Label>
                      <Input
                        placeholder="e.g., Route 101"
                        value={form.formHeader.lineOrRouteNumber}
                        onChange={(e) => updateFormHeader("lineOrRouteNumber", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Direction *</Label>
                      <Select
                        value={form.formHeader.direction}
                        onValueChange={(value) => updateFormHeader("direction", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="north-south">North-South</SelectItem>
                          <SelectItem value="south-north">South-North</SelectItem>
                          <SelectItem value="east-west">East-West</SelectItem>
                          <SelectItem value="west-east">West-East</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Summary Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Total Services</p>
                      <p className="text-xl font-bold text-blue-900">{form.formHeader.totalOfServices}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600">Total Passengers</p>
                      <p className="text-xl font-bold text-green-900">{form.formHeader.totalOfPassengers}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600">Total OOS</p>
                      <p className="text-xl font-bold text-red-900">{form.formHeader.totalOfOOS}</p>
                      <p className="text-xs text-red-600">
                        {calculatePercentage(form.formHeader.totalOfOOS, form.formHeader.totalOfPassengers)}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600">Total Passes</p>
                      <p className="text-xl font-bold text-purple-900">{form.formHeader.totalOfPasses}</p>
                      <p className="text-xs text-purple-600">
                        {calculatePercentage(form.formHeader.totalOfPasses, form.formHeader.totalOfPassengers)}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg col-span-2">
                      <p className="text-sm text-orange-600">OOS + Passes</p>
                      <p className="text-xl font-bold text-orange-900">
                        {form.formHeader.totalOfOOS + form.formHeader.totalOfPasses}
                      </p>
                      <p className="text-xs text-orange-600">
                        {calculatePercentage(
                          form.formHeader.totalOfOOS + form.formHeader.totalOfPasses,
                          form.formHeader.totalOfPassengers,
                        )}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Service Checks Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 p-2 text-left text-sm font-medium">#</th>
                          <th className="border border-gray-300 p-2 text-left text-sm font-medium">Serv</th>
                          <th className="border border-gray-300 p-2 text-left text-sm font-medium">B</th>
                          <th className="border border-gray-300 p-2 text-left text-sm font-medium">Hour</th>
                          <th className="border border-gray-300 p-2 text-left text-sm font-medium">GPS</th>
                          <th className="border border-gray-300 p-2 text-left text-sm font-medium">P</th>
                          <th className="border border-gray-300 p-2 text-left text-sm font-medium">OOS</th>
                          <th className="border border-gray-300 p-2 text-left text-sm font-medium">Passes</th>
                          <th className="border border-gray-300 p-2 text-left text-sm font-medium">Obs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.serviceChecks.map((check, index) => (
                          <tr key={check.id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 p-1 text-center text-sm">{index + 1}</td>
                            <td className="border border-gray-300 p-1">
                              <Input
                                className="h-8 text-sm"
                                placeholder="SVC"
                                value={check.serviceCode}
                                onChange={(e) => updateServiceCheck(check.id, "serviceCode", e.target.value)}
                              />
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Input
                                className="h-8 text-sm"
                                placeholder="Branch"
                                value={check.lineRouteBranch}
                                onChange={(e) => updateServiceCheck(check.id, "lineRouteBranch", e.target.value)}
                              />
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Input
                                className="h-8 text-sm"
                                type="time"
                                step="1"
                                value={check.exactHourOfSchedule}
                                onChange={(e) => updateServiceCheck(check.id, "exactHourOfSchedule", e.target.value)}
                              />
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Input
                                className="h-8 text-sm"
                                placeholder="+00:00"
                                value={formatGpsVariance(check.gpsStatus.minutes, check.gpsStatus.seconds)}
                                onChange={(e) => {
                                  const { minutes, seconds } = parseGpsVariance(e.target.value)
                                  updateGpsStatus(check.id, minutes, seconds)
                                }}
                              />
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Input
                                className="h-8 text-sm"
                                type="number"
                                min="0"
                                placeholder="0"
                                value={check.passengersOnBoard || ""}
                                onChange={(e) =>
                                  updateServiceCheck(
                                    check.id,
                                    "passengersOnBoard",
                                    Number.parseInt(e.target.value) || 0,
                                  )
                                }
                              />
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Input
                                className="h-8 text-sm"
                                type="number"
                                min="0"
                                placeholder="0"
                                value={check.outOfSectionTickets || ""}
                                onChange={(e) =>
                                  updateServiceCheck(
                                    check.id,
                                    "outOfSectionTickets",
                                    Number.parseInt(e.target.value) || 0,
                                  )
                                }
                              />
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Input
                                className="h-8 text-sm"
                                type="number"
                                min="0"
                                placeholder="0"
                                value={check.passesUsed || ""}
                                onChange={(e) =>
                                  updateServiceCheck(check.id, "passesUsed", Number.parseInt(e.target.value) || 0)
                                }
                              />
                            </td>
                            <td className="border border-gray-300 p-1">
                              <Textarea
                                className="h-8 text-sm resize-none"
                                placeholder="Notes..."
                                value={check.observations}
                                onChange={(e) => updateServiceCheck(check.id, "observations", e.target.value)}
                                rows={1}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {form.serviceChecks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No out-of-section form added yet.</p>
                <p className="text-sm">Click "Add Out-Of-Section Form" to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <Button onClick={handleSubmit} className="w-full" size="lg" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? "Saving..." : "Submit Out-of-Section Form"}
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Complete all required fields (*) and add the out-of-section form
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">
              Form valid: {isFormValid ? "✓" : "✗"} | Service rows: {form.serviceChecks.length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
