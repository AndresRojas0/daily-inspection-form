import { sql } from "@/lib/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Database } from "lucide-react"

async function checkDatabaseConnection() {
  try {
    const result = await sql`SELECT 1 as test`
    return { success: true, message: "Database connection successful" }
  } catch (error) {
    return {
      success: false,
      message: `Database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function checkTables() {
  try {
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('daily_inspection_forms', 'service_checks')
    `

    return {
      success: true,
      tables: tables.map((t) => t.table_name),
      message: `Found ${tables.length} tables`,
    }
  } catch (error) {
    return {
      success: false,
      message: `Error checking tables: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function checkData() {
  try {
    const formsCount = await sql`SELECT COUNT(*) as count FROM daily_inspection_forms`
    const checksCount = await sql`SELECT COUNT(*) as count FROM service_checks`
    const sampleForms = await sql`SELECT * FROM daily_inspection_forms ORDER BY created_at DESC LIMIT 3`

    return {
      success: true,
      formsCount: Number.parseInt(formsCount[0].count),
      checksCount: Number.parseInt(checksCount[0].count),
      sampleForms: sampleForms,
    }
  } catch (error) {
    return {
      success: false,
      message: `Error checking data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export default async function DebugPage() {
  const connectionResult = await checkDatabaseConnection()
  const tablesResult = await checkTables()
  const dataResult = await checkData()

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Database Debug Information</h1>
        </div>

        {/* Database Connection */}
        <Card>
          <CardHeader>
            <CardTitle>Database Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={connectionResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {connectionResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={connectionResult.success ? "text-green-800" : "text-red-800"}>
                {connectionResult.message}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Tables Check */}
        <Card>
          <CardHeader>
            <CardTitle>Database Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className={tablesResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {tablesResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={tablesResult.success ? "text-green-800" : "text-red-800"}>
                {tablesResult.success ? (
                  <div>
                    <p>{tablesResult.message}</p>
                    <p className="mt-2">Tables found: {tablesResult.tables?.join(", ") || "None"}</p>
                    {tablesResult.tables?.length !== 2 && (
                      <p className="mt-2 font-semibold">⚠️ Missing tables! Please run the database setup script.</p>
                    )}
                  </div>
                ) : (
                  tablesResult.message
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Data Check */}
        <Card>
          <CardHeader>
            <CardTitle>Database Data</CardTitle>
          </CardHeader>
          <CardContent>
            {dataResult.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">Total Forms</p>
                    <p className="text-2xl font-bold text-blue-900">{dataResult.formsCount}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Total Service Checks</p>
                    <p className="text-2xl font-bold text-green-900">{dataResult.checksCount}</p>
                  </div>
                </div>

                {dataResult.formsCount === 0 ? (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      No forms found in database. Try creating a form first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div>
                    <h3 className="font-semibold mb-2">Recent Forms:</h3>
                    <div className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                      <pre>{JSON.stringify(dataResult.sampleForms, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{dataResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Check</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">DATABASE_URL:</span>{" "}
                <span className={process.env.DATABASE_URL ? "text-green-600" : "text-red-600"}>
                  {process.env.DATABASE_URL ? "✓ Set" : "✗ Not set"}
                </span>
              </p>
              {process.env.DATABASE_URL && (
                <p className="text-xs text-gray-500">
                  Connection string: {process.env.DATABASE_URL.substring(0, 50)}...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
