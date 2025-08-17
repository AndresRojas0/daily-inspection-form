import { getDailyInspectionFormById } from "@/lib/actions"
import { EditFormClient } from "@/components/edit-form-client"
import { notFound } from "next/navigation"

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditFormPage({ params }: PageProps) {
  const formId = Number.parseInt(params.id)

  if (isNaN(formId)) {
    notFound()
  }

  const result = await getDailyInspectionFormById(formId)

  if (!result.success || !result.data) {
    notFound()
  }

  const form = result.data

  // Check if form can be edited (created today in UTC-3)
  const todayUTC3 = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
  const formCreatedDateUTC3 = new Date(form.created_at).toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  })

  if (formCreatedDateUTC3 !== todayUTC3) {
    notFound() // Return 404 if trying to edit a form not created today
  }

  return <EditFormClient form={form} />
}
