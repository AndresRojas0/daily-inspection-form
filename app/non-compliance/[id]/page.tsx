import { getNonComplianceReportById } from "@/lib/actions"
import { NonComplianceDetailClient } from "@/components/non-compliance-detail-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function NonComplianceDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id)
  const reportResult = await getNonComplianceReportById(id)

  if (!reportResult.success || !reportResult.data) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {reportResult.message || "Failed to load the non-compliance report."}
            <div className="mt-4">
              <Link href="/non-compliance">
                <Button variant="outline">Back to Reports</Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <NonComplianceDetailClient report={reportResult.data} />
}
