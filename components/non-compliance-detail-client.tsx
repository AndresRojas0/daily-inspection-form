"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { updateNonComplianceReport } from "@/lib/actions"
import { AlertTriangle, CheckCircle, User, FileText, Clock, MapPin, Users, Bus } from "lucide-react"

// This is a hypothetical type based on getNonComplianceReportById
type FullNonComplianceReport = {
  id: number
  service_check_id: number
  status: "open" | "in_progress" | "resolved"
  assigned_to: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
  // from service_checks
  line_or_route_number: string
  driver_name: string
  service_code: string
  fleet_coach_number: string
  exact_hour_of_arrival: string
  gps_minutes: number
  gps_status: string
  passengers_on_board: number
  passes_used: number
  address_of_stop: string
  observations: string | null
  // from daily_inspection_forms
  inspector_name: string
  inspection_date: string
}

interface NonComplianceDetailClientProps {
  report: FullNonComplianceReport
}

export function NonComplianceDetailClient({ report }: NonComplianceDetailClientProps) {
  const router = useRouter()
  const [status, setStatus] = useState(report.status)
  const [assignedTo, setAssignedTo] = useState(report.assigned_to || "")
  const [resolutionNotes, setResolutionNotes] = useState(report.resolution_notes || "")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitResult(null)

    const result = await updateNonComplianceReport(report.id, {
      status,
      assigned_to: assignedTo,
      resolution_notes: resolutionNotes,
    })

    setSubmitResult(result)
    setIsSubmitting(false)

    if (result.success) {
      // Refresh the page to show updated data
      router.refresh()
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "open":
        return "destructive"
      case "in_progress":
        return "secondary"
      case "resolved":
        return "default"
      default:
        return "outline"
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {submitResult && (
        <Alert variant={submitResult.success ? "default" : "destructive"}>
          {submitResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>{submitResult.success ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{submitResult.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column for report details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Non-Compliance Report #{report.id}</CardTitle>
              <CardDescription>
                Created on {new Date(report.created_at).toLocaleString()} by Inspector {report.inspector_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(report.status)} className="capitalize text-lg">
                    {report.status.replace("_", " ")}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Last updated: {new Date(report.updated_at).toLocaleString()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center">
                    <Bus className="w-5 h-5 mr-2" /> Service Check Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <p>
                      <strong>Route:</strong> {report.line_or_route_number}
                    </p>
                    <p>
                      <strong>Service Code:</strong> {report.service_code}
                    </p>
                    <p>
                      <strong>Driver:</strong> {report.driver_name}
                    </p>
                    <p>
                      <strong>Fleet Coach:</strong> {report.fleet_coach_number}
                    </p>
                    <p>
                      <strong>Arrival Time:</strong> {report.exact_hour_of_arrival}
                    </p>
                    <p>
                      <strong>GPS Status:</strong> {report.gps_status} ({report.gps_minutes} mins)
                    </p>
                    <p>
                      <strong>Passengers:</strong> {report.passengers_on_board}
                    </p>
                    <p>
                      <strong>Passes Used:</strong> {report.passes_used}
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" /> Location & Observations
                  </h3>
                  <p className="text-sm">
                    <strong>Address:</strong> {report.address_of_stop}
                  </p>
                  {report.observations && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">{report.observations}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column for actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manage Report</CardTitle>
              <CardDescription>Update the status and resolution details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assigned To</Label>
                  <Input
                    id="assignedTo"
                    placeholder="Enter name or team"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resolutionNotes">Resolution Notes</Label>
                  <Textarea
                    id="resolutionNotes"
                    placeholder="Describe the resolution..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={5}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
