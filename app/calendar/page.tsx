import { Suspense } from "react"
import { CalendarView } from "@/components/calendar-view"
import { getCalendarForms } from "@/lib/actions"

export default async function CalendarPage() {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  console.log("Calendar page - fetching forms for:", { currentYear, currentMonth })

  // Fetch all forms (not limited to current month/year)
  const result = await getCalendarForms()

  console.log("Calendar page - forms result:", {
    success: result.success,
    formsCount: result.forms?.length || 0,
    error: result.error,
  })

  if (!result.success) {
    console.error("Failed to fetch calendar forms:", result.error)
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Calendar View</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading calendar data: {result.error}</p>
        </div>
      </div>
    )
  }

  const forms = result.forms || []

  console.log("Calendar page - rendering with forms:", forms.length)

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Calendar View</h1>
      <Suspense fallback={<div>Loading calendar...</div>}>
        <CalendarView initialForms={forms} initialYear={currentYear} initialMonth={currentMonth} />
      </Suspense>
    </div>
  )
}
