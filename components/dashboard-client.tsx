"use client"

import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  LayoutDashboard,
  Ticket,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
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
import type { OutOfSectionStats } from "@/lib/out-of-section-actions"
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
  topRoutes: { lineOrRouteNumber: string; count: number }[]
  topStops: { addressOfStop: string; count: number }[]
  oosStats: OutOfSectionStats | null
  selectedYear: number
  selectedMonth: number
}

// Helper function to safely format dates without timezone issues
const formatDate = (dateInput: any, options?: Intl.DateTimeFormatOptions) => {
  try {
    // Handle null, undefined, empty string
    if (!dateInput || dateInput === "") {
      return "No date"
    }

    // If it's a string in YYYY-MM-DD format (from database), parse it as local date
    if (typeof dateInput === "string" && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateInput.split("-").map(Number)
      const date = new Date(year, month - 1, day) // month is 0-indexed
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        ...options,
      })
    }

    // If it's a full datetime string, extract date part and parse as local
    if (typeof dateInput === "string" && dateInput.includes("T")) {
      const datePart = dateInput.split("T")[0]
      const [year, month, day] = datePart.split("-").map(Number)
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        ...options,
      })
    }

    // Fallback for other formats
    let date: Date
    if (dateInput instanceof Date) {
      date = dateInput
    } else if (typeof dateInput === "number") {
      date = new Date(dateInput)
    } else {
      date = new Date(dateInput)
    }

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn("Invalid date input:", dateInput, "Type:", typeof dateInput)
      return "Invalid Date"
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...options,
    })
  } catch (error) {
    console.error("Error formatting date:", dateInput, "Type:", typeof dateInput, "Error:", error)
    return "Invalid Date"
  }
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

