"use server"

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function saveOutOfSectionForm(formData: any) {
  try {
    console.log("Saving out-of-section form:", formData)

    // Insert the main form
    const formResult = await sql`
      INSERT INTO out_of_section_inspections (
        inspector_name, date, place_of_work, line_or_route_number, direction,
        total_of_services, total_of_passengers, total_of_oos, total_of_passes
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
      await sql`
        INSERT INTO out_of_section_service_checks (
          form_id, service_code, line_route_branch, exact_hour_of_schedule,
          gps_minutes, gps_seconds, gps_status, passengers_on_board,
          out_of_section_tickets, passes_used, observations
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

    return { success: true, formId }
  } catch (error) {
    console.error("Error saving out-of-section form:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function getOutOfSectionForms() {
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
        total_of_oos,
        total_of_passes,
        created_at
      FROM out_of_section_inspections 
      ORDER BY date DESC, created_at DESC
    `

    return { success: true, forms }
  } catch (error) {
    console.error("Error fetching out-of-section forms:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function getOutOfSectionFormById(id: number) {
  try {
    const forms = await sql`
      SELECT * FROM out_of_section_inspections WHERE id = ${id}
    `

    if (forms.length === 0) {
      return { success: false, error: "Form not found" }
    }

    const serviceChecks = await sql`
      SELECT * FROM out_of_section_service_checks WHERE form_id = ${id} ORDER BY id
    `

    return {
      success: true,
      form: forms[0],
      serviceChecks,
    }
  } catch (error) {
    console.error("Error fetching out-of-section form:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function updateOutOfSectionForm(id: number, formData: any) {
  try {
    console.log("Updating out-of-section form:", id, formData)

    // Update the main form
    await sql`
      UPDATE out_of_section_inspections SET
        inspector_name = ${formData.formHeader.inspectorName},
        date = ${formData.formHeader.date},
        place_of_work = ${formData.formHeader.placeOfWork},
        line_or_route_number = ${formData.formHeader.lineOrRouteNumber},
        direction = ${formData.formHeader.direction},
        total_of_services = ${formData.formHeader.totalOfServices},
        total_of_passengers = ${formData.formHeader.totalOfPassengers},
        total_of_oos = ${formData.formHeader.totalOfOOS},
        total_of_passes = ${formData.formHeader.totalOfPasses}
      WHERE id = ${id}
    `

    // Delete existing service checks
    await sql`DELETE FROM out_of_section_service_checks WHERE form_id = ${id}`

    // Insert updated service checks
    for (const check of formData.serviceChecks) {
      await sql`
        INSERT INTO out_of_section_service_checks (
          form_id, service_code, line_route_branch, exact_hour_of_schedule,
          gps_minutes, gps_seconds, gps_status, passengers_on_board,
          out_of_section_tickets, passes_used, observations
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

    return { success: true }
  } catch (error) {
    console.error("Error updating out-of-section form:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function deleteOutOfSectionForm(id: number) {
  try {
    // Delete service checks first (foreign key constraint)
    await sql`DELETE FROM out_of_section_service_checks WHERE form_id = ${id}`

    // Delete the main form
    await sql`DELETE FROM out_of_section_inspections WHERE id = ${id}`

    return { success: true }
  } catch (error) {
    console.error("Error deleting out-of-section form:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function getOutOfSectionStats() {
  try {
    // Get total forms count
    const totalFormsResult = await sql`
      SELECT COUNT(*) as count FROM out_of_section_inspections
    `
    const totalForms = Number.parseInt(totalFormsResult[0].count)

    // Get total service checks count
    const totalServiceChecksResult = await sql`
      SELECT COUNT(*) as count FROM out_of_section_service_checks
    `
    const totalServiceChecks = Number.parseInt(totalServiceChecksResult[0].count)

    // Get recent forms (last 30 days)
    const recentFormsResult = await sql`
      SELECT COUNT(*) as count 
      FROM out_of_section_inspections 
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `
    const recentForms = Number.parseInt(recentFormsResult[0].count)

    // Get GPS status statistics
    const gpsStatsResult = await sql`
      SELECT 
        gps_status,
        COUNT(*) as count
      FROM out_of_section_service_checks
      GROUP BY gps_status
    `

    const gpsStats = {
      "on-time": 0,
      early: 0,
      late: 0,
    }

    gpsStatsResult.forEach((row) => {
      if (row.gps_status in gpsStats) {
        gpsStats[row.gps_status as keyof typeof gpsStats] = Number.parseInt(row.count)
      }
    })

    // Get monthly statistics for the current year
    const monthlyStatsResult = await sql`
      SELECT 
        EXTRACT(MONTH FROM date) as month,
        COUNT(*) as forms_count,
        SUM(total_of_services) as total_services,
        SUM(total_of_passengers) as total_passengers,
        SUM(total_of_oos) as total_oos
      FROM out_of_section_inspections
      WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
      GROUP BY EXTRACT(MONTH FROM date)
      ORDER BY month
    `

    const monthlyStats = monthlyStatsResult.map((row) => ({
      month: Number.parseInt(row.month),
      formsCount: Number.parseInt(row.forms_count),
      totalServices: Number.parseInt(row.total_services || 0),
      totalPassengers: Number.parseInt(row.total_passengers || 0),
      totalOOS: Number.parseInt(row.total_oos || 0),
    }))

    return {
      success: true,
      stats: {
        totalForms,
        totalServiceChecks,
        recentForms,
        gpsStats,
        monthlyStats,
      },
    }
  } catch (error) {
    console.error("Error fetching out-of-section stats:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
