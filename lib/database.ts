import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is NOT set.")
  throw new Error("DATABASE_URL environment variable is not set")
} else {
  console.log("DATABASE_URL environment variable is set.")
}

export const sql = neon(process.env.DATABASE_URL)

// Types for our database entities
export interface DailyInspectionFormDB {
  id: number
  title: string
  inspector_name: string
  date: string
  place_of_work: string
  created_at: string
  updated_at: string
  service_checks_count?: number // Added for dashboard/calendar views
}

export interface ServiceCheckDB {
  id: number
  form_id: number
  line_or_route_number: string
  driver_name: string
  service_code: string
  fleet_coach_number: string
  exact_hour_of_arrival: string
  gps_minutes: number
  gps_status: "on-time" | "early" | "late"
  passengers_on_board: number
  passes_used: number
  address_of_stop: string
  observations: string | null
  non_compliance: boolean // Add this field
  created_at: string
}

export interface DailyInspectionFormWithChecks extends DailyInspectionFormDB {
  service_checks: ServiceCheckDB[]
}
