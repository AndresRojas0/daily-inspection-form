import { NextResponse } from "next/server"
import { processExcelFile } from "@/lib/excel-processor"

export async function POST(request: Request) {
  // The file arrives as multipart/form-data.
  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) return NextResponse.json({ success: false, message: "No file received in request." }, { status: 400 })

  try {
    const buffer = await file.arrayBuffer()
    const result = await processExcelFile(buffer)
    return NextResponse.json(result)
  } catch (err) {
    console.error("process-excel route error:", err)
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Unknown error while processing Excel file",
      },
      { status: 500 },
    )
  }
}
