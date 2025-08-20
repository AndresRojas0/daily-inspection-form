"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, CheckCircle, Clock } from "lucide-react"

// This is a hypothetical type, as the actual type from actions.ts is not directly importable here
// We are assuming the structure based on the getNonComplianceReports action
type NonComplianceReport = {
  id: number
  status: string
  assigned_to: string | null
  created_at: string
  line_or_route_number: string
  driver_name: string
  fleet_coach_number: string
}

interface NonComplianceClientProps {
  initialReports: NonComplianceReport[]
  initialStatus: string
}

export function NonComplianceClient({ initialReports, initialStatus }: NonComplianceClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState(initialStatus)

  const handleFilterChange = (newStatus: string) => {
    setStatus(newStatus)
    const params = new URLSearchParams(searchParams)
    if (newStatus === "all") {
      params.delete("status")
    } else {
      params.set("status", newStatus)
    }
    router.push(`/non-compliance?${params.toString()}`)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertTriangle className="h-4 w-4 mr-2" />
      case "in_progress":
        return <Clock className="h-4 w-4 mr-2" />
      case "resolved":
        return <CheckCircle className="h-4 w-4 mr-2" />
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Non-Compliance Reports</CardTitle>
              <CardDescription>Track and manage all non-compliance events.</CardDescription>
            </div>
            <Badge variant="secondary">{initialReports.length} reports</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={status === "all" ? "default" : "outline"}
              onClick={() => handleFilterChange("all")}
            >
              All
            </Button>
            <Button
              variant={status === "open" ? "destructive" : "outline"}
              onClick={() => handleFilterChange("open")}
            >
              Open
            </Button>
            <Button
              variant={status === "in_progress" ? "secondary" : "outline"}
              onClick={() => handleFilterChange("in_progress")}
            >
              In Progress
            </Button>
            <Button
              variant={status === "resolved" ? "default" : "outline"}
              onClick={() => handleFilterChange("resolved")}
            >
              Resolved
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Fleet Coach</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Link href={`/non-compliance/${report.id}`} className="text-blue-600 hover:underline">
                      #{report.id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(report.status)} className="capitalize flex items-center">
                      {getStatusIcon(report.status)}
                      {report.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{report.line_or_route_number}</TableCell>
                  <TableCell>{report.driver_name}</TableCell>
                  <TableCell>{report.fleet_coach_number}</TableCell>
                  <TableCell>{report.assigned_to || "Unassigned"}</TableCell>
                  <TableCell>{new Date(report.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Link href={`/non-compliance/${report.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {initialReports.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold">All Clear!</h3>
              <p>No non-compliance reports found for the selected filter.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
