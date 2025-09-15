import { sql } from "@/lib/database"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, Database } from "lucide-react"

async function checkOutOfSectionTables() {
  try {
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('out_of_section_forms', 'out_of_section_service_checks')
    `

    return {
      success: true,
      tables: tables.map((t) => t.table_name),
      message: `Found ${tables.length} out-of-section tables`,
    }
  } catch (error) {
    return {
      success: false,
      message: `Error checking tables: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function checkOutOfSectionData() {
  try {
    const formsCount = await sql`SELECT COUNT(*) as count FROM out_of_section_forms`
    const checksCount = await sql`SELECT COUNT(*) as count FROM out_of_section_service_checks`

    return {
      success: true,
      formsCount: Number.parseInt(formsCount[0].count),
      checksCount: Number.parseInt(checksCount[0].count),
    }
  } catch (error) {
    return {
      success: false,
      message: `Error checking data: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

async function createTablesIfNotExist() {
  try {
    // Create tables using the same SQL as in the script
    await sql`
      CREATE TABLE IF NOT EXISTS out_of_section_forms (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL DEFAULT 'OUT-OF-SECTION TICKETS (PASADOS)',
          inspector_name VARCHAR(255) NOT NULL,
          date DATE NOT NULL,
          place_of_work VARCHAR(255) NOT NULL,
          line_or_route_number VARCHAR(100) NOT NULL,
          direction VARCHAR(50) NOT NULL,
          total_of_services INTEGER NOT NULL DEFAULT 0,
          total_of_passengers INTEGER NOT NULL DEFAULT 0,
          total_of_oos INTEGER NOT NULL DEFAULT 0,
          total_of_passes INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    await sql`
      CREATE TABLE IF NOT EXISTS out_of_section_service_checks (
          id SERIAL PRIMARY KEY,
          form_id INTEGER NOT NULL REFERENCES out_of_section_forms(id) ON DELETE CASCADE,
          service_code VARCHAR(100) NOT NULL,
          line_route_branch VARCHAR(100) NOT NULL,
          exact_hour_of_schedule TIME NOT NULL,
          gps_minutes INTEGER NOT NULL DEFAULT 0,
          gps_seconds INTEGER NOT NULL DEFAULT 0,
          gps_status VARCHAR(20) NOT NULL CHECK (gps_status IN ('on-time', 'early', 'late')),
          passengers_on_board INTEGER NOT NULL DEFAULT 0,
          out_of_section_tickets INTEGER NOT NULL DEFAULT 0,
          passes_used INTEGER NOT NULL DEFAULT 0,
          observations TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_out_of_section_forms_date ON out_of_section_forms(date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_out_of_section_forms_inspector ON out_of_section_forms(inspector_name)`
    await sql`CREATE INDEX IF NOT EXISTS idx_out_of_section_service_checks_form_id ON out_of_section_service_checks(form_id)`

    // Create trigger
    await sql`
      CREATE TRIGGER IF NOT EXISTS update_out_of_section_forms_updated_at 
          BEFORE UPDATE ON out_of_section_forms 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `

    return {
      success: true,
      message: "Out-of-section tables created successfully",
    }
  } catch (error) {
    return {
      success: false,
      message: `Error creating tables: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export default async function DebugOutOfSectionPage() {
  const tablesResult = await checkOutOfSectionTables()
  const dataResult = await checkOutOfSectionData()

  // If tables don't exist, try to create them
  let createResult = null
  if (!tablesResult.success || tablesResult.tables?.length !== 2) {
    createResult = await createTablesIfNotExist()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6" />
          <h1 className="text-3xl font-bold">Out-of-Section Database Debug</h1>
        </div>

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
                      <p className="mt-2 font-semibold">
                        ⚠️ Missing tables! Expected: out_of_section_forms, out_of_section_service_checks
                      </p>
                    )}
                  </div>
                ) : (
                  tablesResult.message
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Table Creation Result */}
        {createResult && (
          <Card>
            <CardHeader>
              <CardTitle>Table Creation</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className={createResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {createResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={createResult.success ? "text-green-800" : "text-red-800"}>
                  {createResult.message}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

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
                    <p className="text-sm text-blue-600">Out-of-Section Forms</p>
                    <p className="text-2xl font-bold text-blue-900">{dataResult.formsCount}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Service Checks</p>
                    <p className="text-2xl font-bold text-green-900">{dataResult.checksCount}</p>
                  </div>
                </div>
              </div>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{dataResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>1. If tables are missing, they should be created automatically above.</p>
              <p>2. If creation fails, you may need to run the SQL script manually.</p>
              <p>3. Check that your database connection has proper permissions.</p>
              <p>4. After tables are created, try the out-of-section form again.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
