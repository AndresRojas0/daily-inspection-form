import { getDailyInspectionFormById } from "@/lib/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Clock,
  Users,
  FileText,
  MessageSquare,
  AlertCircle,
  Edit,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

interface PageProps {
  params: {
    id: string
  }
}

export default async function FormDetailPage({ params }: PageProps) {
  const formId = Number.parseInt(params.id)

  if (isNaN(formId)) {
    notFound()
  }

  const result = await getDailyInspectionFormById(formId)

  if (!result.success || !result.data) {
    notFound()
  }

  const form = result.data

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

  // Options for UTC-3 timezone display
  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires", // UTC-3 timezone
    hour12: false, // Use 24-hour format
  }

  // Check if form can be edited (created today)
  const today = new Date().toISOString().split("T")[0]
  const formCreatedDate = new Date(form.created_at).toISOString().split("T")[0]
  const canEdit = formCreatedDate === today

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inspection Form Details</h1>
              <p className="text-gray-600">Form ID: {form.id}</p>
            </div>
          </div>
          {canEdit && (
            <Link href={`/dashboard/${form.id}/edit`}>
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Edit Form
              </Button>
            </Link>
          )}
        </div>

        {/* Edit Notice */}
        {canEdit && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This form was created today and can be edited. Forms can only be edited on the
                day they were created.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Form Header Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {form.title}
            </CardTitle>
            <CardDescription>
              Created on {new Date(form.created_at).toLocaleString("en-US", dateTimeOptions)}
              {form.updated_at !== form.created_at && (
                <span className="ml-2 text-orange-600">
                  • Last updated: {new Date(form.updated_at).toLocaleString("en-US", dateTimeOptions)}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Inspector</p>
                  <p className="font-medium">{form.inspector_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
                    {new Date(form.date).toLocaleDateString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Place of Work</p>
                  <p className="font-medium">{form.place_of_work}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Checks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Service Inspections
            </CardTitle>
            <CardDescription className="flex items-center gap-4">
              <span>
                {form.service_checks.length} service check{form.service_checks.length !== 1 ? "s" : ""} recorded
              </span>
              {form.service_checks.filter((check) => check.non_compliance).length > 0 && (
                <Badge variant="destructive" className="bg-red-100 text-red-800">
                  {form.service_checks.filter((check) => check.non_compliance).length} non-compliance
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {form.service_checks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No service checks found for this form.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {form.service_checks.map((check, index) => (
                  <div
                    key={check.id}
                    className={`border rounded-lg p-4 space-y-4 ${
                      check.non_compliance ? "bg-red-50 border-red-200" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Service Check #{index + 1}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(check.gps_status)}>{check.gps_status}</Badge>
                        {check.non_compliance && (
                          <Badge variant="destructive" className="bg-red-100 text-red-800">
                            Non-Compliance
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Route Number</p>
                        <p className="font-medium">{check.line_or_route_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Driver Name</p>
                        <p className="font-medium">{check.driver_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Service Code</p>
                        <p className="font-medium">{check.service_code}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Fleet Coach Number</p>
                        <p className="font-medium">{check.fleet_coach_number}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Arrival Time</p>
                        <p className="font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {check.exact_hour_of_arrival}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">GPS Variance</p>
                        <p className="font-medium">{formatGpsVariance(check.gps_minutes)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Passengers on Board</p>
                        <p className="font-medium">{check.passengers_on_board}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Passes Used</p>
                        <p className="font-medium">{check.passes_used}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Address of Stop</p>
                        <p className="font-medium">{check.address_of_stop}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Observations Section - Always Visible */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-500" />
                        <p className="text-sm font-medium text-gray-700">Observations</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg min-h-[60px]">
                        {check.observations && check.observations.trim() !== "" ? (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{check.observations}</p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">None</p>
                        )}
                      </div>

                      {/* Non-Compliance Indicator */}
                      {check.non_compliance && (
                        <div className="flex items-center gap-2 p-2 bg-red-100 border border-red-200 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <p className="text-sm font-medium text-red-700">
                            Informe de Infracción (Non-Compliance Report)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Form Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Total Checks</p>
                <p className="text-2xl font-bold text-blue-900">{form.service_checks.length}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">On-Time</p>
                <p className="text-2xl font-bold text-green-900">
                  {form.service_checks.filter((check) => check.gps_status === "on-time").length}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">Early</p>
                <p className="text-2xl font-bold text-red-900">
                  {form.service_checks.filter((check) => check.gps_status === "early").length}
                </p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-600">Late</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {form.service_checks.filter((check) => check.gps_status === "late").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
