"use client"

import { useState, useEffect } from "react"
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
  Ticket,
} from "lucide-react"
import Link from "next/link"
import { deleteDailyInspectionForm } from "@/lib/actions"
import { deleteOutOfSectionForm } from "@/lib/out-of-section-actions"

interface CalendarForm {
  id: number
  inspector_name: string
  date: string
  place_of_work: string
  service_checks_count: number
  created_at: string
}

interface CalendarOOSForm {
  id: number
  inspector_name: string
  date: string
  place_of_work: string
  line_or_route_number: string
  direction: string
  service_checks_count: number
  created_at: string
}

interface CalendarViewProps {
  forms: CalendarForm[]
  oosForms: CalendarOOSForm[]
}

// Helper function to safely parse date strings without timezone issues
function parseFormDate(dateInput: any): string {
  try {
    // Handle null, undefined, or empty values
    if (!dateInput) {
      console.error("Empty date input:", dateInput)
      return ""
    }

    // If it's already in YYYY-MM-DD format, return as-is
    if (typeof dateInput === "string" && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateInput
    }

    // If it's a full datetime string, extract just the date part
    if (typeof dateInput === "string" && dateInput.includes("T")) {
      return dateInput.split("T")[0]
    }

    // Handle Date objects or date strings that need parsing
    let date: Date
    if (dateInput instanceof Date) {
      date = dateInput
    } else {
      // Parse the date string - this handles formats like "Thu Sep 11 2025 00:00:00 GMT-0300"
      date = new Date(dateInput)
    }

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.error("Invalid date after parsing:", dateInput, "->", date)
      return ""
    }

    // Format as YYYY-MM-DD using UTC to avoid timezone issues
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, "0")
    const day = String(date.getUTCDate()).padStart(2, "0")

    const result = `${year}-${month}-${day}`
    console.log("Date parsing:", dateInput, "->", result)
    return result
  } catch (error) {
    console.error("Error parsing date:", dateInput, error)
    return ""
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

export function CalendarView({ forms: initialForms, oosForms: initialOOSForms }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [forms, setForms] = useState(initialForms)
  const [oosForms, setOOSForms] = useState(initialOOSForms)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    console.log("Calendar View: Initial forms received:", forms.length, forms)
    console.log("Calendar View: Initial OOS forms received:", oosForms.length, oosForms)
  }, [forms, oosForms])

  // Get available years from both types of forms
  const availableYears = [
    ...new Set([
      ...forms
        .map((form) => {
          try {
            const parsedDate = parseFormDate(form.date)
            if (!parsedDate) return null
            const year = Number.parseInt(parsedDate.split("-")[0])
            return isNaN(year) ? null : year
          } catch (error) {
            console.error("Error parsing year from daily form date:", form.date, error)
            return null
          }
        })
        .filter((year): year is number => year !== null && !isNaN(year)),
      ...oosForms
        .map((form) => {
          try {
            const parsedDate = parseFormDate(form.date)
            if (!parsedDate) return null
            const year = Number.parseInt(parsedDate.split("-")[0])
            return isNaN(year) ? null : year
          } catch (error) {
            console.error("Error parsing year from OOS form date:", form.date, error)
            return null
          }
        })
        .filter((year): year is number => year !== null && !isNaN(year)),
    ]),
  ].sort((a, b) => b - a) // Sort descending (newest first)

  // If we have forms and current year has no forms, switch to the most recent year with forms
  useEffect(() => {
    if (availableYears.length > 0) {
      const currentYear = currentDate.getFullYear()
      const hasFormsInCurrentYear = availableYears.includes(currentYear)

      if (!hasFormsInCurrentYear) {
        // Switch to the most recent year that has forms
        const mostRecentYearWithForms = availableYears[0]
        setCurrentDate(new Date(mostRecentYearWithForms, currentDate.getMonth(), 1))
      }
    }
  }, [availableYears, currentDate])

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

  // Group OOS forms by date
  const oosFormsByDate = oosForms.reduce(
    (acc, form) => {
      const dateString = parseFormDate(form.date)
      if (!acc[dateString]) {
        acc[dateString] = []
      }
      acc[dateString].push(form)
      return acc
    },
    {} as Record<string, CalendarOOSForm[]>,
  )

  const handleDeleteClick = (form: any, formType: "daily" | "oos") => {
    setFormToDelete({ ...form, formType })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!formToDelete) return

    setIsDeleting(true)
    setDeleteResult(null)

    try {
      let result
      if (formToDelete.formType === "daily") {
        result = await deleteDailyInspectionForm(formToDelete.id)
        if (result.success) {
          setForms((prevForms) => prevForms.filter((form) => form.id !== formToDelete.id))
        }
      } else {
        result = await deleteOutOfSectionForm(formToDelete.id)
        if (result.success) {
          setOOSForms((prevForms) => prevForms.filter((form) => form.id !== formToDelete.id))
        }
      }

      setDeleteResult(result)

      if (result.success) {
        setTimeout(() => {
          setDeleteDialogOpen(false)
          setFormToDelete(null)
          setDeleteResult(null)
        }, 1500)
      }
    } catch (error) {
      console.error("Client-side error calling delete function:", error)
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
    const dayOOSForms = oosFormsByDate[dateString] || []

    calendarDays.push({
      date: new Date(currentCalendarDate),
      dateString,
      isCurrentMonth,
      isToday,
      forms: dayForms,
      oosForms: dayOOSForms,
      formCount: dayForms.length,
      oosFormCount: dayOOSForms.length,
      totalCount: dayForms.length + dayOOSForms.length,
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

  const navigateYear = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setFullYear(newDate.getFullYear() - 1)
      } else {
        newDate.setFullYear(newDate.getFullYear() + 1)
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
  const selectedDateOOSForms = selectedDate ? oosFormsByDate[selectedDate] || [] : []

  // Count forms in current viewing month/year
  const formsInCurrentMonth = Object.keys(formsByDate).filter((dateString) => {
    try {
      if (!dateString || dateString === "") return false
      const [formYear, formMonth] = dateString.split("-").map(Number)
      return !isNaN(formYear) && !isNaN(formMonth) && formYear === year && formMonth === month + 1
    } catch (error) {
      console.error("Error parsing date for counting:", dateString, error)
      return false
    }
  }).length

  const oosFormsInCurrentMonth = Object.keys(oosFormsByDate).filter((dateString) => {
    try {
      if (!dateString || dateString === "") return false
      const [formYear, formMonth] = dateString.split("-").map(Number)
      return !isNaN(formYear) && !isNaN(formMonth) && formYear === year && formMonth === month + 1
    } catch (error) {
      console.error("Error parsing date for counting:", dateString, error)
      return false
    }
  }).length

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
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-4">
          <p className="text-sm text-yellow-800">Debug: Total daily forms loaded: {String(forms.length)}</p>
          <p className="text-sm text-yellow-800">Debug: Total OOS forms loaded: {String(oosForms.length)}</p>
          <p className="text-sm text-yellow-800">Debug: Available years: {availableYears.join(", ") || "None"}</p>
          <p className="text-sm text-yellow-800">
            Debug: Currently viewing: {monthNames[month]} {String(year)}
          </p>
          <p className="text-sm text-yellow-800">Debug: Daily forms in current month: {String(formsInCurrentMonth)}</p>
          <p className="text-sm text-yellow-800">Debug: OOS forms in current month: {String(oosFormsInCurrentMonth)}</p>
          <p className="text-sm text-yellow-800">Debug: Currently selected date: {selectedDate || "None"}</p>
          {selectedDate && (
            <>
              <p className="text-sm text-yellow-800">
                Debug: Daily forms on selected date: {String(selectedDateForms.length)}
              </p>
              <p className="text-sm text-yellow-800">
                Debug: OOS forms on selected date: {String(selectedDateOOSForms.length)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

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

              {/* Year Navigation */}
              <div className="flex items-center gap-1 border rounded-md">
                <Button variant="ghost" size="sm" onClick={() => navigateYear("prev")}>
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <span className="px-2 text-sm font-medium min-w-[60px] text-center">{String(year)}</span>
                <Button variant="ghost" size="sm" onClick={() => navigateYear("next")}>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>

              {/* Month Navigation */}
              <div className="flex items-center gap-1 border rounded-md">
                <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 font-medium min-w-[100px] text-center">{monthNames[month]}</span>
                <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <CardDescription>
            Click on any date to view inspection forms for that day
            {availableYears.length > 0 && <span className="ml-2">• Available years: {availableYears.join(", ")}</span>}
          </CardDescription>
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
                  relative p-2 h-20 text-left border rounded-lg transition-colors
                  ${!day.isCurrentMonth ? "text-gray-300 bg-gray-50" : ""}
                  ${day.isToday ? "border-blue-500 bg-blue-50" : "border-gray-200"}
                  ${selectedDate === day.dateString ? "border-blue-600 bg-blue-100" : ""}
                  ${day.totalCount > 0 ? "hover:bg-green-50" : "hover:bg-gray-50"}
                `}
              >
                <div className="text-sm font-medium">{day.date.getDate()}</div>
                {day.totalCount > 0 && (
                  <div className="absolute bottom-1 right-1 flex flex-col gap-1">
                    {day.formCount > 0 && (
                      <Badge variant="secondary" className="text-xs px-1 py-0 bg-green-100 text-green-800">
                        <FileText className="w-2 h-2 mr-1" />
                        {day.formCount}
                      </Badge>
                    )}
                    {day.oosFormCount > 0 && (
                      <Badge variant="secondary" className="text-xs px-1 py-0 bg-orange-100 text-orange-800">
                        <Ticket className="w-2 h-2 mr-1" />
                        {day.oosFormCount}
                      </Badge>
                    )}
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
                <FileText className="w-2 h-2 mr-1" />N
              </Badge>
              <span>Daily Inspections</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs px-1 py-0 bg-orange-100 text-orange-800">
                <Ticket className="w-2 h-2 mr-1" />N
              </Badge>
              <span>Out-of-Section</span>
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
              {selectedDateForms.length + selectedDateOOSForms.length === 0
                ? "No forms found for this date"
                : `${selectedDateForms.length} daily inspection form${selectedDateForms.length !== 1 ? "s" : ""} and ${selectedDateOOSForms.length} out-of-section form${selectedDateOOSForms.length !== 1 ? "s" : ""} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDateForms.length === 0 && selectedDateOOSForms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No forms for this date.</p>
                <div className="flex gap-2 justify-center mt-4">
                  <Link href="/">
                    <Button className="bg-transparent" variant="outline">
                      Create Daily Inspection
                    </Button>
                  </Link>
                  <Link href="/out-of-section">
                    <Button className="bg-transparent" variant="outline">
                      Create Out-of-Section
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Daily Inspection Forms */}
                {selectedDateForms.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      Daily Inspection Forms ({selectedDateForms.length})
                    </h3>
                    <div className="space-y-3">
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
                              onClick={() => handleDeleteClick(form, "daily")}
                              className="text-red-600 hover:text-red-800 hover:border-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Out-of-Section Forms */}
                {selectedDateOOSForms.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-orange-600" />
                      Out-of-Section Forms ({selectedDateOOSForms.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedDateOOSForms.map((form) => (
                        <div
                          key={form.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 border-l-4 border-l-orange-500"
                        >
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              {form.inspector_name}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-2">
                              <span>{form.place_of_work}</span>
                              <span>•</span>
                              <span>{form.line_or_route_number}</span>
                              <span>•</span>
                              <span>{form.direction}</span>
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <Ticket className="w-3 h-3" />
                                {form.service_checks_count} services
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
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              {form.service_checks_count} services
                            </Badge>
                            <Link href={`/out-of-section/${form.id}`}>
                              <Button variant="outline" size="sm">
                                View Details
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(form, "oos")}
                              className="text-red-600 hover:text-red-800 hover:border-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent key={isDeleting ? "deleting-dialog" : "not-deleting-dialog"}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {formToDelete?.formType === "daily" ? "Daily Inspection" : "Out-of-Section"} Form
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this{" "}
              {formToDelete?.formType === "daily" ? "daily inspection" : "out-of-section"} form?
            </AlertDialogDescription>
          </AlertDialogHeader>

          {formToDelete && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium">{formToDelete.inspector_name}</p>
              <p className="text-gray-600">{formToDelete.place_of_work}</p>
              {formToDelete.formType === "oos" && (
                <p className="text-gray-600">
                  {formToDelete.line_or_route_number} • {formToDelete.direction}
                </p>
              )}
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
