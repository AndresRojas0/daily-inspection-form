"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { ChevronLeft, ChevronRight, Trash2, Eye, Calendar, MapPin, Clock, Users } from "lucide-react"
import { deleteInspectionForm } from "@/lib/actions"
import { deleteOutOfSectionForm } from "@/lib/out-of-section-actions"
import Link from "next/link"

interface CalendarForm {
  form_type: "daily-inspection" | "out-of-section"
  id: number
  inspector_name: string
  date: string
  place_of_work: string
  line_or_route_number: string
  direction: string
  total_of_services: number
  total_of_passengers: number
  total_issues: number
  total_of_passes: number
  created_at: string
}

interface CalendarViewProps {
  initialForms: CalendarForm[]
  initialYear: number
  initialMonth: number
}

const MONTHS = [
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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function CalendarView({ initialForms, initialYear, initialMonth }: CalendarViewProps) {
  const [currentYear, setCurrentYear] = useState(initialYear)
  const [currentMonth, setCurrentMonth] = useState(initialMonth)
  const [forms, setForms] = useState<CalendarForm[]>(initialForms)
  const [loading, setLoading] = useState(false)

  console.log("CalendarView rendered with:", {
    formsCount: forms.length,
    currentYear,
    currentMonth,
    sampleForms: forms.slice(0, 3),
  })

  // Filter forms for the current month and year
  const currentMonthForms = forms.filter((form) => {
    const formDate = new Date(form.date)
    const formYear = formDate.getFullYear()
    const formMonth = formDate.getMonth() + 1

    console.log("Filtering form:", {
      formId: form.id,
      formDate: form.date,
      formYear,
      formMonth,
      currentYear,
      currentMonth,
      matches: formYear === currentYear && formMonth === currentMonth,
    })

    return formYear === currentYear && formMonth === currentMonth
  })

  console.log("Current month forms:", currentMonthForms.length)

  // Get forms for a specific date
  const getFormsForDate = (date: number): CalendarForm[] => {
    return currentMonthForms.filter((form) => {
      const formDate = new Date(form.date)
      const formDay = formDate.getDate()

      // Handle timezone issues by using UTC
      const utcFormDate = new Date(form.date + "T00:00:00Z")
      const utcFormDay = utcFormDate.getUTCDate()

      console.log("Checking form for date:", {
        targetDate: date,
        formDate: form.date,
        formDay,
        utcFormDay,
        matches: utcFormDay === date,
      })

      return utcFormDay === date
    })
  }

  // Generate calendar days
  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    const lastDay = new Date(currentYear, currentMonth, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      const dayForms = getFormsForDate(current.getDate())
      const isCurrentMonth = current.getMonth() === currentMonth - 1

      days.push({
        date: current.getDate(),
        fullDate: new Date(current),
        isCurrentMonth,
        forms: isCurrentMonth ? dayForms : [],
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (currentMonth === 1) {
        setCurrentMonth(12)
        setCurrentYear(currentYear - 1)
      } else {
        setCurrentMonth(currentMonth - 1)
      }
    } else {
      if (currentMonth === 12) {
        setCurrentMonth(1)
        setCurrentYear(currentYear + 1)
      } else {
        setCurrentMonth(currentMonth + 1)
      }
    }
  }

  const handleDeleteForm = async (form: CalendarForm) => {
    setLoading(true)
    try {
      let result
      if (form.form_type === "daily-inspection") {
        result = await deleteInspectionForm(form.id)
      } else {
        result = await deleteOutOfSectionForm(form.id)
      }

      if (result.success) {
        // Remove the form from the local state
        setForms((prevForms) => prevForms.filter((f) => !(f.id === form.id && f.form_type === form.form_type)))
      } else {
        console.error("Failed to delete form:", result.error)
        alert("Failed to delete form: " + result.error)
      }
    } catch (error) {
      console.error("Error deleting form:", error)
      alert("Error deleting form")
    } finally {
      setLoading(false)
    }
  }

  const calendarDays = generateCalendarDays()

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")} disabled={loading}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <h2 className="text-2xl font-semibold">
            {MONTHS[currentMonth - 1]} {currentYear}
          </h2>

          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")} disabled={loading}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{currentMonthForms.length} forms this month</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b">
            {DAYS.map((day) => (
              <div key={day} className="p-3 text-center font-medium text-gray-500 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-[120px] p-2 border-r border-b last:border-r-0 ${
                  !day.isCurrentMonth ? "bg-gray-50 text-gray-400" : ""
                }`}
              >
                <div className="font-medium mb-2">{day.date}</div>

                <div className="space-y-1">
                  {day.forms.map((form) => (
                    <div key={`${form.form_type}-${form.id}`} className="group relative">
                      <div
                        className={`text-xs p-1 rounded cursor-pointer transition-colors ${
                          form.form_type === "daily-inspection"
                            ? "bg-blue-100 hover:bg-blue-200 text-blue-800"
                            : "bg-green-100 hover:bg-green-200 text-green-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <Badge
                              variant="secondary"
                              className={`text-xs px-1 py-0 ${
                                form.form_type === "daily-inspection" ? "bg-blue-200" : "bg-green-200"
                              }`}
                            >
                              {form.form_type === "daily-inspection" ? "DI" : "OOS"}
                            </Badge>
                            <span className="truncate">{form.inspector_name}</span>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={`/${form.form_type === "daily-inspection" ? "dashboard" : "out-of-section"}/${form.id}`}
                              className="p-1 hover:bg-white rounded"
                              title="View form"
                            >
                              <Eye className="h-3 w-3" />
                            </Link>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="p-1 hover:bg-red-100 rounded text-red-600" title="Delete form">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Form</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this{" "}
                                    {form.form_type === "daily-inspection" ? "Daily Inspection" : "Out-of-Section"} form
                                    by {form.inspector_name}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteForm(form)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>

                        <div className="mt-1 text-xs opacity-75">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-2 w-2" />
                              {form.place_of_work}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Users className="h-2 w-2" />
                              {form.total_of_passengers}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-2 w-2" />
                              {form.total_of_services}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMonthForms.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Daily Inspections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {currentMonthForms.filter((f) => f.form_type === "daily-inspection").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Out-of-Section</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {currentMonthForms.filter((f) => f.form_type === "out-of-section").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Passengers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMonthForms.reduce((sum, form) => sum + form.total_of_passengers, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Information */}
      {process.env.NODE_ENV === "development" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-2">
              <div>
                Current Year/Month: {currentYear}/{currentMonth}
              </div>
              <div>Total Forms: {forms.length}</div>
              <div>Current Month Forms: {currentMonthForms.length}</div>
              <div>Sample Forms:</div>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(currentMonthForms.slice(0, 2), null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
