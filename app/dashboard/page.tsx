"use client"

import { useState } from "react"
import { getDailyInspectionForms, getInspectionStats, deleteDailyInspectionForm } from "@/lib/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { CalendarDays, FileText, Users, TrendingUp, Calendar, Trash2, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface DashboardClientProps {
  initialForms: any[]
  initialStats: any
}

function DashboardClient({ initialForms, initialStats }: DashboardClientProps) {
  const [forms, setForms] = useState(initialForms)
  const [stats, setStats] = useState(initialStats)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null)
  const router = useRouter()

  const handleDeleteClick = (form: any) => {
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
        // Remove the deleted form from the local state
        setForms((prevForms) => prevForms.filter((form) => form.id !== formToDelete.id))

        // Update stats if available
        if (stats) {
          setStats((prevStats: any) => ({
            ...prevStats,
            totalForms: prevStats.totalForms - 1,
          }))
        }

        // Close dialog after a short delay
        setTimeout(() => {
          setDeleteDialogOpen(false)
          setFormToDelete(null)
          setDeleteResult(null)
        }, 1500)
      }
    } catch (error) {
      setDeleteResult({
        success: false,
        message: "An unexpected error occurred while deleting the form",
      })
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inspection Dashboard</h1>
            <p className="text-gray-600">Monitor and manage daily inspection forms</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/calendar">
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Calendar View
              </Button>
            </Link>
            <Link href="/">
              <Button>New Inspection</Button>
            </Link>
          </div>
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

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalForms}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalChecks}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentForms}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-1">
                  {stats.statusStats.map((stat: any) => (
                    <Badge key={stat.status} className={getStatusColor(stat.status)} variant="secondary">
                      {stat.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Forms */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Inspection Forms</CardTitle>
            <CardDescription>Latest daily inspection submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {forms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No inspection forms found.</p>
                <p className="text-sm">Create your first inspection form to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {forms.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{form.inspector_name}</div>
                      <div className="text-sm text-gray-500">{form.place_of_work}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(form.date).toLocaleDateString()} • Created{" "}
                        {new Date(form.created_at).toLocaleDateString()}
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Inspection Form</AlertDialogTitle>
              {/* Main description – MUST stay inline to avoid <p> inside <p> */}
              <AlertDialogDescription>Are you sure you want to delete this inspection form?</AlertDialogDescription>
            </AlertDialogHeader>
            {/* Form summary – moved outside the description to prevent nesting */}
            {formToDelete && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium">{formToDelete.inspector_name}</p>
                <p className="text-gray-600">{formToDelete.place_of_work}</p>
                <p className="text-gray-600">Date: {new Date(formToDelete.date).toLocaleDateString()}</p>
              </div>
            )}
            {/* Warning message – also outside the description */}
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

// Server component wrapper
export default async function Dashboard() {
  const [formsResult, statsResult] = await Promise.all([getDailyInspectionForms(20), getInspectionStats()])

  const forms = formsResult.success ? formsResult.data : []
  const stats = statsResult.success ? statsResult.data : null

  return <DashboardClient initialForms={forms} initialStats={stats} />
}
