"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
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
import { Trash2, CheckCircle, AlertCircle } from "lucide-react"
import { deleteDailyInspectionForm } from "@/lib/actions"

interface CalendarForm {
  id: number
  inspector_name: string
  date: string
  place_of_work: string
  service_checks_count: number
  created_at: string
}

interface CalendarViewProps {
  forms: Record<string, CalendarForm[]> // Forms grouped by date string
}

export function CalendarView({ forms }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState<CalendarForm | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
  }

  const modifiers = {
    hasForms: (date: Date) => {
      const dateKey = date.toDateString()
      return forms[dateKey] && forms[dateKey].length > 0
    },
  }

  const modifiersStyles = {
    hasForms: {
      backgroundColor: "hsl(var(--primary))", // Tailwind's primary color
      color: "hsl(var(--primary-foreground))", // Tailwind's primary-foreground color
    },
  }

  const selectedDateKey = selectedDate ? selectedDate.toDateString() : undefined
  const formsForSelectedDate = selectedDateKey ? forms[selectedDateKey] : []

  const handleDeleteClick = (form: CalendarForm) => {
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
        setSelectedDate(undefined)
        setFormToDelete(null)
        setDeleteResult(null)
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Select a Date</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="rounded-md border"
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedDate ? `Forms for ${format(selectedDate, "PPP")}` : "Select a date to view forms"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedDate && formsForSelectedDate && formsForSelectedDate.length > 0 ? (
            formsForSelectedDate.map((form) => (
              <div key={form.id} className="border rounded-lg p-4 shadow-sm bg-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{form.inspector_name}</h3>
                  <Badge variant="secondary">{form.service_checks_count} checks</Badge>
                </div>
                <p className="text-sm text-gray-600">Place: {form.place_of_work}</p>
                <p className="text-sm text-gray-600">Submitted: {new Date(form.created_at).toLocaleDateString()}</p>
                <Link href={`/dashboard/${form.id}`} passHref>
                  <Button variant="link" className="p-0 h-auto mt-2">
                    View Details <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteClick(form)}
                  className="text-red-600 hover:text-red-800 hover:border-red-300 mt-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              {selectedDate ? "No forms submitted on this date." : "No date selected."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
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
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
              {deleteResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={deleteResult.success ? "text-green-800" : "text-red-800"}>{deleteResult.message}</span>
            </div>
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
  )
}
