import { notFound } from "next/navigation"
import { getOutOfSectionFormById } from "@/lib/out-of-section-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, FileText, Users, Clock, MapPin, Route, Navigation } from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: {
    id: string
  }
}

// Helper function to format GPS variance
function formatGpsVariance(minutes: number, seconds: number): string {
  const totalSeconds = minutes * 60 + seconds
  const absSeconds = Math.abs(totalSeconds)
  const mins = Math.floor(absSeconds / 60)
  const secs = absSeconds % 60
  const sign = totalSeconds < 0 ? "-" : "+"
  return `${sign}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

// Helper function to get GPS status badge
function getGpsStatusBadge(status: string) {
  switch (status) {
    case "on-time":
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
          On Time
        </Badge>
      )
    case "early":
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          Early
        </Badge>
      )
    case "late":
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
          Late
        </Badge>
      )
    default:
      return <Badge variant="secondary">Unknown</Badge>
  }
}

// Helper function to calculate percentage
function calculatePercentage(value: number, total: number): string {
  if (total === 0) return "0.0%"
  return `${((value / total) * 100).toFixed(1)}%`
}

// Helper function to check if form can be edited (created today)
function canEditForm(createdAt: string): boolean {
  const todayUTC3 = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
  const formCreatedDateUTC3 = new Date(createdAt).toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  })
  return formCreatedDateUTC3 === todayUTC3
}

export default async function OutOfSectionDetailsPage({ params }: PageProps) {
  const formId = Number.parseInt(params.id)

  if (isNaN(formId)) {
    notFound()
  }

  const result = await getOutOfSectionFormById(formId)

  if (!result.success || !result.data) {
    notFound()
  }

  const form = result.data
  const canEdit = canEditForm(form.created_at)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/out-of-section">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Forms
                  </Button>
                </Link>
                <div>
                  <CardTitle className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                    <FileText className="w-6 h-6" />
                    Out-of-Section Form Details
                  </CardTitle>
                  <CardDescription>Form ID: {form.id}</CardDescription>
                </div>
              </div>
              {canEdit && (
                <Link href={`/out-of-section/${form.id}/edit`}>
                  <Button>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Form
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Form Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Form Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  Inspector Name
                </div>
                <p className="font-medium">{form.inspector_name}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  Date
                </div>
                <p className="font-medium">{new Date(form.date).toLocaleDateString()}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  Place of Work
                </div>
                <p className="font-medium">{form.place_of_work}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Route className="w-4 h-4" />
                  Line/Route Number
                </div>
                <p className="font-medium">{form.line_or_route_number}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Navigation className="w-4 h-4" />
                  Direction
                </div>
                <p className="font-medium capitalize">{form.direction.replace("-", " ")}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  Created
                </div>
                <p className="font-medium">
                  {new Date(form.created_at).toLocaleString("en-US", {
                    timeZone: "America/Argentina/Buenos_Aires",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Summary Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Total Services</p>
                <p className="text-2xl font-bold text-blue-900">{form.total_of_services}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Total Passengers</p>
                <p className="text-2xl font-bold text-green-900">{form.total_of_passengers}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">Total OOS</p>
                <p className="text-2xl font-bold text-red-900">{form.total_of_oos}</p>
                <p className="text-xs text-red-600">
                  {calculatePercentage(form.total_of_oos, form.total_of_passengers)}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600">Total Passes</p>
                <p className="text-2xl font-bold text-purple-900">{form.total_of_passes}</p>
                <p className="text-xs text-purple-600">
                  {calculatePercentage(form.total_of_passes, form.total_of_passengers)}
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg col-span-2">
                <p className="text-sm text-orange-600">OOS + Passes</p>
                <p className="text-2xl font-bold text-orange-900">{form.total_of_oos + form.total_of_passes}</p>
                <p className="text-xs text-orange-600">
                  {calculatePercentage(form.total_of_oos + form.total_of_passes, form.total_of_passengers)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Checks */}
        <Card>
          <CardHeader>
            <CardTitle>Service Checks ({form.service_checks.length})</CardTitle>
            <CardDescription>Detailed breakdown of all service checks performed</CardDescription>
          </CardHeader>
          <CardContent>
            {form.service_checks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No service checks recorded for this form.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">#</th>
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">Service Code</th>
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">Branch</th>
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">Schedule</th>
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">GPS Variance</th>
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">Status</th>
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">Passengers</th>
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">OOS Tickets</th>
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">Passes</th>
                      <th className="border border-gray-300 p-3 text-left text-sm font-medium">Observations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.service_checks.map((check, index) => (
                      <tr key={check.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-3 text-center text-sm font-medium">{index + 1}</td>
                        <td className="border border-gray-300 p-3 text-sm font-medium">{check.service_code}</td>
                        <td className="border border-gray-300 p-3 text-sm">{check.line_route_branch || "-"}</td>
                        <td className="border border-gray-300 p-3 text-sm font-mono">
                          {check.exact_hour_of_schedule || "-"}
                        </td>
                        <td className="border border-gray-300 p-3 text-sm font-mono">
                          {formatGpsVariance(check.gps_minutes, check.gps_seconds)}
                        </td>
                        <td className="border border-gray-300 p-3 text-sm">{getGpsStatusBadge(check.gps_status)}</td>
                        <td className="border border-gray-300 p-3 text-sm text-center">{check.passengers_on_board}</td>
                        <td className="border border-gray-300 p-3 text-sm text-center">
                          <span className="font-medium text-red-600">{check.out_of_section_tickets}</span>
                        </td>
                        <td className="border border-gray-300 p-3 text-sm text-center">
                          <span className="font-medium text-purple-600">{check.passes_used}</span>
                        </td>
                        <td className="border border-gray-300 p-3 text-sm max-w-xs">
                          <div className="truncate" title={check.observations || ""}>
                            {check.observations || "-"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Notice */}
        {!canEdit && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This form can only be edited on the day it was created. Since it was created on a
                different day, editing is no longer available.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
