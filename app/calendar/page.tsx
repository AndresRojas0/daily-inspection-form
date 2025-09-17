import { CalendarView } from "@/components/calendar-view"
import { getDailyInspectionFormsForCalendar } from "@/lib/actions"
import { getOutOfSectionFormsForCalendar } from "@/lib/out-of-section-actions"

export default async function CalendarPage() {
  // Fetch both types of forms for the calendar
  const [dailyInspectionResult, outOfSectionResult] = await Promise.all([
    getDailyInspectionFormsForCalendar(),
    getOutOfSectionFormsForCalendar(),
  ])

  const dailyInspectionForms = dailyInspectionResult.success ? dailyInspectionResult.data : []
  const outOfSectionForms = outOfSectionResult.success ? outOfSectionResult.data : []

  // Combine and format forms for calendar display
  const allForms = [
    ...dailyInspectionForms.map((form) => ({
      id: form.id,
      type: "daily-inspection" as const,
      date: form.date,
      inspector_name: form.inspector_name,
      place_of_work: form.place_of_work,
      service_checks_count: form.service_checks_count || 0,
    })),
    ...outOfSectionForms.map((form) => ({
      id: form.id,
      type: "out-of-section" as const,
      date: form.date,
      inspector_name: form.inspector_name,
      place_of_work: form.place_of_work,
      service_checks_count: form.total_of_services || 0,
    })),
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Calendar View</h1>
          <p className="text-gray-600">View and manage your inspection forms by date</p>
        </div>
        <CalendarView forms={allForms} />
      </div>
    </div>
  )
}
