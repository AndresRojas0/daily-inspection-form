import { NextResponse } from "next/server"
import { processExcelFile } from "@/lib/excel-processor"

export async function POST(request: Request) {
  console.log("API Route /api/process-excel: POST request received.")
  // The file arrives as multipart/form-data.
  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    console.error("API Route /api/process-excel: No file received in request.")
    return NextResponse.json({ success: false, message: "No file received in request." }, { status: 400 })
  }

  console.log(`API Route /api/process-excel: File "${file.name}" received.`)

  try {
    const buffer = await file.arrayBuffer()
    console.log("API Route /api/process-excel: File buffer created. Calling processExcelFile...")
    const result = await processExcelFile(buffer)
    console.log("API Route /api/process-excel: processExcelFile returned result:", result.success)
    return NextResponse.json(result)
  } catch (err) {
    console.error("API Route /api/process-excel: Error during Excel processing:", err)
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Unknown error while processing Excel file",
      },
      { status: 500 },
    )
  }
}
