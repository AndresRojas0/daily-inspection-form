import { getDailyInspectionForms, getInspectionStats } from "@/lib/actions"
import { DashboardClient } from "@/components/dashboard-client"

export default async function Dashboard() {
  const [formsResult, statsResult] = await Promise.all([getDailyInspectionForms(20), getInspectionStats()])

  const forms = formsResult.success ? formsResult.data : []
  const stats = statsResult.success ? statsResult.data : null

  return <DashboardClient initialForms={forms} initialStats={stats} />
}
