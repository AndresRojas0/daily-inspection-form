import { getDailyInspectionFormsForCalendar } from "@/lib/actions"
import { CalendarView } from "@/components/calendar-view"

export default async function CalendarPage() {
  const result = await getDailyInspectionFormsForCalendar()
  const forms = result.success ? result.data : []

  // Log the forms received for debugging
  console.log("Calendar received forms:", forms)

  // Group forms by date for the calendar component
  const formsGroupedByDate = forms.reduce((acc: Record<string, any[]>, form: any) => {
    const dateKey = new Date(form.date).toDateString() // Use toDateString for consistent grouping
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(form)
    return acc
  }, {})

  // Log the grouped forms for debugging
  console.log("Forms grouped by date:", formsGroupedByDate)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold text-center text-blue-900">Inspection Calendar</h1>
        <p className="text-center text-gray-600">Visualize your daily inspection forms by date.</p>
        <CalendarView forms={formsGroupedByDate} />
      </div>
    </div>
  )
}
