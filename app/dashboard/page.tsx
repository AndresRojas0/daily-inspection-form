import { getDailyInspectionForms, getInspectionStats, getTopRoutes, getTopStops } from "@/lib/actions"
import { getOutOfSectionStats } from "@/lib/out-of-section-actions"
import { DashboardClient } from "@/components/dashboard-client"

interface DashboardProps {
  searchParams: { month?: string; year?: string }
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  // Parse month and year from search params, default to current month/year
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // JavaScript months are 0-indexed

  const selectedYear = searchParams.year ? Number.parseInt(searchParams.year) : currentYear
  const selectedMonth = searchParams.month ? Number.parseInt(searchParams.month) : currentMonth

  const [formsResult, statsResult, topRoutesResult, topStopsResult, oosStatsResult] = await Promise.all([
    getDailyInspectionForms(20),
    getInspectionStats(selectedYear, selectedMonth),
    getTopRoutes(10, selectedYear, selectedMonth), // Pass month/year parameters
    getTopStops(20, selectedYear, selectedMonth), // Pass month/year parameters
    getOutOfSectionStats(selectedYear, selectedMonth), // Pass month/year parameters
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
      selectedYear={selectedYear}
      selectedMonth={selectedMonth}
    />
  )
}