export function DashboardClient({
  initialForms,
  initialStats,
  topRoutes,
  topStops,
  oosStats,
  selectedYear,
  selectedMonth,
}: DashboardClientProps) {
  const [forms, setForms] = useState(initialForms)
  const [stats, setStats] = useState(initialStats)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formToDelete, setFormToDelete] = useState<DailyInspectionFormDB | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string } | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  // Update local state when props change (when month/year changes)
  useEffect(() => {
    console.log("Dashboard client updating with new data:", {
      formsCount: initialForms.length,
      stats: initialStats,
      selectedYear,
      selectedMonth,
    })
    setForms(initialForms)
    setStats(initialStats)
  }, [initialForms, initialStats, selectedYear, selectedMonth])

  const navigateToMonth = (year: number, month: number) => {
    console.log("Navigating to:", { year, month })
    const params = new URLSearchParams(searchParams.toString())
    params.set("year", year.toString())
    params.set("month", month.toString())
    router.push(`/dashboard?${params.toString()}`)
  }

  const handlePreviousMonth = () => {
    let newMonth = selectedMonth - 1
    let newYear = selectedYear

    if (newMonth < 1) {
      newMonth = 12
      newYear = selectedYear - 1
    }

    navigateToMonth(newYear, newMonth)
  }

  const handleNextMonth = () => {
    let newMonth = selectedMonth + 1
    let newYear = selectedYear

    if (newMonth > 12) {
      newMonth = 1
      newYear = selectedYear + 1
    }

    navigateToMonth(newYear, newMonth)
  }

  const handleMonthChange = (value: string) => {
    const month = Number.parseInt(value)
    navigateToMonth(selectedYear, month)
  }

  const handleYearChange = (value: string) => {
    const year = Number.parseInt(value)
    navigateToMonth(year, selectedMonth)
  }

  const handleDeleteConfirm = async () => {
    if (formToDelete) {
      setIsDeleting(true)
      const result = await deleteDailyInspectionForm(formToDelete.id)
      setDeleteResult(result)
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setForms(forms.filter((form) => form.id !== formToDelete.id))

      // Update stats optimistically
      if (result.success && stats) {
        setStats({
          ...stats,
          totalForms: Math.max(0, stats.totalForms - 1),
        })
      }
    }
  }

  // Generate year options (current year ± 2 years)
  const currentYear = new Date().getFullYear()
  const yearOptions = []
  for (let i = currentYear - 2; i <= currentYear + 2; i++) {
    yearOptions.push(i)
  }

  const isCurrentMonth = selectedYear === currentYear && selectedMonth === new Date().getMonth() + 1

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

  console.log("Dashboard client rendering with stats:", stats)

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
          <div className="flex gap-2">
            <Link href="/">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Inspection
              </Button>
            </Link>
            <Link href="/out-of-section">
              <Button variant="outline">
                <Ticket className="w-4 h-4 mr-2" />
                Out-of-Section
              </Button>
            </Link>
          </div>
        </div>

        {/* Month Navigation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousMonth}
                  className="h-8 w-8 p-0 bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2">
                  <Select value={selectedMonth.toString()} onValueChange={handleMonthChange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((month, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
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
                </div>

                <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0 bg-transparent">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {!isCurrentMonth && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateToMonth(currentYear, new Date().getMonth() + 1)}
                  >
                    Current Month
                  </Button>
                )}
                <Badge variant={isCurrentMonth ? "default" : "secondary"}>
                  {monthNames[selectedMonth - 1]} {selectedYear}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

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

        {/* Summary Cards - These will now update based on selected month */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Forms ({monthNames[selectedMonth - 1]})</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalForms ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                Total forms submitted in {monthNames[selectedMonth - 1]} {selectedYear}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Service Checks ({monthNames[selectedMonth - 1]})
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalChecks ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                Service checks from {monthNames[selectedMonth - 1]} {selectedYear} forms
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Checks ({monthNames[selectedMonth - 1]})</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{getStatusCount("on-time")}</div>
              <p className="text-xs text-muted-foreground">
                GPS status on-time in {monthNames[selectedMonth - 1]} {selectedYear}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Early/Late Checks ({monthNames[selectedMonth - 1]})</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{getStatusCount("early") + getStatusCount("late")}</div>
              <p className="text-xs text-muted-foreground">
                GPS status early or late in {monthNames[selectedMonth - 1]} {selectedYear}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Routes and Stops */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 10 Routes */}
          <Card>
            <CardHeader>
              <CardTitle>
                Top 10 Routes ({monthNames[selectedMonth - 1]} {selectedYear})
              </CardTitle>
              <CardDescription>Most frequently inspected line or route numbers.</CardDescription>
            </CardHeader>
            <CardContent>
              {topRoutes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No route data for {monthNames[selectedMonth - 1]} {selectedYear}.
                </p>
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
              <CardTitle>
                Top 20 Stops ({monthNames[selectedMonth - 1]} {selectedYear})
              </CardTitle>
              <CardDescription>Most frequently inspected addresses of stops.</CardDescription>
            </CardHeader>
            <CardContent>
              {topStops.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No stop data for {monthNames[selectedMonth - 1]} {selectedYear}.
                </p>
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

        {/* Out-of-Section Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-orange-600" />
              Recent Out-Of-Section Tickets (Pasados) - {monthNames[selectedMonth - 1]} {selectedYear}
            </CardTitle>
            <CardDescription>
              Statistics for out-of-section tickets in {monthNames[selectedMonth - 1]} {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!oosStats ? (
              <div className="text-center py-8 text-gray-500">
                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>
                  No out-of-section data available for {monthNames[selectedMonth - 1]} {selectedYear}.
                </p>
                <Link href="/out-of-section">
                  <Button className="mt-4 bg-transparent" variant="outline">
                    Create Out-of-Section Form
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-sm text-blue-600">Total Forms</p>
                    <p className="text-2xl font-bold text-blue-900">{oosStats.totalForms}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-sm text-green-600">Total Passengers</p>
                    <p className="text-2xl font-bold text-green-900">{oosStats.totalPassengers}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <p className="text-sm text-purple-600">Total Passes</p>
                    <p className="text-2xl font-bold text-purple-900">{oosStats.totalPasses}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <p className="text-sm text-red-600">Total Out-of-Section</p>
                    <p className="text-2xl font-bold text-red-900">{oosStats.totalOOS}</p>
                  </div>
                </div>

                {/* Statistics by Category */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* By Place of Work */}
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-700">By Place of Work</h4>
                    {oosStats.byPlaceOfWork.length === 0 ? (
                      <p className="text-sm text-gray-500">No data available</p>
                    ) : (
                      <div className="space-y-2">
                        {oosStats.byPlaceOfWork.map((item, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-medium text-sm">{item.place}</p>
                            <div className="flex justify-between text-xs text-gray-600 mt-1">
                              <span>P: {item.passengers}</span>
                              <span>Passes: {item.passes}</span>
                              <span>OOS: {item.oos}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* By Line Route */}
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-700">By Line Route</h4>
                    {oosStats.byLineRoute.length === 0 ? (
                      <p className="text-sm text-gray-500">No data available</p>
                    ) : (
                      <div className="space-y-2">
                        {oosStats.byLineRoute.map((item, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-medium text-sm">{item.route}</p>
                            <div className="flex justify-between text-xs text-gray-600 mt-1">
                              <span>P: {item.passengers}</span>
                              <span>Passes: {item.passes}</span>
                              <span>OOS: {item.oos}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* By Route Branch */}
                  <div>
                    <h4 className="font-semibold mb-3 text-gray-700">By Route Branch</h4>
                    {oosStats.byRouteBranch.length === 0 ? (
                      <p className="text-sm text-gray-500">No data available</p>
                    ) : (
                      <div className="space-y-2">
                        {oosStats.byRouteBranch.map((item, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <p className="font-medium text-sm">{item.branch}</p>
                            <div className="flex justify-between text-xs text-gray-600 mt-1">
                              <span>P: {item.passengers}</span>
                              <span>Passes: {item.passes}</span>
                              <span>OOS: {item.oos}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
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
                <p className="text-gray-600">Date: {formatDate(formToDelete.date)}</p>
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
