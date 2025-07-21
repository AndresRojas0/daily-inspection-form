import { getDailyInspectionForms, getInspectionStats } from "@/lib/actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AlertCircle, BarChart, FileText } from "lucide-react"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  const formsResult = await getDailyInspectionForms()
  const statsResult = await getInspectionStats()

  const forms = formsResult.success ? formsResult.data : []
  const stats = statsResult.success ? statsResult.data : null

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold text-center text-blue-900">Dashboard Overview</h1>

        {/* Stats Section */}
        {stats ? (
          <Card>
            <CardHeader>
              <CardTitle>Inspection Statistics</CardTitle>
              <CardDescription>Key metrics from your daily inspections.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Total Forms</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalForms}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Total Service Checks</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalChecks}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600">Forms Last 7 Days</p>
                <p className="text-2xl font-bold text-purple-900">{stats.recentForms}</p>
              </div>
              <div className="col-span-full space-y-2">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <BarChart className="w-4 h-4" /> GPS Status Distribution (Last 30 Days)
                </h3>
                {stats.statusStats.length > 0 ? (
                  stats.statusStats.map((stat) => (
                    <div key={stat.status} className="flex items-center gap-2">
                      <span className="w-20 text-sm capitalize">{stat.status}:</span>
                      <Progress value={(stat.count / stats.totalChecks) * 100} className="flex-1" />
                      <span className="text-sm font-medium">{stat.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No GPS data available for the last 30 days.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 text-center text-red-500">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p>Failed to load statistics. Please check database connection.</p>
            </CardContent>
          </Card>
        )}

        {/* Recent Forms Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Inspection Forms</CardTitle>
            <CardDescription>A list of your most recently submitted inspection forms.</CardDescription>
          </CardHeader>
          <CardContent>
            {forms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No inspection forms found.</p>
                <p className="text-sm">Start by submitting a new form from the home page.</p>
              </div>
            ) : (
              <DashboardClient initialForms={forms} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
