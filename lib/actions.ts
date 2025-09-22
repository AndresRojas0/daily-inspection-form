"use server"

import { sql, type DailyInspectionFormDB, type ServiceCheckDB, type DailyInspectionFormWithChecks } from "./database"
import { revalidatePath } from "next/cache"

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
    // Validate required fields
    if (!formData.formHeader.inspectorName || !formData.formHeader.placeOfWork || !formData.formHeader.date) {
      throw new Error("Missing required form header fields")
    }

    if (formData.serviceChecks.length === 0) {
      throw new Error("At least one service check is required")
    }

    // Start a transaction by inserting the main form first
    const [form] = (await sql`
      INSERT INTO daily_inspection_forms (
        title, inspector_name, date, place_of_work
      ) VALUES (
        ${formData.formHeader.title},
        ${formData.formHeader.inspectorName},
        ${formData.formHeader.date},
        ${formData.formHeader.placeOfWork}
      )
      RETURNING *
    `) as DailyInspectionFormDB[]

    if (!form) {
      throw new Error("Failed to create daily inspection form")
    }

    // Insert all service checks
    const serviceCheckPromises = formData.serviceChecks.map((check) => {
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

      console.log("Saving service check with observations:", {
        observations: check.observations,
        hasObservations: !!check.observations && check.observations.trim() !== "",
      })

      return sql`
        INSERT INTO service_checks (
          form_id, line_or_route_number, driver_name, service_code,
          fleet_coach_number, exact_hour_of_arrival, gps_minutes, gps_status,
          passengers_on_board, passes_used, address_of_stop, observations, non_compliance
        ) VALUES (
          ${form.id},
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
        RETURNING *
      `
    })

    await Promise.all(serviceCheckPromises)

    revalidatePath("/dashboard")
    revalidatePath("/calendar")

    return {
      success: true,
      message: "Daily inspection form saved successfully",
      formId: form.id,
    }
  } catch (error) {
    console.error("Error saving daily inspection form:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save daily inspection form",
    }
  }
}

export async function updateDailyInspectionForm(formId: number, formData: DailyInspectionFormInput) {
  try {
    // Validate required fields
    if (!formData.formHeader.inspectorName || !formData.formHeader.placeOfWork || !formData.formHeader.date) {
      throw new Error("Missing required form header fields")
    }

    if (formData.serviceChecks.length === 0) {
      throw new Error("At least one service check is required")
    }

    // Check if the form exists and was created today (in UTC-3)
    const [existingForm] = (await sql`
      SELECT * FROM daily_inspection_forms WHERE id = ${formId}
    `) as DailyInspectionFormDB[]

    if (!existingForm) {
      throw new Error("Form not found")
    }

    // Check if the form was created today in UTC-3 timezone
    const todayUTC3 = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    const formCreatedDateUTC3 = new Date(existingForm.created_at).toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    })

    if (formCreatedDateUTC3 !== todayUTC3) {
      throw new Error("Forms can only be edited on the day they were created")
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
    await sql`
      DELETE FROM service_checks WHERE form_id = ${formId}
    `

    // Insert updated service checks
    const serviceCheckPromises = formData.serviceChecks.map((check) => {
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

      return sql`
        INSERT INTO service_checks (
          form_id, line_or_route_number, driver_name, service_code,
          fleet_coach_number, exact_hour_of_arrival, gps_minutes, gps_status,
          passengers_on_board, passes_used, address_of_stop, observations, non_compliance
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
        RETURNING *
      `
    })

    await Promise.all(serviceCheckPromises)

    revalidatePath("/dashboard")
    revalidatePath("/calendar")
    revalidatePath(`/dashboard/${formId}`)

    return {
      success: true,
      message: "Daily inspection form updated successfully",
      formId: formId,
    }
  } catch (error) {
    console.error("Error updating daily inspection form:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update daily inspection form",
    }
  }
}

