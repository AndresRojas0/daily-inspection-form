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
      }) // Add this debug log

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

export async function getDailyInspectionForms(limit = 50, offset = 0) {
  try {
    const forms = (await sql`
      SELECT * FROM daily_inspection_forms 
      ORDER BY date DESC, created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `) as DailyInspectionFormDB[]

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

    const serviceChecks = (await sql`
      SELECT * FROM service_checks 
      WHERE form_id = ${id} 
      ORDER BY created_at ASC
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

export async function getInspectionStats() {
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
