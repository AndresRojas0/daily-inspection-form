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
  nonCompliance: boolean // Add this field
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
  console.log("saveDailyInspectionForm: Function called with data:", JSON.stringify(formData, null, 2))
  try {
    // Validate required fields
    if (!formData.formHeader.inspectorName || !formData.formHeader.placeOfWork || !formData.formHeader.date) {
      console.error("Validation Error: Missing required form header fields")
      throw new Error("Missing required form header fields")
    }

    if (formData.serviceChecks.length === 0) {
      console.error("Validation Error: At least one service check is required")
      throw new Error("At least one service check is required")
    }

    console.log("Attempting to insert daily_inspection_forms...")
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
      console.error("Database Error: Failed to create daily inspection form, no form returned.")
      throw new Error("Failed to create daily inspection form")
    }
    console.log("Daily inspection form inserted successfully with ID:", form.id)

    // Insert all service checks
    const serviceCheckPromises = formData.serviceChecks.map((check, index) => {
      // Validate required fields for each service check
      if (
        !check.lineOrRouteNumber ||
        !check.driverName ||
        !check.serviceCode ||
        !check.fleetCoachNumber ||
        !check.exactHourOfArrival ||
        !check.addressOfStop
      ) {
        console.error(`Validation Error: Missing required service check fields for check index ${index}`)
        throw new Error(`Missing required service check fields for service check #${index + 1}`)
      }

      console.log(`Attempting to insert service_check #${index + 1} for form ID ${form.id}:`, {
        lineOrRouteNumber: check.lineOrRouteNumber,
        driverName: check.driverName,
        serviceCode: check.serviceCode,
        fleetCoachNumber: check.fleetCoachNumber,
        exactHourOfArrival: check.exactHourOfArrival,
        gpsMinutes: check.gpsStatus.minutes,
        gpsStatus: check.gpsStatus.status,
        passengersOnBoard: check.passengersOnBoard,
        passesUsed: check.passesUsed,
        addressOfStop: check.addressOfStop,
        observations: check.observations,
        nonCompliance: check.nonCompliance,
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
        RETURNING id
      `
    })

    const insertedChecks = await Promise.all(serviceCheckPromises)
    console.log(`Successfully inserted ${insertedChecks.length} service checks.`)

    revalidatePath("/dashboard")
    revalidatePath("/calendar")
    console.log("revalidatePath called for /dashboard and /calendar")

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

export async function getDailyInspectionForms(limit = 50, offset = 0) {
  console.log(`getDailyInspectionForms: Fetching forms with limit ${limit}, offset ${offset}`)
  try {
    const forms = (await sql`
      SELECT 
        f.*,
        COUNT(s.id)::integer as service_checks_count
      FROM daily_inspection_forms f
      LEFT JOIN service_checks s ON f.id = s.form_id
      GROUP BY f.id
      ORDER BY f.date DESC, f.created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `) as DailyInspectionFormDB[]

    console.log(`getDailyInspectionForms: Found ${forms.length} forms.`)
    return {
      success: true,
      data: forms,
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
  console.log(`getDailyInspectionFormsForCalendar: Fetching forms for range ${startDate} to ${endDate}`)
  try {
    let forms

    if (startDate && endDate) {
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
    console.log(`getDailyInspectionFormsForCalendar: Found ${forms.length} forms.`)
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
  console.log(`getDailyInspectionFormById: Fetching form with ID ${id}`)
  try {
    const [form] = (await sql`
      SELECT * FROM daily_inspection_forms WHERE id = ${id}
    `) as DailyInspectionFormDB[]

    if (!form) {
      console.warn(`getDailyInspectionFormById: Form with ID ${id} not found.`)
      return {
        success: false,
        message: "Daily inspection form not found",
      }
    }
    console.log(`getDailyInspectionFormById: Found form with ID ${id}. Fetching service checks...`)

    const serviceChecks = (await sql`
      SELECT * FROM service_checks 
      WHERE form_id = ${id} 
      ORDER BY created_at ASC
    `) as ServiceCheckDB[]

    console.log(`getDailyInspectionFormById: Found ${serviceChecks.length} service checks for form ID ${id}.`)

    const formWithChecks: DailyInspectionFormWithChecks = {
      ...form,
      service_checks: serviceChecks,
    }

    return {
      success: true,
      data: formWithChecks,
    }
  } catch (error) {
    console.error(`Error fetching daily inspection form with ID ${id}:`, error)
    return {
      success: false,
      message: "Failed to fetch daily inspection form",
    }
  }
}

export async function deleteDailyInspectionForm(id: number) {
  console.log(`deleteDailyInspectionForm: Attempting to delete form with ID ${id}`)
  try {
    // Delete associated service checks first due to foreign key constraint
    await sql`
      DELETE FROM service_checks WHERE form_id = ${id}
    `
    console.log(`Deleted service checks for form ID ${id}.`)

    const result = await sql`
      DELETE FROM daily_inspection_forms WHERE id = ${id}
    `
    console.log(`Deleted daily inspection form with ID ${id}. Rows affected: ${result.count}`)

    revalidatePath("/dashboard")
    revalidatePath("/calendar")
    console.log("revalidatePath called for /dashboard and /calendar after deletion")

    return {
      success: true,
      message: "Daily inspection form deleted successfully",
    }
  } catch (error) {
    console.error(`Error deleting daily inspection form with ID ${id}:`, error)
    return {
      success: false,
      message: "Failed to delete daily inspection form",
    }
  }
}

export async function getInspectionStats() {
  console.log("getInspectionStats: Fetching inspection statistics...")
  try {
    const [totalForms] = await sql`
      SELECT COUNT(*) as count FROM daily_inspection_forms
    `

    const [totalChecks] = await sql`
      SELECT COUNT(*) as count FROM service_checks
    `

    const [recentForms] = await sql`
      SELECT COUNT(*) as count FROM daily_inspection_forms 
      WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    `

    const statusStats = await sql`
      SELECT 
        gps_status,
        COUNT(*) as count
      FROM service_checks 
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY gps_status
    `
    console.log("getInspectionStats: Statistics fetched successfully.")
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

// Add a debug function to check if we have any data
export async function debugDatabaseData() {
  console.log("debugDatabaseData: Checking database data...")
  try {
    const forms = await sql`SELECT COUNT(*) as count FROM daily_inspection_forms`
    const checks = await sql`SELECT COUNT(*) as count FROM service_checks`
    const sampleForms = await sql`SELECT * FROM daily_inspection_forms LIMIT 5`

    console.log("debugDatabaseData: Data check complete.")
    return {
      success: true,
      data: {
        formsCount: forms[0].count,
        checksCount: checks[0].count,
        sampleForms: sampleForms,
      },
    }
  } catch (error) {
    console.error("Error in debugDatabaseData:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
