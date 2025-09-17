"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChevronLeft, ChevronRight, FileText, Users, Trash2, CheckCircle, AlertCircle } from "lucide-react"
import { deleteDailyInspectionForm } from "@/lib/actions"
import { deleteOutOfSectionForm } from "@/lib/out-of-section-actions"

interface CalendarForm {
  id: number
  type: "daily-inspection" | "out-of-section"
  date: string
  inspector_name: string
  place_of_work: string
  service_checks_count: number
}

interface CalendarViewProps {
  forms: CalendarForm[]
}

export function CalendarView({ forms }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState<CalendarForm | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null)

  // Get current month and year
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Generate calendar days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  // Create array of calendar days
  const calendarDays = []

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null)
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // Group forms by date
  const formsByDate = forms.reduce(
    (acc, form) => {
      const dateKey = new Date(form.date).toISOString().split("T")[0]
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(form)
      return acc
    },
    {} as Record<string, CalendarForm[]>,
  )

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const navigateToMonth = (month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1))
  }

  const handleDeleteClick = (form: CalendarForm) => {
    setFormToDelete(form)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!formToDelete) return

    setIsDeleting(true)
    setDeleteResult(null)

    try {
      let result
      if (formToDelete.type === "daily-inspection") {
        result = await deleteDailyInspectionForm(formToDelete.id)
      } else {
        result = await deleteOutOfSectionForm(formToDelete.id)
      }

      setDeleteResult(result)

      if (result.success) {
        setDeleteDialogOpen(false)
        setFormToDelete(null)
        // Refresh the page to update the forms list
        window.location.reload()
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

  const getDateKey = (day: number) => {
    return new Date(currentYear, currentMonth, day).toISOString().split("T")[0]
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

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  // Generate year options (current year ± 5 years)
  const currentYearNum = new Date().getFullYear()
  const yearOptions = []
  for (let year = currentYearNum - 5; year <= currentYearNum + 5; year++) {
    yearOptions.push(year)
  }

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Calendar View</CardTitle>
              <CardDescription>
                Showing {forms.length} forms total ({forms.filter((f) => f.type === "daily-inspection").length} Daily
                Inspection, {forms.filter((f) => f.type === "out-of-section").length} Out-of-Section)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={currentMonth.toString()}
                onValueChange={(value) => navigateToMonth(Number.parseInt(value), currentYear)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={currentYear.toString()}
                onValueChange={(value) => navigateToMonth(currentMonth, Number.parseInt(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {dayNames.map((day) => (
              <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={index} className="p-2 h-24" />
              }

              const dateKey = getDateKey(day)
              const dayForms = formsByDate[dateKey] || []
              const isToday =
                day === new Date().getDate() &&
                currentMonth === new Date().getMonth() &&
                currentYear === new Date().getFullYear()

              return (
                <div
                  key={day}
                  className={`p-1 h-24 border border-gray-200 ${isToday ? "bg-blue-50 border-blue-300" : "bg-white"}`}
                >
                  <div className="text-sm font-medium text-gray-900 mb-1">{day}</div>
                  <div className="space-y-1">
                    {dayForms.slice(0, 2).map((form) => (
                      <div
                        key={`${form.type}-${form.id}`}
                        className="group relative cursor-pointer"
                        onClick={() => {
                          const url =
                            form.type === "daily-inspection" ? `/dashboard/${form.id}` : `/out-of-section/${form.id}`
                          window.open(url, "_blank")
                        }}
                      >
                        <Badge
                          variant={form.type === "daily-inspection" ? "default" : "secondary"}
                          className="text-xs px-1 py-0 w-full justify-start truncate"
                        >
                          {form.type === "daily-inspection" ? (
                            <FileText className="w-2 h-2 mr-1" />
                          ) : (
                            <Users className="w-2 h-2 mr-1" />
                          )}
                          {form.inspector_name.split(" ")[0]}
                        </Badge>
                        {/* Hover tooltip */}
                        <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-black text-white text-xs p-2 rounded shadow-lg whitespace-nowrap">
                          <div className="font-medium">{form.inspector_name}</div>
                          <div>{form.place_of_work}</div>
                          <div>{form.service_checks_count} services</div>
                          <div className="text-gray-300">
                            {form.type === "daily-inspection" ? "Daily Inspection" : "Out-of-Section"}
                          </div>
                        </div>
                      </div>
                    ))}
                    {dayForms.length > 2 && (
                      <div className="text-xs text-gray-500 text-center">+{dayForms.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Forms List for Current Month */}
      <Card>
        <CardHeader>
          <CardTitle>
            Forms for {monthNames[currentMonth]} {currentYear}
          </CardTitle>
          <CardDescription>
            {
              forms.filter((form) => {
                const formDate = new Date(form.date)
                return formDate.getMonth() === currentMonth && formDate.getFullYear() === currentYear
              }).length
            }{" "}
            forms in this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {forms
              .filter((form) => {
                const formDate = new Date(form.date)
                return formDate.getMonth() === currentMonth && formDate.getFullYear() === currentYear
              })
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((form) => (
                <div
                  key={`${form.type}-${form.id}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {form.type === "daily-inspection" ? (
                      <FileText className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Users className="w-5 h-5 text-purple-600" />
                    )}
                    <div>
                      <div className="font-medium">{form.inspector_name}</div>
                      <div className="text-sm text-gray-600">{form.place_of_work}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(form.date).toLocaleDateString()} • {form.service_checks_count} services
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={form.type === "daily-inspection" ? "default" : "secondary"}>
                      {form.type === "daily-inspection" ? "Daily Inspection" : "Out-of-Section"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url =
                          form.type === "daily-inspection" ? `/dashboard/${form.id}` : `/out-of-section/${form.id}`
                        window.open(url, "_blank")
                      }}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(form)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            {forms.filter((form) => {
              const formDate = new Date(form.date)
              return formDate.getMonth() === currentMonth && formDate.getFullYear() === currentYear
            }).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No forms found for this month.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this form? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {formToDelete && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium">{formToDelete.inspector_name}</p>
              <p className="text-gray-600">{formToDelete.place_of_work}</p>
              <p className="text-gray-600">
                {formToDelete.type === "daily-inspection" ? "Daily Inspection" : "Out-of-Section"} •{" "}
                {new Date(formToDelete.date).toLocaleDateString()}
              </p>
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