export async function getDailyInspectionForms(limit = 50, year?: number, month?: number) {
  try {
    console.log("getDailyInspectionForms called with:", { limit, year, month })

    let forms
    if (year && month) {
      // Create date range for the specific month/year
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`
      const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${(month + 1).toString().padStart(2, "0")}-01`

      console.log("Using date range:", { startDate, endDate })

      forms = await sql`
        SELECT * FROM daily_inspection_forms 
        WHERE date >= ${startDate}::date AND date < ${endDate}::date
        ORDER BY date DESC, created_at DESC 
        LIMIT ${limit}
      `
    } else {
      console.log("Using default query without date filter")
      forms = await sql`
        SELECT * FROM daily_inspection_forms 
        ORDER BY date DESC, created_at DESC 
        LIMIT ${limit}
      `
    }

    console.log(`Found ${forms.length} forms`)
    return {
      success: true,
      data: forms as DailyInspectionFormDB[],
    }
  } catch (error) {
    console.error("Error fetching daily inspection forms:", error)
    return {
      success: false,
      message: "Failed to fetch daily inspection forms",
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
          COUNT(s.id)::integer as service_checks_count
        FROM daily_inspection_forms f
        LEFT JOIN service_checks s ON f.id = s.form_id
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
          COUNT(s.id)::integer as service_checks_count
        FROM daily_inspection_forms f
        LEFT JOIN service_checks s ON f.id = s.form_id
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
    const result = await sql`
      DELETE FROM daily_inspection_forms WHERE id = ${id}
    `

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
      message: "Failed to delete daily inspection form",
    }
  }
}

