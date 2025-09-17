import { neon } from "@neondatabase/serverless"

// Use DATABASE_URL if available, otherwise fall back to POSTGRES_URL
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set")
}

export const sql = neon(databaseUrl)

// Types for our database entities
export interface DailyInspectionFormDB {
  id: number
  title: string
  inspector_name: string
  date: string
  place_of_work: string
  created_at: string
  updated_at: string
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
  non_compliance: boolean
  created_at: string
}

export interface DailyInspectionFormWithChecks extends DailyInspectionFormDB {
  service_checks: ServiceCheckDB[]
}

// Out-of-Section types
export interface OutOfSectionFormDB {
  id: number
  title: string
  inspector_name: string
  date: string
  place_of_work: string
  line_or_route_number: string
  direction: string
  total_of_services: number
  total_of_passengers: number
  total_of_oos: number
  total_of_passes: number
  created_at: string
  updated_at: string
}

export interface OutOfSectionServiceCheckDB {
  id: number
  form_id: number
  service_code: string
  line_route_branch: string
  exact_hour_of_schedule: string
  gps_minutes: number
  gps_seconds: number
  gps_status: "on-time" | "early" | "late"
  passengers_on_board: number
  out_of_section_tickets: number
  passes_used: number
  observations: string | null
  created_at: string
}

export interface OutOfSectionFormWithChecks extends OutOfSectionFormDB {
  service_checks: OutOfSectionServiceCheckDB[]
}
