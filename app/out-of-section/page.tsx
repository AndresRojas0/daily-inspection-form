"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Plus, Users, CheckCircle, AlertCircle, FileSpreadsheet, Trash2, Edit, Save, X } from "lucide-react"
import { OutOfSectionExcelUpload } from "@/components/out-of-section-excel-upload"
import {
  saveOutOfSectionForm,
  updateOutOfSectionForm,
  deleteOutOfSectionForm,
  getOutOfSectionForms,
} from "@/lib/out-of-section-actions"

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
  id?: number // For saved forms
  tempId: string // For unsaved forms
  isEditing?: boolean
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

const LOCAL_STORAGE_KEY = "out-of-section-forms-draft"

export default function OutOfSectionApp() {
  const [forms, setForms] = useState<OutOfSectionForm[]>([])
  const [savedForms, setSavedForms] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showExcelUpload, setShowExcelUpload] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load saved forms on component mount
  useEffect(() => {
    loadSavedForms()
    loadFromLocalStorage()
  }, [])

  // Save to local storage whenever forms change
  useEffect(() => {
    saveToLocalStorage()
  }, [forms])

  const loadSavedForms = async () => {
    const result = await getOutOfSectionForms(20)
    if (result.success) {
      setSavedForms(result.data)
    }
  }

  const saveToLocalStorage = () => {
    if (forms.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(forms))
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY)
    }
  }

  const loadFromLocalStorage = () => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      try {
        const parsedForms = JSON.parse(saved)
        setForms(parsedForms)
      } catch (error) {
        console.error("Error loading from localStorage:", error)
      }
    }
  }

  const clearLocalStorage = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  }

  // Calculate totals automatically
  const calculateTotals = (serviceChecks: ServiceCheck[]) => {
    const filledServiceChecks = serviceChecks.filter((check) => check.serviceCode && check.serviceCode.trim() !== "")

    const totalOfServices = filledServiceChecks.length
    const totalOfPassengers = filledServiceChecks.reduce((sum, check) => sum + check.passengersOnBoard, 0)
    const totalOfOOS = filledServiceChecks.reduce((sum, check) => sum + check.outOfSectionTickets, 0)
    const totalOfPasses = filledServiceChecks.reduce((sum, check) => sum + check.passesUsed, 0)

    return {
      totalOfServices,
      totalOfPassengers,
      totalOfOOS,
      totalOfPasses,
    }
  }

  const addOutOfSectionForm = () => {
    const newForm: OutOfSectionForm = {
      tempId: `temp-${Date.now()}`,
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
      serviceChecks: Array.from({ length: 50 }, (_, index) => ({
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
      })),
    }

    setForms((prev) => [...prev, newForm])
  }

  const removeForm = (tempId: string) => {
    setForms((prev) => prev.filter((form) => form.tempId !== tempId))
  }

  const handleExcelDataLoaded = (data: any) => {
    const paddedServiceChecks = [...data.serviceChecks]
    while (paddedServiceChecks.length < 50) {
      paddedServiceChecks.push({
        id: `empty-${Date.now()}-${paddedServiceChecks.length}`,
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
      })
    }

    const newForm: OutOfSectionForm = {
      tempId: `excel-${Date.now()}`,
      formHeader: data.formHeader,
      serviceChecks: paddedServiceChecks,
    }

    setForms((prev) => [...prev, newForm])
    setSubmitResult({
      success: true,
      message: `Successfully loaded ${data.serviceChecks.length} service checks from Excel file`,
    })
  }

  const updateServiceCheck = (formTempId: string, checkId: string, field: string, value: any) => {
    setForms((prev) =>
      prev.map((form) => {
        if (form.tempId !== formTempId) return form

        const updatedServiceChecks = form.serviceChecks.map((check) =>
          check.id === checkId ? { ...check, [field]: value } : check,
        )

        const totals = calculateTotals(updatedServiceChecks)

        return {
          ...form,
          serviceChecks: updatedServiceChecks,
          formHeader: {
            ...form.formHeader,
            ...totals,
          },
        }
      }),
    )
  }

  const updateGpsStatus = (formTempId: string, checkId: string, minutes: number, seconds: number) => {
    let status = "on-time"
    const totalSeconds = minutes * 60 + seconds
    if (totalSeconds < 0) status = "late"
    else if (totalSeconds >= 120) status = "early"
    else status = "on-time"

    setForms((prev) =>
      prev.map((form) => {
        if (form.tempId !== formTempId) return form

        const updatedServiceChecks = form.serviceChecks.map((check) =>
          check.id === checkId ? { ...check, gpsStatus: { minutes, seconds, status } } : check,
        )

        const totals = calculateTotals(updatedServiceChecks)

        return {
          ...form,
          serviceChecks: updatedServiceChecks,
          formHeader: {
            ...form.formHeader,
            ...totals,
          },
        }
      }),
    )
  }

  const updateFormHeader = (formTempId: string, field: string, value: string) => {
    setForms((prev) =>
      prev.map((form) =>
        form.tempId === formTempId
          ? {
              ...form,
              formHeader: { ...form.formHeader, [field]: value },
            }
          : form,
      ),
    )
  }

  const handleSubmit = async (formTempId: string) => {
    const form = forms.find((f) => f.tempId === formTempId)
    if (!form) return

    setIsSubmitting(formTempId)
    setSubmitResult(null)

    try {
      let result
      if (form.id && form.isEditing) {
        // Update existing form
        result = await updateOutOfSectionForm(form.id, form)
      } else {
        // Create new form
        result = await saveOutOfSectionForm(form)
      }

      setSubmitResult(result)

      if (result.success) {
        // Remove from working forms and refresh saved forms
        setForms((prev) => prev.filter((f) => f.tempId !== formTempId))
        await loadSavedForms()

        setTimeout(() => {
          setSubmitResult(null)
        }, 3000)
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      setSubmitResult({
        success: false,
        message: "An unexpected error occurred while saving the form",
      })
    } finally {
      setIsSubmitting(null)
    }
  }

  const handleEdit = (savedForm: any) => {
    // Convert saved form to working form format
    const workingForm: OutOfSectionForm = {
      id: savedForm.id,
      tempId: `edit-${savedForm.id}-${Date.now()}`,
      isEditing: true,
      formHeader: {
        title: savedForm.title,
        inspectorName: savedForm.inspector_name,
        date: savedForm.date,
        placeOfWork: savedForm.place_of_work,
        lineOrRouteNumber: savedForm.line_or_route_number,
        direction: savedForm.direction,
        totalOfServices: savedForm.total_of_services,
        totalOfPassengers: savedForm.total_of_passengers,
        totalOfOOS: savedForm.total_of_oos,
        totalOfPasses: savedForm.total_of_passes,
      },
      serviceChecks: [], // Will be populated with 50 rows
    }

    // Create 50 rows, filling with existing data where available
    const serviceChecks: ServiceCheck[] = Array.from({ length: 50 }, (_, index) => {
      const existingCheck = savedForm.service_checks?.[index]
      if (existingCheck) {
        return {
          id: `edit-${existingCheck.id}`,
          serviceCode: existingCheck.service_code,
          lineRouteBranch: existingCheck.line_route_branch,
          exactHourOfSchedule: existingCheck.exact_hour_of_schedule,
          gpsStatus: {
            minutes: existingCheck.gps_minutes,
            seconds: existingCheck.gps_seconds,
            status: existingCheck.gps_status,
          },
          passengersOnBoard: existingCheck.passengers_on_board,
          outOfSectionTickets: existingCheck.out_of_section_tickets,
          passesUsed: existingCheck.passes_used,
          observations: existingCheck.observations || "",
        }
      } else {
        return {
          id: `empty-${Date.now()}-${index}`,
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
        }
      }
    })

    workingForm.serviceChecks = serviceChecks
    setForms((prev) => [...prev, workingForm])
  }

  const handleDeleteClick = (form: any) => {
    setFormToDelete(form)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!formToDelete) return

    setIsDeleting(true)

    try {
      const result = await deleteOutOfSectionForm(formToDelete.id)

      if (result.success) {
        await loadSavedForms()
        setDeleteDialogOpen(false)
        setFormToDelete(null)
        setSubmitResult(result)
        setTimeout(() => setSubmitResult(null), 3000)
      } else {
        setSubmitResult(result)
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: "An unexpected error occurred while deleting the form",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Helper functions
  const formatGpsVariance = (minutes: number, seconds: number): string => {
    const totalSeconds = minutes * 60 + seconds
    const absSeconds = Math.abs(totalSeconds)
    const mins = Math.floor(absSeconds / 60)
    const secs = absSeconds % 60
    const sign = totalSeconds < 0 ? "-" : "+"
    return `${sign}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

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

  const isFormValid = (form: OutOfSectionForm) =>
    form.formHeader.inspectorName &&
    form.formHeader.placeOfWork &&
    form.formHeader.lineOrRouteNumber &&
    form.formHeader.direction

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
            <CardTitle className="text-2xl font-bold text-blue-900">OUT-OF-SECTION TICKETS (PASADOS)</CardTitle>
            <CardDescription>Manage your out-of-section tickets inspections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 justify-center">
              <Button onClick={addOutOfSectionForm} variant="outline">
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
              {forms.length > 0 && (
                <Button onClick={clearLocalStorage} variant="outline" className="text-red-600 bg-transparent">
                  <X className="w-4 h-4 mr-2" />
                  Clear All Drafts
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Saved Forms */}
        {savedForms.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Saved Forms</CardTitle>
              <CardDescription>Previously submitted out-of-section forms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedForms.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{form.inspector_name}</div>
                      <div className="text-sm text-gray-600">
                        {form.place_of_work} • {form.line_or_route_number} • {form.direction}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(form.date).toLocaleDateString()} • {form.total_of_services} services
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{form.total_of_services} services</Badge>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(form)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(form)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Working Forms */}
        {forms.map((form) => (
          <Card key={form.tempId} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {form.isEditing ? "Edit Out-of-Section Form" : "New Out-of-Section Form"}
                    {form.isEditing && <Badge variant="secondary">Editing</Badge>}
                  </CardTitle>
                  <CardDescription>Complete the form details and service checks</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeForm(form.tempId)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Form Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Inspector Name *</Label>
                  <Input
                    placeholder="Enter inspector name"
                    value={form.formHeader.inspectorName}
                    onChange={(e) => updateFormHeader(form.tempId, "inspectorName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={form.formHeader.date}
                    onChange={(e) => updateFormHeader(form.tempId, "date", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Place of Work *</Label>
                <Input
                  placeholder="City or address"
                  value={form.formHeader.placeOfWork}
                  onChange={(e) => updateFormHeader(form.tempId, "placeOfWork", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Route Number *</Label>
                  <Input
                    placeholder="e.g., Route 101"
                    value={form.formHeader.lineOrRouteNumber}
                    onChange={(e) => updateFormHeader(form.tempId, "lineOrRouteNumber", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Direction *</Label>
                  <Select
                    value={form.formHeader.direction}
                    onValueChange={(value) => updateFormHeader(form.tempId, "direction", value)}
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

              <Separator />

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

              <Separator />

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
                            onChange={(e) => updateServiceCheck(form.tempId, check.id, "serviceCode", e.target.value)}
                          />
                        </td>
                        <td className="border border-gray-300 p-1">
                          <Input
                            className="h-8 text-sm"
                            placeholder="Branch"
                            value={check.lineRouteBranch}
                            onChange={(e) =>
                              updateServiceCheck(form.tempId, check.id, "lineRouteBranch", e.target.value)
                            }
                          />
                        </td>
                        <td className="border border-gray-300 p-1">
                          <Input
                            className="h-8 text-sm"
                            type="time"
                            step="1"
                            value={check.exactHourOfSchedule}
                            onChange={(e) =>
                              updateServiceCheck(form.tempId, check.id, "exactHourOfSchedule", e.target.value)
                            }
                          />
                        </td>
                        <td className="border border-gray-300 p-1">
                          <Input
                            className="h-8 text-sm"
                            placeholder="+00:00"
                            value={formatGpsVariance(check.gpsStatus.minutes, check.gpsStatus.seconds)}
                            onChange={(e) => {
                              const { minutes, seconds } = parseGpsVariance(e.target.value)
                              updateGpsStatus(form.tempId, check.id, minutes, seconds)
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
                                form.tempId,
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
                                form.tempId,
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
                              updateServiceCheck(
                                form.tempId,
                                check.id,
                                "passesUsed",
                                Number.parseInt(e.target.value) || 0,
                              )
                            }
                          />
                        </td>
                        <td className="border border-gray-300 p-1">
                          <Textarea
                            className="h-8 text-sm resize-none"
                            placeholder="Notes..."
                            value={check.observations}
                            onChange={(e) => updateServiceCheck(form.tempId, check.id, "observations", e.target.value)}
                            rows={1}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Separator />

              {/* Submit Button */}
              <Button
                onClick={() => handleSubmit(form.tempId)}
                className="w-full"
                size="lg"
                disabled={!isFormValid(form) || isSubmitting === form.tempId}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting === form.tempId
                  ? "Saving..."
                  : form.isEditing
                    ? "Update Out-of-Section Form"
                    : "Submit Out-of-Section Form"}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Complete all required fields (*) • Form valid: {isFormValid(form) ? "✓" : "✗"}
              </p>
            </CardContent>
          </Card>
        ))}

        {forms.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No out-of-section forms in progress.</p>
            <p className="text-sm">Click "Add Out-Of-Section Form" to get started.</p>
          </div>
        )}

        {/* Excel Upload Modal */}
        {showExcelUpload && (
          <OutOfSectionExcelUpload onDataLoaded={handleExcelDataLoaded} onClose={() => setShowExcelUpload(false)} />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Out-of-Section Form</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this out-of-section form? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {formToDelete && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium">{formToDelete.inspector_name}</p>
                <p className="text-gray-600">{formToDelete.place_of_work}</p>
                <p className="text-gray-600">
                  {formToDelete.line_or_route_number} • {formToDelete.direction}
                </p>
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete Form"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
