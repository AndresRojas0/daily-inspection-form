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
    lineOrRouteNumber: string
    direction: string
    totalOfServices: number
    totalOfPassengers: number
    totalOfNonCompliance: number
    totalOfPasses: number
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

export async function getInspectionStats() {
  try {
    const [totalForms] = await sql`
      SELECT COUNT(*) as count FROM daily_inspection_forms
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
    `

    // Modified query to count service checks only from forms in the current month
    const [totalChecks] = await sql`
      SELECT COUNT(s.*) as count 
      FROM service_checks s
      INNER JOIN daily_inspection_forms f ON s.form_id = f.id
      WHERE f.date >= DATE_TRUNC('month', CURRENT_DATE)
    `

    const [recentForms] = await sql`
      SELECT COUNT(*) as count FROM daily_inspection_forms 
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    `

    const statusStats = await sql`
      SELECT 
        s.gps_status,
        COUNT(*) as count
      FROM service_checks s
      INNER JOIN daily_inspection_forms f ON s.form_id = f.id
      WHERE f.date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY s.gps_status
    `

    return {
      success: true,
      data: {
        totalForms: Number.parseInt(totalForms.count),
        totalChecks: Number.parseInt(totalChecks.count),
        recentForms: Number.parseInt(recentForms.count),
        statusStats: statusStats.map((stat) => ({
          status: stat.gps_status,
          count: Number.parseInt(stat.count),
        })),
      },
    }
  } catch (error) {
    console.error("Error fetching inspection stats:", error)
    return {
      success: false,
      message: "Failed to fetch inspection statistics",
    }
  }
}

