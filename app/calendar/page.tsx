import { getDailyInspectionFormsForCalendar } from "@/lib/actions"
import { CalendarView } from "@/components/calendar-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function CalendarPage() {
  // Get forms for the current year (you can adjust this range as needed)
  const currentYear = new Date().getFullYear()
  const startDate = `${currentYear}-01-01`
  const endDate = `${currentYear}-12-31`

  const formsResult = await getDailyInspectionFormsForCalendar(startDate, endDate)
  const forms = formsResult.success ? formsResult.data : []

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendar View</h1>
              <p className="text-gray-600">Visual overview of daily inspection forms</p>
            </div>
          </div>
          <Link href="/">
            <Button>New Inspection</Button>
          </Link>
        </div>

        {/* Calendar Component */}
        <CalendarView forms={forms} />
      </div>
    </div>
  )
}
