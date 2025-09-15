"use server"

import { sql } from "./database"
import { revalidatePath } from "next/cache"

// Database interfaces for Out-of-Section forms
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

// Interface for the form data from the frontend
interface ServiceCheckInput {
  serviceCode: string
  lineRouteBranch: string
  exactHourOfSchedule: string
  gpsStatus: {
    minutes: number
    seconds: number
    status: "on-time" | "early" | "late"
  }
  passengersOnBoard: number
  outOfSectionTickets: number
  passesUsed: number
  observations: string
}

interface OutOfSectionFormInput {
  formHeader: {
    title: string
    inspectorName: string
    date: string
    placeOfWork: string
    lineOrRouteNumber: string
    direction: string
    totalOfServices: number
    totalOfPassengers: number
    totalOfOOS: number
    totalOfPasses: number
  }
  serviceChecks: ServiceCheckInput[]
}

export async function saveOutOfSectionForm(formData: OutOfSectionFormInput) {
  try {
    console.log("=== SAVE OUT-OF-SECTION FORM DEBUG ===")
    console.log("Form data received:", JSON.stringify(formData, null, 2))

    // Check if tables exist first
    try {
      const tableCheck = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('out_of_section_forms', 'out_of_section_service_checks')
      `
      console.log(
        "Tables found:",
        tableCheck.map((t) => t.table_name),
      )

      if (tableCheck.length !== 2) {
        throw new Error(
          `Missing out-of-section tables. Found: ${tableCheck.map((t) => t.table_name).join(", ")}. Please run the database setup script or visit /debug-out-of-section to create tables.`,
        )
      }
    } catch (tableError) {
      console.error("Table check error:", tableError)
      throw new Error(
        `Database table check failed: ${tableError instanceof Error ? tableError.message : "Unknown error"}`,
      )
    }

    // Validate required fields
    if (
      !formData.formHeader.inspectorName ||
      !formData.formHeader.placeOfWork ||
      !formData.formHeader.date ||
      !formData.formHeader.lineOrRouteNumber ||
      !formData.formHeader.direction
    ) {
      throw new Error("Missing required form header fields")
    }

    if (formData.serviceChecks.length === 0) {
      throw new Error("At least one service check is required")
    }

    console.log("Validation passed, inserting form...")

    // Insert the main form first
    const [form] = (await sql`
      INSERT INTO out_of_section_forms (
        title, inspector_name, date, place_of_work, line_or_route_number, direction,
        total_of_services, total_of_passengers, total_of_oos, total_of_passes
      ) VALUES (
        ${formData.formHeader.title},
        ${formData.formHeader.inspectorName},
        ${formData.formHeader.date},
        ${formData.formHeader.placeOfWork},
        ${formData.formHeader.lineOrRouteNumber},
        ${formData.formHeader.direction},
        ${formData.formHeader.totalOfServices},
        ${formData.formHeader.totalOfPassengers},
        ${formData.formHeader.totalOfOOS},
        ${formData.formHeader.totalOfPasses}
      )
      RETURNING *
    `) as OutOfSectionFormDB[]

    if (!form) {
      throw new Error("Failed to create out-of-section form")
    }

    console.log("Form created with ID:", form.id)

    // Insert service checks (only those with service codes)
    const filledServiceChecks = formData.serviceChecks.filter(
      (check) => check.serviceCode && check.serviceCode.trim() !== "",
    )

    console.log("Filled service checks to insert:", filledServiceChecks.length)

    if (filledServiceChecks.length > 0) {
      const serviceCheckPromises = filledServiceChecks.map((check, index) => {
        console.log(`Inserting service check ${index + 1}:`, check)
        return sql`
          INSERT INTO out_of_section_service_checks (
            form_id, service_code, line_route_branch, exact_hour_of_schedule,
            gps_minutes, gps_seconds, gps_status, passengers_on_board,
            out_of_section_tickets, passes_used, observations
          ) VALUES (
            ${form.id},
            ${check.serviceCode},
            ${check.lineRouteBranch || ""},
            ${check.exactHourOfSchedule || "00:00:00"},
            ${check.gpsStatus.minutes},
            ${check.gpsStatus.seconds},
            ${check.gpsStatus.status},
            ${check.passengersOnBoard},
            ${check.outOfSectionTickets},
            ${check.passesUsed},
            ${check.observations || null}
          )
          RETURNING *
        `
      })

      await Promise.all(serviceCheckPromises)
      console.log("All service checks inserted successfully")
    }

    revalidatePath("/out-of-section")
    revalidatePath("/dashboard")

    console.log("=== SAVE COMPLETED SUCCESSFULLY ===")

    return {
      success: true,
      message: "Out-of-section form saved successfully",
      formId: form.id,
    }
  } catch (error) {
    console.error("=== SAVE ERROR ===")
    console.error("Error saving out-of-section form:", error)
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save out-of-section form",
    }
  }
}

export async function updateOutOfSectionForm(formId: number, formData: OutOfSectionFormInput) {
  try {
    // Validate required fields
    if (
      !formData.formHeader.inspectorName ||
      !formData.formHeader.placeOfWork ||
      !formData.formHeader.date ||
      !formData.formHeader.lineOrRouteNumber ||
      !formData.formHeader.direction
    ) {
      throw new Error("Missing required form header fields")
    }

    // Check if the form exists and was created today (in UTC-3)
    const [existingForm] = (await sql`
      SELECT * FROM out_of_section_forms WHERE id = ${formId}
    `) as OutOfSectionFormDB[]

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
      UPDATE out_of_section_forms 
      SET 
        title = ${formData.formHeader.title},
        inspector_name = ${formData.formHeader.inspectorName},
        date = ${formData.formHeader.date},
        place_of_work = ${formData.formHeader.placeOfWork},
        line_or_route_number = ${formData.formHeader.lineOrRouteNumber},
        direction = ${formData.formHeader.direction},
        total_of_services = ${formData.formHeader.totalOfServices},
        total_of_passengers = ${formData.formHeader.totalOfPassengers},
        total_of_oos = ${formData.formHeader.totalOfOOS},
        total_of_passes = ${formData.formHeader.totalOfPasses},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${formId}
    `

    // Delete existing service checks
    await sql`
      DELETE FROM out_of_section_service_checks WHERE form_id = ${formId}
    `

    // Insert updated service checks (only those with service codes)
    const filledServiceChecks = formData.serviceChecks.filter(
      (check) => check.serviceCode && check.serviceCode.trim() !== "",
    )

    if (filledServiceChecks.length > 0) {
      const serviceCheckPromises = filledServiceChecks.map((check) => {
        return sql`
          INSERT INTO out_of_section_service_checks (
            form_id, service_code, line_route_branch, exact_hour_of_schedule,
            gps_minutes, gps_seconds, gps_status, passengers_on_board,
            out_of_section_tickets, passes_used, observations
          ) VALUES (
            ${formId},
            ${check.serviceCode},
            ${check.lineRouteBranch || ""},
            ${check.exactHourOfSchedule || "00:00:00"},
            ${check.gpsStatus.minutes},
            ${check.gpsStatus.seconds},
            ${check.gpsStatus.status},
            ${check.passengersOnBoard},
            ${check.outOfSectionTickets},
            ${check.passesUsed},
            ${check.observations || null}
          )
          RETURNING *
        `
      })

      await Promise.all(serviceCheckPromises)
    }

    revalidatePath("/out-of-section")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: "Out-of-section form updated successfully",
      formId: formId,
    }
  } catch (error) {
    console.error("Error updating out-of-section form:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update out-of-section form",
    }
  }
}