export async function getInspectionStats(year?: number, month?: number) {
  try {
    console.log("=== getInspectionStats DEBUG ===")
    console.log("Input parameters:", { year, month })

    if (year && month) {
      // Create date range for the specific month/year
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`
      const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${(month + 1).toString().padStart(2, "0")}-01`

      console.log("Date range:", { startDate, endDate })

      // Get total forms count for the selected month
      const totalFormsResult = await sql`
        SELECT COUNT(*)::integer as count FROM daily_inspection_forms
        WHERE date >= ${startDate}::date AND date < ${endDate}::date
      `
      console.log("Total forms query result:", totalFormsResult)

      // Get total service checks count for the selected month
      const totalChecksResult = await sql`
        SELECT COUNT(s.*)::integer as count 
        FROM service_checks s
        INNER JOIN daily_inspection_forms f ON s.form_id = f.id
        WHERE f.date >= ${startDate}::date AND f.date < ${endDate}::date
      `
      console.log("Total checks query result:", totalChecksResult)

      // Get recent forms count (same as total for selected month)
      const recentFormsResult = await sql`
        SELECT COUNT(*)::integer as count FROM daily_inspection_forms 
        WHERE date >= ${startDate}::date AND date < ${endDate}::date
      `
      console.log("Recent forms query result:", recentFormsResult)

      // Get GPS status statistics for the selected month
      const statusStatsResult = await sql`
        SELECT 
          s.gps_status,
          COUNT(*)::integer as count
        FROM service_checks s
        INNER JOIN daily_inspection_forms f ON s.form_id = f.id
        WHERE f.date >= ${startDate}::date AND f.date < ${endDate}::date
        GROUP BY s.gps_status
        ORDER BY count DESC
      `
      console.log("Status stats query result:", statusStatsResult)

      const result = {
        success: true,
        data: {
          totalForms: totalFormsResult[0]?.count || 0,
          totalChecks: totalChecksResult[0]?.count || 0,
          recentForms: recentFormsResult[0]?.count || 0,
          statusStats: statusStatsResult.map((stat) => ({
            status: stat.gps_status,
            count: stat.count,
          })),
        },
      }

      console.log("Final result:", result)
      console.log("=== getInspectionStats DEBUG END ===")
      return result
    }

    // Default to current month if no year/month specified
    console.log("Using current month default")

    const totalFormsResult = await sql`
      SELECT COUNT(*)::integer as count FROM daily_inspection_forms
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
    `

    const totalChecksResult = await sql`
      SELECT COUNT(s.*)::integer as count 
      FROM service_checks s
      INNER JOIN daily_inspection_forms f ON s.form_id = f.id
      WHERE f.date >= DATE_TRUNC('month', CURRENT_DATE)
    `

    const recentFormsResult = await sql`
      SELECT COUNT(*)::integer as count FROM daily_inspection_forms 
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    `

    const statusStatsResult = await sql`
      SELECT 
        s.gps_status,
        COUNT(*)::integer as count
      FROM service_checks s
      INNER JOIN daily_inspection_forms f ON s.form_id = f.id
      WHERE f.date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY s.gps_status
      ORDER BY count DESC
    `

    const result = {
      success: true,
      data: {
        totalForms: totalFormsResult[0]?.count || 0,
        totalChecks: totalChecksResult[0]?.count || 0,
        recentForms: recentFormsResult[0]?.count || 0,
        statusStats: statusStatsResult.map((stat) => ({
          status: stat.gps_status,
          count: stat.count,
        })),
      },
    }

    console.log("Default result:", result)
    console.log("=== getInspectionStats DEBUG END ===")
    return result
  } catch (error) {
    console.error("Error in getInspectionStats:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
    })

    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch inspection statistics",
      data: {
        totalForms: 0,
        totalChecks: 0,
        recentForms: 0,
        statusStats: [],
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

export async function getTopRoutes(limit = 10, year?: number, month?: number) {
  try {
    console.log("getTopRoutes called with:", { limit, year, month })

    if (year && month) {
      // Create date range for the specific month/year
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`
      const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${(month + 1).toString().padStart(2, "0")}-01`

      console.log("Top routes date range:", { startDate, endDate })

      const topRoutes = await sql`
        SELECT
          line_or_route_number,
          COUNT(*)::integer as count
        FROM service_checks s
        INNER JOIN daily_inspection_forms f ON s.form_id = f.id
        WHERE f.date >= ${startDate}::date AND f.date < ${endDate}::date
        GROUP BY line_or_route_number
        ORDER BY count DESC
        LIMIT ${limit}
      `

      console.log(`Found ${topRoutes.length} top routes for ${year}-${month}`)

      return {
        success: true,
        data: topRoutes.map((row) => ({
          lineOrRouteNumber: row.line_or_route_number,
          count: row.count,
        })),
      }
    }

    // Default to current month
    console.log("Using current month for top routes")
    const topRoutes = await sql`
      SELECT
        line_or_route_number,
        COUNT(*)::integer as count
      FROM service_checks s
      INNER JOIN daily_inspection_forms f ON s.form_id = f.id
      WHERE f.date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY line_or_route_number
      ORDER BY count DESC
      LIMIT ${limit}
    `

    return {
      success: true,
      data: topRoutes.map((row) => ({
        lineOrRouteNumber: row.line_or_route_number,
        count: row.count,
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

export async function getTopStops(limit = 20, year?: number, month?: number) {
  try {
    console.log("getTopStops called with:", { limit, year, month })

    if (year && month) {
      // Create date range for the specific month/year
      const startDate = `${year}-${month.toString().padStart(2, "0")}-01`
      const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${(month + 1).toString().padStart(2, "0")}-01`

      console.log("Top stops date range:", { startDate, endDate })

      const topStops = await sql`
        SELECT
          address_of_stop,
          COUNT(*)::integer as count
        FROM service_checks s
        INNER JOIN daily_inspection_forms f ON s.form_id = f.id
        WHERE f.date >= ${startDate}::date AND f.date < ${endDate}::date
        GROUP BY address_of_stop
        ORDER BY count DESC
        LIMIT ${limit}
      `

      console.log(`Found ${topStops.length} top stops for ${year}-${month}`)

      return {
        success: true,
        data: topStops.map((row) => ({
          addressOfStop: row.address_of_stop,
          count: row.count,
        })),
      }
    }

    // Default to current month
    console.log("Using current month for top stops")
    const topStops = await sql`
      SELECT
        address_of_stop,
        COUNT(*)::integer as count
      FROM service_checks s
      INNER JOIN daily_inspection_forms f ON s.form_id = f.id
      WHERE f.date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY address_of_stop
      ORDER BY count DESC
      LIMIT ${limit}
    `

    return {
      success: true,
      data: topStops.map((row) => ({
        addressOfStop: row.address_of_stop,
        count: row.count,
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
