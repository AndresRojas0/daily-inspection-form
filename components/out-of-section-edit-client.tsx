"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, Calculator, FileText, AlertCircle } from "lucide-react"
import { updateOutOfSectionForm } from "@/lib/out-of-section-actions"
import type { OutOfSectionFormWithChecks } from "@/lib/out-of-section-actions"
import Link from "next/link"

interface OutOfSectionEditClientProps {
  form: OutOfSectionFormWithChecks
}

interface ServiceCheck {
  serviceCode: string
  lineRouteBranch: string
  exactHourOfSchedule: string
  gpsStatus: {
    minutes: number
    seconds: number
    status: "on-time" | "early" | "late"
  }
  passengersOnBoard: number
  outOfSectionTickets: number
  passesUsed: number
  observations: string
}

interface FormHeader {
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

export function OutOfSectionEditClient({ form }: OutOfSectionEditClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Initialize form state
  const [formHeader, setFormHeader] = useState<FormHeader>({
    title: form.title,
    inspectorName: form.inspector_name,
    date: form.date,
    placeOfWork: form.place_of_work,
    lineOrRouteNumber: form.line_or_route_number,
    direction: form.direction,
    totalOfServices: form.total_of_services,
    totalOfPassengers: form.total_of_passengers,
    totalOfOOS: form.total_of_oos,
    totalOfPasses: form.total_of_passes,
  })

  // Initialize service checks (50 rows)
  const [serviceChecks, setServiceChecks] = useState<ServiceCheck[]>(() => {
    const checks: ServiceCheck[] = Array.from({ length: 50 }, (_, i) => {
      const existingCheck = form.service_checks[i]
      if (existingCheck) {
        return {
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
      }
      return {
        serviceCode: "",
        lineRouteBranch: "",
        exactHourOfSchedule: "",
        gpsStatus: {
          minutes: 0,
          seconds: 0,
          status: "on-time" as const,
        },
        passengersOnBoard: 0,
        outOfSectionTickets: 0,
        passesUsed: 0,
        observations: "",
      }
    })
    return checks
  })

  const updateFormHeader = (field: keyof FormHeader, value: string | number) => {
    setFormHeader((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const updateServiceCheck = (index: number, field: keyof ServiceCheck, value: any) => {
    setServiceChecks((prev) =>
      prev.map((check, i) =>
        i === index
          ? {
              ...check,
              [field]: value,
            }
          : check,
      ),
    )
  }

  const updateGpsStatus = (index: number, field: "minutes" | "seconds" | "status", value: number | string) => {
    setServiceChecks((prev) =>
      prev.map((check, i) =>
        i === index
          ? {
              ...check,
              gpsStatus: {
                ...check.gpsStatus,
                [field]: value,
              },
            }
          : check,
      ),
    )
  }

  const calculateTotals = () => {
    const filledChecks = serviceChecks.filter((check) => check.serviceCode.trim() !== "")

    const totalServices = filledChecks.length
    const totalPassengers = filledChecks.reduce((sum, check) => sum + check.passengersOnBoard, 0)
    const totalOOS = filledChecks.reduce((sum, check) => sum + check.outOfSectionTickets, 0)
    const totalPasses = filledChecks.reduce((sum, check) => sum + check.passesUsed, 0)

    setFormHeader((prev) => ({
      ...prev,
      totalOfServices: totalServices,
      totalOfPassengers: totalPassengers,
      totalOfOOS: totalOOS,
      totalOfPasses: totalPasses,
    }))
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const formData = {
        formHeader,
        serviceChecks,
      }

      const result = await updateOutOfSectionForm(form.id, formData)

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        // Redirect to details page after successful update
        setTimeout(() => {
          router.push(`/out-of-section/${form.id}`)
        }, 1500)
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={`/out-of-section/${form.id}`}>
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Details
                  </Button>
                </Link>
                <div>
                  <CardTitle className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Edit Out-of-Section Form
                  </CardTitle>
                  <CardDescription>Form ID: {form.id}</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={calculateTotals} variant="outline">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate Totals
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Messages */}
        {message && (
          <Alert className={message.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className={message.type === "error" ? "text-red-800" : "text-green-800"}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Form Header */}
        <Card>
          <CardHeader>
            <CardTitle>Form Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Form Title</Label>
                <Input
                  id="title"
                  value={formHeader.title}
                  onChange={(e) => updateFormHeader("title", e.target.value)}
                  placeholder="Enter form title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inspector">Inspector Name</Label>
                <Input
                  id="inspector"
                  value={formHeader.inspectorName}
                  onChange={(e) => updateFormHeader("inspectorName", e.target.value)}
                  placeholder="Enter inspector name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formHeader.date}
                  onChange={(e) => updateFormHeader("date", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="placeOfWork">Place of Work</Label>
                <Input
                  id="placeOfWork"
                  value={formHeader.placeOfWork}
                  onChange={(e) => updateFormHeader("placeOfWork", e.target.value)}
                  placeholder="Enter place of work"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lineRoute">Line/Route Number</Label>
                <Input
                  id="lineRoute"
                  value={formHeader.lineOrRouteNumber}
                  onChange={(e) => updateFormHeader("lineOrRouteNumber", e.target.value)}
                  placeholder="Enter line/route number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direction">Direction</Label>
                <Select value={formHeader.direction} onValueChange={(value) => updateFormHeader("direction", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="north-south">North-South</SelectItem>
                    <SelectItem value="south-north">South-North</SelectItem>
                    <SelectItem value="east-west">East-West</SelectItem>
                    <SelectItem value="west-east">West-East</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center pt-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Total Services</p>
                <p className="text-2xl font-bold text-blue-900">{formHeader.totalOfServices}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Total Passengers</p>
                <p className="text-2xl font-bold text-green-900">{formHeader.totalOfPassengers}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">Total OOS</p>
                <p className="text-2xl font-bold text-red-900">{formHeader.totalOfOOS}</p>
                <p className="text-xs text-red-600">
                  {formHeader.totalOfPassengers > 0
                    ? `${((formHeader.totalOfOOS / formHeader.totalOfPassengers) * 100).toFixed(1)}%`
                    : "0.0%"}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600">Total Passes</p>
                <p className="text-2xl font-bold text-purple-900">{formHeader.totalOfPasses}</p>
                <p className="text-xs text-purple-600">
                  {formHeader.totalOfPassengers > 0
                    ? `${((formHeader.totalOfPasses / formHeader.totalOfPassengers) * 100).toFixed(1)}%`
                    : "0.0%"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Checks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Service Checks</CardTitle>
            <CardDescription>Edit details for each service check (50 rows available)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">#</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">Service Code</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">Line/Route/Branch</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">Exact Hour of Schedule</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">GPS Minutes</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">GPS Seconds</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">GPS Status</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">Passengers on Board</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">Out of Section Tickets</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">Passes Used</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium">Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceChecks.map((check, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-center text-sm">{index + 1}</td>
                      <td className="border border-gray-300 p-2">
                        <Input
                          value={check.serviceCode}
                          onChange={(e) => updateServiceCheck(index, "serviceCode", e.target.value)}
                          className="w-full min-w-[120px]"
                          placeholder="Service code"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Input
                          value={check.lineRouteBranch}
                          onChange={(e) => updateServiceCheck(index, "lineRouteBranch", e.target.value)}
                          className="w-full min-w-[150px]"
                          placeholder="Line/Route/Branch"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Input
                          type="time"
                          value={check.exactHourOfSchedule}
                          onChange={(e) => updateServiceCheck(index, "exactHourOfSchedule", e.target.value)}
                          className="w-full min-w-[120px]"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Input
                          type="number"
                          value={check.gpsStatus.minutes}
                          onChange={(e) => updateGpsStatus(index, "minutes", Number.parseInt(e.target.value) || 0)}
                          className="w-full min-w-[80px]"
                          placeholder="0"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Input
                          type="number"
                          value={check.gpsStatus.seconds}
                          onChange={(e) => updateGpsStatus(index, "seconds", Number.parseInt(e.target.value) || 0)}
                          className="w-full min-w-[80px]"
                          placeholder="0"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Select
                          value={check.gpsStatus.status}
                          onValueChange={(value) => updateGpsStatus(index, "status", value)}
                        >
                          <SelectTrigger className="w-full min-w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="on-time">On Time</SelectItem>
                            <SelectItem value="early">Early</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Input
                          type="number"
                          value={check.passengersOnBoard}
                          onChange={(e) =>
                            updateServiceCheck(index, "passengersOnBoard", Number.parseInt(e.target.value) || 0)
                          }
                          className="w-full min-w-[100px]"
                          placeholder="0"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Input
                          type="number"
                          value={check.outOfSectionTickets}
                          onChange={(e) =>
                            updateServiceCheck(index, "outOfSectionTickets", Number.parseInt(e.target.value) || 0)
                          }
                          className="w-full min-w-[100px]"
                          placeholder="0"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Input
                          type="number"
                          value={check.passesUsed}
                          onChange={(e) =>
                            updateServiceCheck(index, "passesUsed", Number.parseInt(e.target.value) || 0)
                          }
                          className="w-full min-w-[100px]"
                          placeholder="0"
                        />
                      </td>
                      <td className="border border-gray-300 p-2">
                        <Textarea
                          value={check.observations}
                          onChange={(e) => updateServiceCheck(index, "observations", e.target.value)}
                          className="w-full min-w-[200px] min-h-[60px]"
                          placeholder="Enter observations..."
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
