import { getNonComplianceReports } from "@/lib/actions"
import { NonComplianceClient } from "@/components/non-compliance-client"

export default async function NonCompliancePage({
  searchParams,
}: {
  searchParams?: {
    status?: string
  }
}) {
  const status = searchParams?.status || "all"
  const reportsResult = await getNonComplianceReports(status)

  const reports = reportsResult.success ? reportsResult.data : []

  return <NonComplianceClient initialReports={reports} initialStatus={status} />
}
