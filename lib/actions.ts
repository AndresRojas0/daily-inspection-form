"use server"

import { neon } from "@neondatabase/serverless"
import type { DailyInspectionFormDB, ServiceCheckDB, DailyInspectionFormWithChecks } from "./database"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

// Interface for the form data from the frontend
interface ServiceCheckInput {
  lineOrRouteNumber: string
  driverName: string
  serviceCode: string
  fleetCoachNumber: string
  exactHourOfArrival: string
  gpsStatus: {
    minutes: number
    status: "on-time" | "early" | "late"
  }
  passengersOnBoard: number
  passesUsed: number
  addressOfStop: string
  observations: string
  nonCompliance: boolean
}

interface DailyInspectionFormInput {
  formHeader: {
    title: string
    inspectorName: string
    date: string
    placeOfWork: string
  }
  serviceChecks: ServiceCheckInput[]
}

export async function saveDailyInspectionForm(formData: DailyInspectionFormInput) {
  try {
    console.log("Saving daily inspection form:", formData)

    // Validate required fields
    if (!formData.formHeader.inspectorName || !formData.formHeader.placeOfWork || !formData.formHeader.date) {
      throw new Error("Missing required form header fields")
    }

    if (formData.serviceChecks.length === 0) {
      throw new Error("At least one service check is required")
    }

    // Insert the main form
    const formResult = await sql`
      INSERT INTO daily_inspection_forms (
        title, inspector_name, date, place_of_work
      ) VALUES (
        ${formData.formHeader.title},
        ${formData.formHeader.inspectorName},
        ${formData.formHeader.date},
        ${formData.formHeader.placeOfWork}
      ) RETURNING id
    `

    const formId = formResult[0].id

    // Insert service checks
    for (const check of formData.serviceChecks) {
      // Validate required fields for each service check
      if (
        !check.lineOrRouteNumber ||
        !check.driverName ||
        !check.serviceCode ||
        !check.fleetCoachNumber ||
        !check.exactHourOfArrival ||
        !check.addressOfStop
      ) {
        throw new Error("Missing required service check fields")
      }

      await sql`
        INSERT INTO service_checks (
          form_id,
          line_or_route_number,
          driver_name,
          service_code,
          fleet_coach_number,
          exact_hour_of_arrival,
          gps_minutes,
          gps_status,
          passengers_on_board,
          passes_used,
          address_of_stop,
          observations,
          non_compliance
        ) VALUES (
          ${formId},
          ${check.lineOrRouteNumber},
          ${check.driverName},
          ${check.serviceCode},
          ${check.fleetCoachNumber},
          ${check.exactHourOfArrival},
          ${check.gpsStatus.minutes},
          ${check.gpsStatus.status},
          ${check.passengersOnBoard},
          ${check.passesUsed},
          ${check.addressOfStop},
          ${check.observations || null},
          ${check.nonCompliance || false}
        )
      `
    }

    revalidatePath("/dashboard")
    revalidatePath("/calendar")

    return {
      success: true,
      message: `Daily inspection form saved successfully with ID: ${formId}`,
      formId: formId,
    }
  } catch (error) {
    console.error("Error saving daily inspection form:", error)
    return {
      success: false,
      message: `Error saving form: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function updateDailyInspectionForm(formId: number, formData: DailyInspectionFormInput) {
  try {
    console.log("Updating daily inspection form:", formId, formData)

    // Validate required fields
    if (!formData.formHeader.inspectorName || !formData.formHeader.placeOfWork || !formData.formHeader.date) {
      throw new Error("Missing required form header fields")
    }

    if (formData.serviceChecks.length === 0) {
      throw new Error("At least one service check is required")
    }

    // Check if the form exists
    const [existingForm] = (await sql`
      SELECT * FROM daily_inspection_forms WHERE id = ${formId}
    `) as DailyInspectionFormDB[]

    if (!existingForm) {
      throw new Error("Form not found")
    }

    // Update the main form
    await sql`
      UPDATE daily_inspection_forms 
      SET 
        title = ${formData.formHeader.title},
        inspector_name = ${formData.formHeader.inspectorName},
        date = ${formData.formHeader.date},
        place_of_work = ${formData.formHeader.placeOfWork},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${formId}
    `

    // Delete existing service checks
    await sql`DELETE FROM service_checks WHERE form_id = ${formId}`

    // Insert updated service checks
    for (const check of formData.serviceChecks) {
      // Validate required fields for each service check
      if (
        !check.lineOrRouteNumber ||
        !check.driverName ||
        !check.serviceCode ||
        !check.fleetCoachNumber ||
        !check.exactHourOfArrival ||
        !check.addressOfStop
      ) {
        throw new Error("Missing required service check fields")
      }

      await sql`
        INSERT INTO service_checks (
          form_id,
          line_or_route_number,
          driver_name,
          service_code,
          fleet_coach_number,
          exact_hour_of_arrival,
          gps_minutes,
          gps_status,
          passengers_on_board,
          passes_used,
          address_of_stop,
          observations,
          non_compliance
        ) VALUES (
          ${formId},
          ${check.lineOrRouteNumber},
          ${check.driverName},
          ${check.serviceCode},
          ${check.fleetCoachNumber},
          ${check.exactHourOfArrival},
          ${check.gpsStatus.minutes},
          ${check.gpsStatus.status},
          ${check.passengersOnBoard},
          ${check.passesUsed},
          ${check.addressOfStop},
          ${check.observations || null},
          ${check.nonCompliance || false}
        )
      `
    }

    revalidatePath("/dashboard")
    revalidatePath("/calendar")
    revalidatePath(`/dashboard/${formId}`)

    return {
      success: true,
      message: `Daily inspection form updated successfully`,
    }
  } catch (error) {
    console.error("Error updating daily inspection form:", error)
    return {
      success: false,
      message: `Error updating form: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function getDailyInspectionForms(limit = 50, offset = 0) {
  try {
    console.log("Getting daily inspection forms with limit:", limit)

    const forms = (await sql`
      SELECT 
        f.*,
        COUNT(sc.id) as service_checks_count
      FROM daily_inspection_forms f
      LEFT JOIN service_checks sc ON f.id = sc.form_id
      GROUP BY f.id
      ORDER BY f.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as DailyInspectionFormDB[]

    return {
      success: true,
      data: forms,
    }
  } catch (error) {
    console.error("Error getting daily inspection forms:", error)
    return {
      success: false,
      message: `Error getting forms: ${error instanceof Error ? error.message : "Unknown error"}`,
      data: [],
    }
  }
}

export async function getDailyInspectionFormsForCalendar(startDate?: string, endDate?: string) {
  try {
    console.log("=== DATABASE ACTION DEBUG ===")
    console.log("getDailyInspectionFormsForCalendar called with:", { startDate, endDate })

    let forms

    if (startDate && endDate) {
      console.log("Using date range query")
      forms = await sql`
        SELECT 
          f.id,
          f.inspector_name,
          f.date,
          f.place_of_work,
          f.created_at,
          COUNT(sc.id)::integer as service_checks_count
        FROM daily_inspection_forms f
        LEFT JOIN service_checks sc ON f.id = sc.form_id
        WHERE f.date >= ${startDate} AND f.date <= ${endDate}
        GROUP BY f.id, f.inspector_name, f.date, f.place_of_work, f.created_at
        ORDER BY f.date DESC, f.created_at DESC
      `
    } else {
      console.log("Using query without date range")
      forms = await sql`
        SELECT 
          f.id,
          f.inspector_name,
          f.date,
          f.place_of_work,
          f.created_at,
          COUNT(sc.id)::integer as service_checks_count
        FROM daily_inspection_forms f
        LEFT JOIN service_checks sc ON f.id = sc.form_id
        GROUP BY f.id, f.inspector_name, f.date, f.place_of_work, f.created_at
        ORDER BY f.date DESC, f.created_at DESC
      `
    }

    console.log("Raw database result:", forms)
    console.log("Number of forms found:", forms.length)

    if (forms.length > 0) {
      console.log("Sample form:", forms[0])
    }

    console.log("=== DATABASE ACTION DEBUG END ===")

    return {
      success: true,
      data: forms,
    }
  } catch (error) {
    console.error("Error fetching daily inspection forms for calendar:", error)
    return {
      success: false,
      message: "Failed to fetch daily inspection forms",
      data: [],
    }
  }
}

export async function getDailyInspectionFormById(id: number) {
  try {
    const [form] = (await sql`
      SELECT * FROM daily_inspection_forms WHERE id = ${id}
    `) as DailyInspectionFormDB[]

    if (!form) {
      return {
        success: false,
        message: "Daily inspection form not found",
      }
    }

    // Order service checks by exact_hour_of_arrival
    const serviceChecks = (await sql`
      SELECT * FROM service_checks 
      WHERE form_id = ${id} 
      ORDER BY exact_hour_of_arrival ASC
    `) as ServiceCheckDB[]

    const formWithChecks: DailyInspectionFormWithChecks = {
      ...form,
      service_checks: serviceChecks,
    }

    return {
      success: true,
      data: formWithChecks,
    }
  } catch (error) {
    console.error("Error fetching daily inspection form:", error)
    return {
      success: false,
      message: "Failed to fetch daily inspection form",
    }
  }
}

export async function deleteDailyInspectionForm(id: number) {
  try {
    console.log("Deleting daily inspection form with ID:", id)

    // Delete service checks first (foreign key constraint)
    await sql`DELETE FROM service_checks WHERE form_id = ${id}`

    // Delete the main form
    const result = await sql`DELETE FROM daily_inspection_forms WHERE id = ${id} RETURNING id`

    if (result.length === 0) {
      return {
        success: false,
        message: "Form not found",
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/calendar")

    return {
      success: true,
      message: "Daily inspection form deleted successfully",
    }
  } catch (error) {
    console.error("Error deleting daily inspection form:", error)
    return {
      success: false,
      message: `Error deleting form: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function getDashboardStats() {
  try {
    console.log("Getting dashboard statistics")

    // Get total forms count
    const totalFormsResult = await sql`
      SELECT COUNT(*) as count FROM daily_inspection_forms
    `
    const totalForms = Number.parseInt(totalFormsResult[0].count) || 0

    // Get forms this month
    const thisMonthResult = await sql`
      SELECT COUNT(*) as count 
      FROM daily_inspection_forms 
      WHERE DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
    `
    const formsThisMonth = Number.parseInt(thisMonthResult[0].count) || 0

    // Get GPS status counts
    const gpsStatusResult = await sql`
      SELECT 
        gps_status,
        COUNT(*) as count
      FROM service_checks 
      WHERE gps_status IS NOT NULL
      GROUP BY gps_status
    `

    const gpsStats = {
      "on-time": 0,
      early: 0,
      late: 0,
    }

    gpsStatusResult.forEach((row) => {
      const status = row.gps_status as keyof typeof gpsStats
      if (status in gpsStats) {
        gpsStats[status] = Number.parseInt(row.count) || 0
      }
    })

    // Get non-compliance count
    const nonComplianceResult = await sql`
      SELECT COUNT(*) as count 
      FROM service_checks 
      WHERE non_compliance = true
    `
    const nonComplianceCount = Number.parseInt(nonComplianceResult[0].count) || 0

    // Get total service checks
    const totalServiceChecksResult = await sql`
      SELECT COUNT(*) as count FROM service_checks
    `
    const totalServiceChecks = Number.parseInt(totalServiceChecksResult[0].count) || 0

    return {
      success: true,
      data: {
        totalForms,
        formsThisMonth,
        gpsStats,
        nonComplianceCount,
        totalServiceChecks,
      },
    }
  } catch (error) {
    console.error("Error getting dashboard stats:", error)
    return {
      success: false,
      message: `Error getting dashboard stats: ${error instanceof Error ? error.message : "Unknown error"}`,
      data: {
        totalForms: 0,
        formsThisMonth: 0,
        gpsStats: { "on-time": 0, early: 0, late: 0 },
        nonComplianceCount: 0,
        totalServiceChecks: 0,
      },
    }
  }
}

// Add a debug function to check if we have any data
export async function debugDatabaseData() {
  try {
    const forms = await sql`SELECT COUNT(*) as count FROM daily_inspection_forms`
    const checks = await sql`SELECT COUNT(*) as count FROM service_checks`
    const sampleForms = await sql`SELECT * FROM daily_inspection_forms LIMIT 5`

    return {
      success: true,
      data: {
        formsCount: forms[0].count,
        checksCount: checks[0].count,
        sampleForms: sampleForms,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function getTopRoutes(limit = 10) {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const topRoutes = await sql`
      SELECT
        line_or_route_number,
        COUNT(*) as count
      FROM service_checks
      WHERE created_at >= ${startOfMonth.toISOString()} AND created_at < ${startOfNextMonth.toISOString()}
      GROUP BY line_or_route_number
      ORDER BY count DESC
      LIMIT ${limit}
    `

    return {
      success: true,
      data: topRoutes.map((row) => ({
        lineOrRouteNumber: row.line_or_route_number,
        count: Number.parseInt(row.count),
      })),
    }
  } catch (error) {
    console.error("Error fetching top routes:", error)
    return {
      success: false,
      message: "Failed to fetch top routes",
      data: [],
    }
  }
}

export async function getTopStops(limit = 20) {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const topStops = await sql`
      SELECT
        address_of_stop,
        COUNT(*) as count
      FROM service_checks
      WHERE created_at >= ${startOfMonth.toISOString()} AND created_at < ${startOfNextMonth.toISOString()}
      GROUP BY address_of_stop
      ORDER BY count DESC
      LIMIT ${limit}
    `

    return {
      success: true,
      data: topStops.map((row) => ({
        addressOfStop: row.address_of_stop,
        count: Number.parseInt(row.count),
      })),
    }
  } catch (error) {
    console.error("Error fetching top stops:", error)
    return {
      success: false,
      message: "Failed to fetch top stops",
      data: [],
    }
  }
}
