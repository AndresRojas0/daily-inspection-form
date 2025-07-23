"use client"

import { useState } from "react"
import { deleteDailyInspectionForm } from "@/lib/actions"

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
        setForms((prev) => prev.filter((f) => f.id !== formToDelete.id))
        if (stats) {
          setStats((prev: any) => ({ ...prev, totalForms: prev.totalForms - 1 }))
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

  /* ---------- JSX identical to previous DashboardClient ---------- */
  return <div className="min-h-screen bg-gray-50 p-4">{/* ... (rest of the original JSX unchanged) ... */}</div>
}
