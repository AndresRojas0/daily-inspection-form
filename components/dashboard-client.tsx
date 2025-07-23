"use client"

import { useState } from "react"
import { deleteDailyInspectionForm } from "@/lib/actions"
import { Button, Alert, AlertDescription } from "@/components/ui" // <- shadcn re-exports (adjust if you don’t have an index.ts)

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

import { Calendar, CheckCircle, AlertCircle } from "lucide-react"

import Link from "next/link"
import { useRouter } from "next/navigation"

interface DashboardClientProps {
  initialForms: any[]
  initialStats: any
}

export function DashboardClient({ initialForms, initialStats }: DashboardClientProps) {
  const [forms, setForms] = useState(initialForms)
  const [stats, setStats] = useState(initialStats)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null)

  const router = useRouter()

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

  const handleDeleteClick = (form: any) => {
    setFormToDelete(form)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!formToDelete) return
    setIsDeleting(true)
    setDeleteResult(null)

    try {
      const res = await deleteDailyInspectionForm(formToDelete.id)
      setDeleteResult(res)

      if (res.success) {
        setForms((prev) => prev.filter((f) => f.id !== formToDelete.id))
        if (stats) {
          setStats((prev: any) => ({ ...prev, totalForms: prev.totalForms - 1 }))
        }
        setTimeout(() => {
          setDeleteDialogOpen(false)
          setFormToDelete(null)
          setDeleteResult(null)
        }, 1300)
      }
    } catch {
      setDeleteResult({ success: false, message: "Unexpected error while deleting" })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
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

        {/* ... keep your stats-cards JSX here ... */}

        {/* ... keep your recent-forms JSX here (including delete button calling handleDeleteClick) ... */}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Inspection Form</AlertDialogTitle>
              <AlertDialogDescription>Are you sure you want to delete this inspection form?</AlertDialogDescription>
            </AlertDialogHeader>

            {formToDelete && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium">{formToDelete.inspector_name}</p>
                <p className="text-gray-600">{formToDelete.place_of_work}</p>
                <p className="text-gray-600">Date: {new Date(formToDelete.date).toLocaleDateString()}</p>
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
