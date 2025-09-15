import { getDailyInspectionForms, getInspectionStats, getTopRoutes, getTopStops } from "@/lib/actions"
import { getOutOfSectionStats } from "@/lib/out-of-section-actions"
import { DashboardClient } from "@/components/dashboard-client"

export default async function Dashboard() {
  const [formsResult, statsResult, topRoutesResult, topStopsResult, oosStatsResult] = await Promise.all([
    getDailyInspectionForms(20),
    getInspectionStats(),
    getTopRoutes(10), // Fetch top 10 routes
    getTopStops(20), // Fetch top 20 stops
    getOutOfSectionStats(), // Fetch out-of-section statistics
  ])

  const forms = formsResult.success ? formsResult.data : []
  const stats = statsResult.success ? statsResult.data : null
  const topRoutes = topRoutesResult.success ? topRoutesResult.data : []
  const topStops = topStopsResult.success ? topStopsResult.data : []
  const oosStats = oosStatsResult.success ? oosStatsResult.data : null

  return (
    <DashboardClient
      initialForms={forms}
      initialStats={stats}
      topRoutes={topRoutes}
      topStops={topStops}
      oosStats={oosStats}
    />
  )
}
