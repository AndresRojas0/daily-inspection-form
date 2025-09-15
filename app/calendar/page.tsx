import { getDailyInspectionFormsForCalendar } from "@/lib/actions"
import { getOutOfSectionFormsForCalendar } from "@/lib/out-of-section-actions"
import { CalendarView } from "@/components/calendar-view"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function CalendarPage() {
  console.log("=== CALENDAR PAGE DEBUG ===")
  console.log("Current year:", new Date().getFullYear())

  // Fetch ALL forms instead of limiting to current year
  const [formsResult, oosFormsResult] = await Promise.all([
    getDailyInspectionFormsForCalendar(),
    getOutOfSectionFormsForCalendar(),
  ])

  console.log("Daily inspection forms result:", formsResult)
  console.log("Out-of-section forms result:", oosFormsResult)

  const forms = formsResult.success ? formsResult.data : []
  const oosForms = oosFormsResult.success ? oosFormsResult.data : []

  // Log the years of the forms we found
  if (forms.length > 0) {
    const formYears = [...new Set(forms.map((form) => new Date(form.date + "T00:00:00").getFullYear()))]
    console.log("Years with daily inspection forms:", formYears.sort())
  }

  if (oosForms.length > 0) {
    const oosFormYears = [...new Set(oosForms.map((form) => new Date(form.date + "T00:00:00").getFullYear()))]
    console.log("Years with out-of-section forms:", oosFormYears.sort())
  }

  console.log("Final forms passed to CalendarView:", { forms: forms.length, oosForms: oosForms.length })
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
              <p className="text-gray-600">Visual overview of daily inspection forms and out-of-section tickets</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button>New Inspection</Button>
            </Link>
            <Link href="/out-of-section">
              <Button variant="outline">Out-of-Section</Button>
            </Link>
          </div>
        </div>

        {/* Debug Info Card */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Debug Information</h3>
          <p className="text-sm text-yellow-700">Current year: {new Date().getFullYear()}</p>
          <p className="text-sm text-yellow-700">Daily inspection forms fetched: {forms.length}</p>
          <p className="text-sm text-yellow-700">Out-of-section forms fetched: {oosForms.length}</p>
          <p className="text-sm text-yellow-700">Daily forms query success: {formsResult.success ? "Yes" : "No"}</p>
          <p className="text-sm text-yellow-700">OOS forms query success: {oosFormsResult.success ? "Yes" : "No"}</p>
          {!formsResult.success && <p className="text-sm text-red-700">Daily forms error: {formsResult.message}</p>}
          {!oosFormsResult.success && <p className="text-sm text-red-700">OOS forms error: {oosFormsResult.message}</p>}
        </div>

        {/* Calendar Component */}
        <CalendarView forms={forms} oosForms={oosForms} />
      </div>
    </div>
  )
}