export async function saveInspectionForm(formData: any) {
  try {
    console.log("Saving inspection form:", formData)

    // Insert the main form
    const formResult = await sql`
      INSERT INTO daily_inspections (
        inspector_name, date, place_of_work, line_or_route_number, direction,
        total_of_services, total_of_passengers, total_of_non_compliance, total_of_passes
      ) VALUES (
        ${formData.formHeader.inspectorName},
        ${formData.formHeader.date},
        ${formData.formHeader.placeOfWork},
        ${formData.formHeader.lineOrRouteNumber},
        ${formData.formHeader.direction},
        ${formData.formHeader.totalOfServices},
        ${formData.formHeader.totalOfPassengers},
        ${formData.formHeader.totalOfNonCompliance},
        ${formData.formHeader.totalOfPasses}
      ) RETURNING id
    `

    const formId = formResult[0].id

    // Insert service checks
    for (const check of formData.serviceChecks) {
      await sql`
        INSERT INTO service_checks (
          form_id, service_code, line_route_branch, exact_hour_of_schedule,
          gps_minutes, gps_seconds, gps_status, passengers_on_board,
          non_compliance_tickets, passes_used, observations
        ) VALUES (
          ${formId},
          ${check.serviceCode},
          ${check.lineRouteBranch},
          ${check.exactHourOfSchedule},
          ${check.gpsStatus.minutes},
          ${check.gpsStatus.seconds},
          ${check.gpsStatus.status},
          ${check.passengersOnBoard},
          ${check.nonComplianceTickets},
          ${check.passesUsed},
          ${check.observations}
        )
      `
    }

    return { success: true, formId }
  } catch (error) {
    console.error("Error saving inspection form:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function getInspectionForms() {
  try {
    const forms = await sql`
      SELECT 
        id,
        inspector_name,
        date,
        place_of_work,
        line_or_route_number,
        direction,
        total_of_services,
        total_of_passengers,
        total_of_non_compliance,
        total_of_passes,
        created_at
      FROM daily_inspections 
      ORDER BY date DESC, created_at DESC
    `

    return { success: true, forms }
  } catch (error) {
    console.error("Error fetching inspection forms:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function getInspectionFormById(id: number) {
  try {
    const forms = await sql`
      SELECT * FROM daily_inspections WHERE id = ${id}
    `

    if (forms.length === 0) {
      return { success: false, error: "Form not found" }
    }

    const serviceChecks = await sql`
      SELECT * FROM service_checks WHERE form_id = ${id} ORDER BY id
    `

    return {
      success: true,
      form: forms[0],
      serviceChecks,
    }
  } catch (error) {
    console.error("Error fetching inspection form:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function updateInspectionForm(id: number, formData: any) {
  try {
    console.log("Updating inspection form:", id, formData)

    // Update the main form
    await sql`
      UPDATE daily_inspections SET
        inspector_name = ${formData.formHeader.inspectorName},
        date = ${formData.formHeader.date},
        place_of_work = ${formData.formHeader.placeOfWork},
        line_or_route_number = ${formData.formHeader.lineOrRouteNumber},
        direction = ${formData.formHeader.direction},
        total_of_services = ${formData.formHeader.totalOfServices},
        total_of_passengers = ${formData.formHeader.totalOfPassengers},
        total_of_non_compliance = ${formData.formHeader.totalOfNonCompliance},
        total_of_passes = ${formData.formHeader.totalOfPasses}
      WHERE id = ${id}
    `

    // Delete existing service checks
    await sql`DELETE FROM service_checks WHERE form_id = ${id}`

    // Insert updated service checks
    for (const check of formData.serviceChecks) {
      await sql`
        INSERT INTO service_checks (
          form_id, service_code, line_route_branch, exact_hour_of_schedule,
          gps_minutes, gps_seconds, gps_status, passengers_on_board,
          non_compliance_tickets, passes_used, observations
        ) VALUES (
          ${id},
          ${check.serviceCode},
          ${check.lineRouteBranch},
          ${check.exactHourOfSchedule},
          ${check.gpsStatus.minutes},
          ${check.gpsStatus.seconds},
          ${check.gpsStatus.status},
          ${check.passengersOnBoard},
          ${check.nonComplianceTickets},
          ${check.passesUsed},
          ${check.observations}
        )
      `
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating inspection form:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function deleteInspectionForm(id: number) {
  try {
    // Delete service checks first (foreign key constraint)
    await sql`DELETE FROM service_checks WHERE form_id = ${id}`

    // Delete the main form
    await sql`DELETE FROM daily_inspections WHERE id = ${id}`

    return { success: true }
  } catch (error) {
    console.error("Error deleting inspection form:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function getCalendarForms(year?: number, month?: number) {
  try {
    let query = `
      SELECT 
        'daily-inspection' as form_type,
        id,
        inspector_name,
        date,
        place_of_work,
        line_or_route_number,
        direction,
        total_of_services,
        total_of_passengers,
        total_of_non_compliance as total_issues,
        total_of_passes,
        created_at
      FROM daily_inspections
    `

    const params: any[] = []

    if (year && month) {
      query += ` WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`
      params.push(year, month)
    } else if (year) {
      query += ` WHERE EXTRACT(YEAR FROM date) = $1`
      params.push(year)
    }

    query += ` ORDER BY date DESC, created_at DESC`

    const dailyForms = await sql(query, params)

    // Get out-of-section forms
    let oosQuery = `
      SELECT 
        'out-of-section' as form_type,
        id,
        inspector_name,
        date,
        place_of_work,
        line_or_route_number,
        direction,
        total_of_services,
        total_of_passengers,
        total_of_oos as total_issues,
        total_of_passes,
        created_at
      FROM out_of_section_inspections
    `

    if (year && month) {
      oosQuery += ` WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`
    } else if (year) {
      oosQuery += ` WHERE EXTRACT(YEAR FROM date) = $1`
    }

    oosQuery += ` ORDER BY date DESC, created_at DESC`

    const oosForms = await sql(oosQuery, params)

    // Combine and sort all forms
    const allForms = [...dailyForms, ...oosForms].sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      return dateB.getTime() - dateA.getTime()
    })

    return { success: true, forms: allForms }
  } catch (error) {
    console.error("Error fetching calendar forms:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
