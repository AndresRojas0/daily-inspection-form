import { getDailyInspectionFormsForCalendar } from "@/lib/actions"
import { CalendarView } from "@/components/calendar-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function CalendarPage() {
  console.log("=== CALENDAR PAGE DEBUG ===")
  console.log("Current year:", new Date().getFullYear())

  // Fetch ALL forms instead of limiting to current year
  const formsResult = await getDailyInspectionFormsForCalendar()

  console.log("Forms result:", formsResult)
  console.log("Forms success:", formsResult.success)
  console.log("Forms data length:", formsResult.success ? formsResult.data.length : 0)

  const forms = formsResult.success ? formsResult.data : []

  // Log the years of the forms we found
  if (forms.length > 0) {
    const formYears = [...new Set(forms.map((form) => new Date(form.date + "T00:00:00").getFullYear()))]
    console.log("Years with forms:", formYears.sort())
    console.log(
      "Sample form dates:",
      forms.slice(0, 5).map((f) => ({ id: f.id, date: f.date })),
    )
  }

  console.log("Final forms passed to CalendarView:", forms)
  console.log("=== CALENDAR PAGE DEBUG END ===")

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

        {/* Debug Info Card */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Debug Information</h3>
          <p className="text-sm text-yellow-700">Current year: {new Date().getFullYear()}</p>
          <p className="text-sm text-yellow-700">Forms fetched: {forms.length}</p>
          <p className="text-sm text-yellow-700">Query success: {formsResult.success ? "Yes" : "No"}</p>
          {!formsResult.success && <p className="text-sm text-red-700">Error: {formsResult.message}</p>}
          {forms.length > 0 && (
            <>
              <p className="text-sm text-yellow-700">
                Years with forms:{" "}
                {[...new Set(forms.map((form) => new Date(form.date + "T00:00:00").getFullYear()))].sort().join(", ")}
              </p>
              <p className="text-sm text-yellow-700">
                Sample dates:{" "}
                {forms
                  .slice(0, 3)
                  .map((f) => `${f.id}:${f.date}`)
                  .join(", ")}
              </p>
            </>
          )}
        </div>

        {/* Calendar Component */}
        <CalendarView forms={forms} />
      </div>
    </div>
  )
}
