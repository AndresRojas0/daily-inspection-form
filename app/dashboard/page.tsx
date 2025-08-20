import {
  getDailyInspectionForms,
  getInspectionStats,
  getTopRoutes,
  getTopStops,
  getNonComplianceStats,
} from "@/lib/actions"
import { DashboardClient } from "@/components/dashboard-client"

export default async function Dashboard() {
  const [formsResult, statsResult, topRoutesResult, topStopsResult, nonComplianceStatsResult] = await Promise.all([
    getDailyInspectionForms(20),
    getInspectionStats(),
    getTopRoutes(10),
    getTopStops(20),
    getNonComplianceStats(),
  ])

  const forms = formsResult.success ? formsResult.data : []
  const stats = statsResult.success ? statsResult.data : null
  const topRoutes = topRoutesResult.success ? topRoutesResult.data : []
  const topStops = topStopsResult.success ? topStopsResult.data : []
  const nonComplianceStats = nonComplianceStatsResult.success ? nonComplianceStatsResult.data : null

  return (
    <DashboardClient
      initialForms={forms}
      initialStats={stats}
      topRoutes={topRoutes}
      topStops={topStops}
      nonComplianceStats={nonComplianceStats}
    />
  )
}
