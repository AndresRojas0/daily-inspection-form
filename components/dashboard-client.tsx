"use client"

import { Badge } from "@/components/ui/badge"

import { useState } from "react"
import { deleteDailyInspectionForm } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Plus, Calendar, FileText, Users, Clock, Trash2, CheckCircle, AlertCircle, LayoutDashboard } from "lucide-react"
import Link from "next/link"

interface DailyInspectionFormDB {
  id: number
  title: string
  inspector_name: string
  date: string
  place_of_work: string
  created_at: string
  updated_at: string
}

interface InspectionStats {
  totalForms: number
  totalChecks: number
  recentForms: number
  statusStats: { status: string; count: number }[]
}

interface DashboardClientProps {
  initialForms: DailyInspectionFormDB[]
  initialStats: InspectionStats | null
  topRoutes: { lineOrRouteNumber: string; count: number }[] // New prop
  topStops: { addressOfStop: string; count: number }[] // New prop
}

// Helper function to safely format dates - handles any input type
const formatDate = (dateInput: any, options?: Intl.DateTimeFormatOptions) => {
  try {
    // Handle null, undefined, empty string
    if (!dateInput || dateInput === '') {
      return 'No date';
    }
    
    let date: Date;
    
    // If it's already a Date object
    if (dateInput instanceof Date) {
      date = dateInput;
    }
    // If it's a number (timestamp)
    else if (typeof dateInput === 'number') {
      date = new Date(dateInput);
    }
    // If it's a string
    else if (typeof dateInput === 'string') {
      // If it's already a valid ISO string or timestamp
      if (!isNaN(Date.parse(dateInput))) {
        date = new Date(dateInput);
      }
      // If it's in YYYY-MM-DD format (common from databases)
      else if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Add time to avoid timezone issues with date-only strings
        date = new Date(dateInput + 'T00:00:00');
      }
      // If it's in MM/DD/YYYY format
      else if (dateInput.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        date = new Date(dateInput);
      }
      else {
        // Fallback: try to parse as-is
        date = new Date(dateInput);
      }
    }
    else {
      // Try to convert whatever it is to a date
      date = new Date(dateInput);
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date input:', dateInput, 'Type:', typeof dateInput);
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      ...options
    });
  } catch (error) {
    console.error('Error formatting date:', dateInput, 'Type:', typeof dateInput, 'Error:', error);
    return 'Invalid Date';
  }
};

export function DashboardClient({ initialForms, initialStats, topRoutes, topStops }: DashboardClientProps) {
  const [forms, setForms] = useState(initialForms)
  const [stats, setStats] = useState(initialStats)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState<DailyInspectionFormDB | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleDeleteClick = (form: DailyInspectionFormDB) => {
    setFormToDelete(form)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!formToDelete) return
    setIsDeleting(true)
    setDeleteResult(null)

    try {
      const result = await deleteDailyInspectionForm(formToDelete.id)
      setDeleteResult(result)

      if (result.success) {
        setForms((prev) => prev.filter((f) => f.id !== formToDelete.id))
        // Optimistically update stats if deletion is successful
        if (stats) {
          setStats((prevStats) => ({
            ...prevStats!,
            totalForms: prevStats!.totalForms - 1,
          }))
        }
        setTimeout(() => {
          setDeleteDialogOpen(false)
          setFormToDelete(null)
          setDeleteResult(null)
        }, 1500)
      }
    } catch {
      setDeleteResult({ success: false, message: "Unexpected error deleting form" })
    } finally {
      setIsDeleting(false)
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

  const getStatusCount = (status: string) => {
    return stats?.statusStats.find((s) => s.status === status)?.count || 0
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <LayoutDashboard className="w-6 h-6 text-gray-900" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Overview of your daily inspection forms</p>
            </div>
          </div>
          <Link href="/">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Inspection
            </Button>
          </Link>
        </div>

        {/* Delete Result Alert */}
        {deleteResult && (
          <Alert className={deleteResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {deleteResult.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={deleteResult.success ? "text-green-800" : "text-red-800"}>
              {deleteResult.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Forms (current month)</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalForms ?? 0}</div>
              <p className="text-xs text-muted-foreground">Total forms submitted in current month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Service Checks</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalChecks ?? 0}</div>
              <p className="text-xs text-muted-foreground">All time service checks recorded</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Checks (current month)</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{getStatusCount("on-time")}</div>
              <p className="text-xs text-muted-foreground">GPS status on-time in current month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Early/Late Checks (current month)</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{getStatusCount("early") + getStatusCount("late")}</div>
              <p className="text-xs text-muted-foreground">GPS status early or late in current month</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Routes and Stops */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 10 Routes */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Routes (Current Month)</CardTitle>
              <CardDescription>Most frequently inspected line or route numbers.</CardDescription>
            </CardHeader>
            <CardContent>
              {topRoutes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No route data for the current month.</p>
              ) : (
                <ul className="space-y-2">
                  {topRoutes.map((route, index) => (
                    <li key={index} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{route.lineOrRouteNumber}</span>
                      <Badge variant="secondary">{route.count}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Top 20 Stops */}
          <Card>
            <CardHeader>
              <CardTitle>Top 20 Stops (Current Month)</CardTitle>
              <CardDescription>Most frequently inspected addresses of stops.</CardDescription>
            </CardHeader>
            <CardContent>
              {topStops.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stop data for the current month.</p>
              ) : (
                <ul className="space-y-2">
                  {topStops.map((stop, index) => (
                    <li key={index} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stop.addressOfStop}</span>
                      <Badge variant="secondary">{stop.count}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Forms Table/List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Inspection Forms</CardTitle>
            <CardDescription>A list of your most recently submitted inspection forms.</CardDescription>
          </CardHeader>
          <CardContent>
            {forms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No inspection forms found.</p>
                <Link href="/">
                  <Button className="mt-4 bg-transparent" variant="outline">
                    Create New Form
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {forms.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="space-y-1">
                      <div className="font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        {form.inspector_name}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
<span>{formatDate(form.date)}</span>
                        <span>•</span>
                        <span>{form.place_of_work}</span>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Created{" "}
                        {new Date(form.created_at).toLocaleString("en-US", {
                          timeZone: "America/Argentina/Buenos_Aires",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/${form.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(form)}
                        className="text-red-600 hover:text-red-800 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent key={isDeleting ? "deleting-dialog" : "not-deleting-dialog"}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Inspection Form</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete this inspection form?</AlertDialogDescription>
            </AlertDialogHeader>

            {formToDelete && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium">{formToDelete.inspector_name}</p>
                <p className="text-gray-600">{formToDelete.place_of_work}</p>
                <p className="text-gray-600">
                  Date:{" "}
                  {new Date(formToDelete.date + "T00:00:00").toLocaleDateString("en-US", {
                    timeZone: "America/Argentina/Buenos_Aires",
                  })}
                </p>
              </div>
            )}

            <p className="mt-3 text-sm font-medium text-red-600">
              This action cannot be undone. All service checks associated with this form will also be deleted.
            </p>

            {deleteResult && (
              <Alert className={deleteResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {deleteResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={deleteResult.success ? "text-green-800" : "text-red-800"}>
                  {deleteResult.message}
                </AlertDescription>
              </Alert>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel key={isDeleting ? "deleting-cancel" : "not-deleting-cancel"} disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                key={isDeleting ? "deleting-action" : "not-deleting-action"}
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
