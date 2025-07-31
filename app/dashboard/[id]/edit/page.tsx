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

  // Check if form can be edited (created today)
  const today = new Date().toString()
  // const today = new Date().toISOString().split("T")[0]
  const formCreatedDate = new Date(form.created_at).toString()
  // const formCreatedDate = new Date(form.created_at).toISOString().split("T")[0]

  if (formCreatedDate !== today) {
    notFound() // Return 404 if trying to edit a form not created today
  }

  return <EditFormClient form={form} />
}
