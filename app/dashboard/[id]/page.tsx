"use client"

import { getDailyInspectionFormById, deleteDailyInspectionForm } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { notFound } from "next/navigation"
import Link from "next/link"

interface FormDetailPageProps {
  params: {
    id: string
  }
}

export default async function FormDetailPage({ params }: FormDetailPageProps) {
  const formId = Number.parseInt(params.id)
  if (Number.isNaN(formId)) {
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

  const formatGpsVariance = (minutes: number): string => {
    const absMinutes = Math.abs(minutes)
    const wholeMinutes = Math.floor(absMinutes)
    const seconds = Math.round((absMinutes - wholeMinutes) * 60)
    const sign = minutes < 0 ? "-" : "+"
    return `${sign}${wholeMinutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-blue-900">Inspection Details</h1>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Form Header Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{form.title}</CardTitle>
            <CardDescription>
              Inspection by {form.inspector_name} on {new Date(form.date).toLocaleDateString()} at {form.place_of_work}
            </CardDescription>
            <div className="text-sm text-gray-500">Created: {new Date(form.created_at).toLocaleString()}</div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{form.service_checks.length} Service Checks</Badge>
              {form.service_checks.filter((check) => check.non_compliance).length > 0 && (
                <Badge variant="destructive" className="bg-red-100 text-red-800">
                  {form.service_checks.filter((check) => check.non_compliance).length} Non-Compliance
                </Badge>
              )}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-4 w-full">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Form
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {
                      "This action cannot be undone. This will permanently delete this inspection form and all associated service checks from our servers."
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await deleteDailyInspectionForm(form.id)
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Service Checks Details */}
        <h2 className="text-2xl font-bold text-blue-800 mt-8">Service Checks</h2>
        <div className="space-y-4">
          {form.service_checks.length === 0 && (
            <Card>
              <CardContent className="py-6 text-center text-gray-500">
                No service checks found for this form.
              </CardContent>
            </Card>
          )}
          {form.service_checks.map((check, index) => (
            <Card
              key={check.id}
              className={`border-l-4 ${check.non_compliance ? "border-l-red-500 bg-red-50" : "border-l-blue-500"}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Service Check #{index + 1}</CardTitle>
                  {check.non_compliance && (
                    <Badge variant="destructive" className="bg-red-100 text-red-800">
                      Non-Compliance
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Route: {check.line_or_route_number} | Driver: {check.driver_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium">Service Code:</span> {check.service_code}
                  </div>
                  <div>
                    <span className="font-medium">Fleet Coach:</span> {check.fleet_coach_number}
                  </div>
                  <div>
                    <span className="font-medium">Arrival Time:</span> {check.exact_hour_of_arrival}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">GPS Variance:</span> {formatGpsVariance(check.gps_minutes)}
                    <Badge className={getStatusColor(check.gps_status)}>{check.gps_status}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Passengers:</span> {check.passengers_on_board}
                  </div>
                  <div>
                    <span className="font-medium">Passes Used:</span> {check.passes_used}
                  </div>
                  <div className="col-span-full">
                    <span className="font-medium">Address of Stop:</span> {check.address_of_stop}
                  </div>
                  <div className="col-span-full">
                    <span className="font-medium">Observations:</span>{" "}
                    {check.observations && check.observations.trim() !== "" ? check.observations : "None"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
