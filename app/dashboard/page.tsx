import { getDailyInspectionForms, getInspectionStats } from "@/lib/actions"
import { DashboardClient } from "@/components/dashboard-client"

/**
 * Server Component:
 * – fetches data with Server Actions
 * – passes the data to the Client Component
 */
export default async function DashboardPage() {
  const [formsRes, statsRes] = await Promise.all([getDailyInspectionForms(20), getInspectionStats()])

  return (
    <DashboardClient
      initialForms={formsRes.success ? formsRes.data : []}
      initialStats={statsRes.success ? statsRes.data : null}
    />
  )
}