export async function getOutOfSectionForms(limit = 50, offset = 0) {
  try {
    const forms = (await sql`
      SELECT * FROM out_of_section_forms 
      ORDER BY date DESC, created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `) as OutOfSectionFormDB[]

    return {
      success: true,
      data: forms,
    }
  } catch (error) {
    console.error("Error fetching out-of-section forms:", error)
    return {
      success: false,
      message: "Failed to fetch out-of-section forms",
      data: [],
    }
  }
}

export async function getOutOfSectionFormById(id: number) {
  try {
    const [form] = (await sql`
      SELECT * FROM out_of_section_forms WHERE id = ${id}
    `) as OutOfSectionFormDB[]

    if (!form) {
      return {
        success: false,
        message: "Out-of-section form not found",
      }
    }

    const serviceChecks = (await sql`
      SELECT * FROM out_of_section_service_checks 
      WHERE form_id = ${id} 
      ORDER BY exact_hour_of_schedule ASC
    `) as OutOfSectionServiceCheckDB[]

    const formWithChecks: OutOfSectionFormWithChecks = {
      ...form,
      service_checks: serviceChecks,
    }

    return {
      success: true,
      data: formWithChecks,
    }
  } catch (error) {
    console.error("Error fetching out-of-section form:", error)
    return {
      success: false,
      message: "Failed to fetch out-of-section form",
    }
  }
}

export async function deleteOutOfSectionForm(id: number) {
  try {
    await sql`
      DELETE FROM out_of_section_forms WHERE id = ${id}
    `

    revalidatePath("/out-of-section")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: "Out-of-section form deleted successfully",
    }
  } catch (error) {
    console.error("Error deleting out-of-section form:", error)
    return {
      success: false,
      message: "Failed to delete out-of-section form",
    }
  }
}
