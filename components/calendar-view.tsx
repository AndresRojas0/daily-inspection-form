"use client"

import { useState, useEffect } from "react" // Import useEffect
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Users,
  Clock,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
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
  forms: CalendarForm[]
}

// Helper function to safely parse date strings without timezone issues
function parseFormDate(dateString: string): string {
  // If the date is already in YYYY-MM-DD format, return as-is
  if (typeof dateString === "string" && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString
  }

  // If it's a full datetime string, extract just the date part
  if (typeof dateString === "string" && dateString.includes("T")) {
    return dateString.split("T")[0]
  }

  // If it's some other format, try to parse it safely
  try {
    const date = new Date(dateString + "T00:00:00") // Force local time interpretation
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  } catch (error) {
    console.error("Error parsing date:", dateString, error)
    return dateString
  }
}

// Helper function to format date for display without timezone issues
function formatDateForDisplay(dateString: string): string {
  try {
    // Parse the date string as local date to avoid timezone shifts
    const [year, month, day] = dateString.split("-").map(Number)
    const date = new Date(year, month - 1, day) // month is 0-indexed in JS Date

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch (error) {
    console.error("Error formatting date for display:", dateString, error)
    return dateString
  }
}

export function CalendarView({ forms: initialForms }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [forms, setForms] = useState(initialForms)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState<CalendarForm | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    console.log("Calendar View: Initial forms received:", forms.length, forms)
  }, [forms]) // Log initial forms and their count

  // Group forms by date using the safe date parsing
  const formsByDate = forms.reduce(
    (acc, form) => {
      const dateString = parseFormDate(form.date)

      if (!acc[dateString]) {
        acc[dateString] = []
      }
      acc[dateString].push(form)
      return acc
    },
    {} as Record<string, CalendarForm[]>,
  )

  useEffect(() => {
    if (selectedDate) {
      console.log("Calendar View: Selected date changed to:", selectedDate)
      console.log("Calendar View: Forms grouped by date object:", formsByDate) // Log the full formsByDate object
      console.log("Calendar View: Forms for selected date from formsByDate:", formsByDate[selectedDate] || [])
    }
  }, [selectedDate, formsByDate]) // Include formsByDate in dependencies

  const handleDeleteClick = (form: CalendarForm) => {
    setFormToDelete(form)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!formToDelete) return

    setIsDeleting(true)
    setDeleteResult(null)

    try {
      // Call the server action to delete the form
      const result = await deleteDailyInspectionForm(formToDelete.id)
      setDeleteResult(result) // Set result from server action

      if (result.success) {
        // Remove the deleted form from the local state
        setForms((prevForms) => prevForms.filter((form) => form.id !== formToDelete.id))

        // Close dialog after a short delay
        setTimeout(() => {
          setDeleteDialogOpen(false)
          setFormToDelete(null)
          setDeleteResult(null) // Clear result after successful deletion message fades
        }, 1500)
      }
    } catch (error) {
      // This catch block handles unexpected network errors or issues *before* the action returns
      console.error("Client-side error calling deleteDailyInspectionForm:", error)
      setDeleteResult({
        success: false,
        message: "An unexpected client-side error occurred. Check browser console.",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Get calendar data for current month
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay()) // Start from Sunday

  const calendarDays = []
  const currentCalendarDate = new Date(startDate)

  // Generate 42 days (6 weeks) for the calendar grid
  for (let i = 0; i < 42; i++) {
    // Create consistent YYYY-MM-DD date string using local date components
    const year = currentCalendarDate.getFullYear()
    const monthNum = currentCalendarDate.getMonth() + 1
    const dayNum = currentCalendarDate.getDate()

    const dateString = `${year}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`

    const isCurrentMonth = currentCalendarDate.getMonth() === month

    // Create today's date string in the same format for comparison
    const today = new Date()
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    const isToday = dateString === todayString

    const dayForms = formsByDate[dateString] || []

    calendarDays.push({
      date: new Date(currentCalendarDate),
      dateString,
      isCurrentMonth,
      isToday,
      forms: dayForms,
      formCount: dayForms.length,
    })

    currentCalendarDate.setDate(currentCalendarDate.getDate() + 1)
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
    setSelectedDate(null)
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)

    // Create today's date string in YYYY-MM-DD format
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    setSelectedDate(todayString)
  }

  const selectedDateForms = selectedDate ? formsByDate[selectedDate] || [] : []

  return (
    <div className="space-y-6">
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

      {/* Debug Info */}
      {process.env.NODE_ENV === "development" && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-800">Debug: Total forms loaded (initialForms): {initialForms.length}</p>
            <p className="text-sm text-yellow-800">Debug: Total forms in state: {forms.length}</p>
            <p className="text-sm text-yellow-800">
              Debug: Dates with forms (grouped): {Object.keys(formsByDate).join(", ") || "None"}
            </p>
            <p className="text-sm text-yellow-800">Debug: Currently selected date: {selectedDate || "None"}</p>
            {selectedDate && (
              <p className="text-sm text-yellow-800">Debug: Forms on selected date: {selectedDateForms.length}</p>
            )}
            <p className="text-sm text-yellow-800">
              Debug: Sample form dates:{" "}
              {forms
                .slice(0, 3)
                .map((f) => `ID:${f.id}=${parseFormDate(f.date)}`)
                .join(", ")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <CardTitle>Inspection Calendar</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {monthNames[month]} {year}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <CardDescription>Click on any date to view inspection forms for that day</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Day headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => setSelectedDate(day.dateString)}
                className={`
                  relative p-2 h-16 text-left border rounded-lg transition-colors
                  ${!day.isCurrentMonth ? "text-gray-300 bg-gray-50" : ""}
                  ${day.isToday ? "border-blue-500 bg-blue-50" : "border-gray-200"}
                  ${selectedDate === day.dateString ? "border-blue-600 bg-blue-100" : ""}
                  ${day.formCount > 0 ? "hover:bg-green-50" : "hover:bg-gray-50"}
                `}
              >
                <div className="text-sm font-medium">{day.date.getDate()}</div>
                {day.formCount > 0 && (
                  <div className="absolute bottom-1 right-1">
                    <Badge variant="secondary" className="text-xs px-1 py-0 bg-green-100 text-green-800">
                      {day.formCount}
                    </Badge>
                  </div>
                )}
                {day.isToday && <div className="absolute top-1 left-1 w-2 h-2 bg-blue-500 rounded-full"></div>}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs px-1 py-0 bg-green-100 text-green-800">
                N
              </Badge>
              <span>Forms count</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Forms for {formatDateForDisplay(selectedDate)}
            </CardTitle>
            <CardDescription>
              {selectedDateForms.length === 0
                ? "No inspection forms found for this date"
                : `${selectedDateForms.length} inspection form${selectedDateForms.length > 1 ? "s" : ""} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateForms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No inspection forms for this date.</p>
                <Link href="/">
                  <Button className="mt-4 bg-transparent" variant="outline">
                    Create New Form
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateForms.map((form) => (
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
                        <span>{form.place_of_work}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {form.service_checks_count} checks
                        </span>
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
                      <Badge variant="outline">{form.service_checks_count} checks</Badge>
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
      )}

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
              <p className="text-gray-600">Date: {formatDateForDisplay(parseFormDate(formToDelete.date))}</p>
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
  )
}
