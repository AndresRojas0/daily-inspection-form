"use server"

import { neon } from "@neondatabase/serverless"
import { revalidatePath } from "next/cache"

const sql = neon(process.env.DATABASE_URL!)

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

// Interface for statistics
export interface OutOfSectionStats {
  totalForms: number
  totalPassengers: number
  totalPasses: number
  totalOOS: number
  byPlaceOfWork: {
    place: string
    passengers: number
    passes: number
    oos: number
  }[]
  byLineRoute: {
    route: string
    passengers: number
    passes: number
    oos: number
  }[]
  byRouteBranch: {
    branch: string
    passengers: number
    passes: number
    oos: number
  }[]
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

export async function getOutOfSectionFormsForCalendar(startDate?: string, endDate?: string) {
  try {
    console.log("=== OUT-OF-SECTION CALENDAR DEBUG ===")
    console.log("getOutOfSectionFormsForCalendar called with:", { startDate, endDate })

    let forms

    if (startDate && endDate) {
      console.log("Using date range query")
      forms = await sql`
        SELECT 
          f.id,
          f.inspector_name,
          f.date,
          f.place_of_work,
          f.line_or_route_number,
          f.direction,
          f.created_at,
          COUNT(sc.id)::integer as service_checks_count
        FROM out_of_section_forms f
        LEFT JOIN out_of_section_service_checks sc ON f.id = sc.form_id
        WHERE f.date >= ${startDate} AND f.date <= ${endDate}
        GROUP BY f.id, f.inspector_name, f.date, f.place_of_work, f.line_or_route_number, f.direction, f.created_at
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
          f.line_or_route_number,
          f.direction,
          f.created_at,
          COUNT(sc.id)::integer as service_checks_count
        FROM out_of_section_forms f
        LEFT JOIN out_of_section_service_checks sc ON f.id = sc.form_id
        GROUP BY f.id, f.inspector_name, f.date, f.place_of_work, f.line_or_route_number, f.direction, f.created_at
        ORDER BY f.date DESC, f.created_at DESC
      `
    }

    console.log("Raw database result:", forms)
    console.log("Number of out-of-section forms found:", forms.length)

    if (forms.length > 0) {
      console.log("Sample out-of-section form:", forms[0])
    }

    console.log("=== OUT-OF-SECTION CALENDAR DEBUG END ===")

    return {
      success: true,
      data: forms,
    }
  } catch (error) {
    console.error("Error fetching out-of-section forms for calendar:", error)
    return {
      success: false,
      message: "Failed to fetch out-of-section forms",
      data: [],
    }
  }
}

export async function saveOutOfSectionForm(formData: any) {
  try {
    console.log("Saving out-of-section form:", formData)

    // Insert the main form
    const formResult = await sql`
      INSERT INTO out_of_section_forms (
        inspector_name, 
        date, 
        place_of_work,
        line_or_route_number,
        direction,
        total_of_services,
        total_of_passengers,
        total_of_oos,
        total_of_passes
      ) VALUES (
        ${formData.formHeader.inspectorName},
        ${formData.formHeader.date},
        ${formData.formHeader.placeOfWork},
        ${formData.formHeader.lineOrRouteNumber},
        ${formData.formHeader.direction},
        ${formData.formHeader.totalOfServices},
        ${formData.formHeader.totalOfPassengers},
        ${formData.formHeader.totalOfOOS},
        ${formData.formHeader.totalOfPasses}
      ) RETURNING id
    `

    const formId = formResult[0].id

    // Insert service checks
    for (const check of formData.serviceChecks) {
      // Only insert service checks that have some data
      if (
        check.serviceCode ||
        check.lineRouteBranch ||
        check.exactHourOfSchedule ||
        check.gpsStatus.minutes !== 0 ||
        check.gpsStatus.seconds !== 0 ||
        check.passengersOnBoard > 0 ||
        check.outOfSectionTickets > 0 ||
        check.passesUsed > 0 ||
        check.observations
      ) {
        await sql`
          INSERT INTO out_of_section_service_checks (
            form_id,
            service_code,
            line_route_branch,
            exact_hour_of_schedule,
            gps_minutes,
            gps_seconds,
            gps_status,
            passengers_on_board,
            out_of_section_tickets,
            passes_used,
            observations
          ) VALUES (
            ${formId},
            ${check.serviceCode},
            ${check.lineRouteBranch},
            ${check.exactHourOfSchedule},
            ${check.gpsStatus.minutes},
            ${check.gpsStatus.seconds},
            ${check.gpsStatus.status},
            ${check.passengersOnBoard},
            ${check.outOfSectionTickets},
            ${check.passesUsed},
            ${check.observations}
          )
        `
      }
    }

    revalidatePath("/out-of-section")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Out-of-section form saved successfully with ID: ${formId}`,
      formId: formId,
    }
  } catch (error) {
    console.error("Error saving out-of-section form:", error)
    return {
      success: false,
      message: `Error saving form: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function getOutOfSectionForm(id: number) {
  try {
    console.log("Getting out-of-section form with ID:", id)

    // Get the main form
    const formResult = await sql`
      SELECT * FROM out_of_section_forms WHERE id = ${id}
    `

    if (formResult.length === 0) {
      return {
        success: false,
        message: "Form not found",
      }
    }

    const form = formResult[0]

    // Get service checks
    const serviceChecks = await sql`
      SELECT * FROM out_of_section_service_checks WHERE form_id = ${id} ORDER BY id
    `

    return {
      success: true,
      data: {
        form,
        serviceChecks,
      },
    }
  } catch (error) {
    console.error("Error getting out-of-section form:", error)
    return {
      success: false,
      message: `Error getting form: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function getOutOfSectionForms(limit = 10) {
  try {
    console.log("Getting out-of-section forms with limit:", limit)

    const forms = await sql`
      SELECT 
        f.*,
        COUNT(sc.id) as service_checks_count
      FROM out_of_section_forms f
      LEFT JOIN out_of_section_service_checks sc ON f.id = sc.form_id
      GROUP BY f.id
      ORDER BY f.created_at DESC
      LIMIT ${limit}
    `

    return {
      success: true,
      data: forms,
    }
  } catch (error) {
    console.error("Error getting out-of-section forms:", error)
    return {
      success: false,
      message: `Error getting forms: ${error instanceof Error ? error.message : "Unknown error"}`,
      data: [],
    }
  }
}

export async function updateOutOfSectionForm(id: number, formData: any) {
  try {
    console.log("Updating out-of-section form:", id, formData)

    // Update the main form
    await sql`
      UPDATE out_of_section_forms 
      SET 
        inspector_name = ${formData.formHeader.inspectorName},
        date = ${formData.formHeader.date},
        place_of_work = ${formData.formHeader.placeOfWork},
        line_or_route_number = ${formData.formHeader.lineOrRouteNumber},
        direction = ${formData.formHeader.direction},
        total_of_services = ${formData.formHeader.totalOfServices},
        total_of_passengers = ${formData.formHeader.totalOfPassengers},
        total_of_oos = ${formData.formHeader.totalOfOOS},
        total_of_passes = ${formData.formHeader.totalOfPasses},
        updated_at = NOW()
      WHERE id = ${id}
    `

    // Delete existing service checks
    await sql`DELETE FROM out_of_section_service_checks WHERE form_id = ${id}`

    // Insert updated service checks
    for (const check of formData.serviceChecks) {
      // Only insert service checks that have some data
      if (
        check.serviceCode ||
        check.lineRouteBranch ||
        check.exactHourOfSchedule ||
        check.gpsStatus.minutes !== 0 ||
        check.gpsStatus.seconds !== 0 ||
        check.passengersOnBoard > 0 ||
        check.outOfSectionTickets > 0 ||
        check.passesUsed > 0 ||
        check.observations
      ) {
        await sql`
          INSERT INTO out_of_section_service_checks (
            form_id,
            service_code,
            line_route_branch,
            exact_hour_of_schedule,
            gps_minutes,
            gps_seconds,
            gps_status,
            passengers_on_board,
            out_of_section_tickets,
            passes_used,
            observations
          ) VALUES (
            ${id},
            ${check.serviceCode},
            ${check.lineRouteBranch},
            ${check.exactHourOfSchedule},
            ${check.gpsStatus.minutes},
            ${check.gpsStatus.seconds},
            ${check.gpsStatus.status},
            ${check.passengersOnBoard},
            ${check.outOfSectionTickets},
            ${check.passesUsed},
            ${check.observations}
          )
        `
      }
    }

    revalidatePath("/out-of-section")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: `Out-of-section form updated successfully`,
    }
  } catch (error) {
    console.error("Error updating out-of-section form:", error)
    return {
      success: false,
      message: `Error updating form: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function deleteOutOfSectionForm(id: number) {
  try {
    console.log("Deleting out-of-section form with ID:", id)

    // Delete service checks first (foreign key constraint)
    await sql`DELETE FROM out_of_section_service_checks WHERE form_id = ${id}`

    // Delete the main form
    const result = await sql`DELETE FROM out_of_section_forms WHERE id = ${id} RETURNING id`

    if (result.length === 0) {
      return {
        success: false,
        message: "Form not found",
      }
    }

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
      message: `Error deleting form: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}

export async function getOutOfSectionStats() {
  try {
    // Get total forms for current month
    const [totalForms] = await sql`
      SELECT COUNT(*) as count FROM out_of_section_forms
      WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
    `

    // Get aggregated statistics for current month
    const [totals] = await sql`
      SELECT 
        COALESCE(SUM(f.total_of_passengers), 0) as total_passengers,
        COALESCE(SUM(f.total_of_passes), 0) as total_passes,
        COALESCE(SUM(f.total_of_oos), 0) as total_oos
      FROM out_of_section_forms f
      WHERE f.date >= DATE_TRUNC('month', CURRENT_DATE)
    `

    // Get statistics by place of work
    const byPlaceOfWork = await sql`
      SELECT 
        f.place_of_work as place,
        COALESCE(SUM(f.total_of_passengers), 0) as passengers,
        COALESCE(SUM(f.total_of_passes), 0) as passes,
        COALESCE(SUM(f.total_of_oos), 0) as oos
      FROM out_of_section_forms f
      WHERE f.date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY f.place_of_work
      ORDER BY passengers DESC
      LIMIT 10
    `

    // Get statistics by line route
    const byLineRoute = await sql`
      SELECT 
        f.line_or_route_number as route,
        COALESCE(SUM(f.total_of_passengers), 0) as passengers,
        COALESCE(SUM(f.total_of_passes), 0) as passes,
        COALESCE(SUM(f.total_of_oos), 0) as oos
      FROM out_of_section_forms f
      WHERE f.date >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY f.line_or_route_number
      ORDER BY passengers DESC
      LIMIT 10
    `

    // Get statistics by route branch (from service checks)
    const byRouteBranch = await sql`
      SELECT 
        s.line_route_branch as branch,
        COALESCE(SUM(s.passengers_on_board), 0) as passengers,
        COALESCE(SUM(s.passes_used), 0) as passes,
        COALESCE(SUM(s.out_of_section_tickets), 0) as oos
      FROM out_of_section_service_checks s
      INNER JOIN out_of_section_forms f ON s.form_id = f.id
      WHERE f.date >= DATE_TRUNC('month', CURRENT_DATE)
        AND s.line_route_branch IS NOT NULL 
        AND s.line_route_branch != ''
      GROUP BY s.line_route_branch
      ORDER BY passengers DESC
      LIMIT 10
    `

    const stats: OutOfSectionStats = {
      totalForms: Number.parseInt(totalForms.count),
      totalPassengers: Number.parseInt(totals.total_passengers),
      totalPasses: Number.parseInt(totals.total_passes),
      totalOOS: Number.parseInt(totals.total_oos),
      byPlaceOfWork: byPlaceOfWork.map((row) => ({
        place: row.place,
        passengers: Number.parseInt(row.passengers),
        passes: Number.parseInt(row.passes),
        oos: Number.parseInt(row.oos),
      })),
      byLineRoute: byLineRoute.map((row) => ({
        route: row.route,
        passengers: Number.parseInt(row.passengers),
        passes: Number.parseInt(row.passes),
        oos: Number.parseInt(row.oos),
      })),
      byRouteBranch: byRouteBranch.map((row) => ({
        branch: row.branch,
        passengers: Number.parseInt(row.passengers),
        passes: Number.parseInt(row.passes),
        oos: Number.parseInt(row.oos),
      })),
    }

    return {
      success: true,
      data: stats,
    }
  } catch (error) {
    console.error("Error fetching out-of-section statistics:", error)
    return {
      success: false,
      message: "Failed to fetch out-of-section statistics",
      data: null,
    }
  }
}
