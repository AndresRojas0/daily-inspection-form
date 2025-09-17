import { notFound, redirect } from "next/navigation"
import { getOutOfSectionFormById } from "@/lib/out-of-section-actions"
import { OutOfSectionEditClient } from "@/components/out-of-section-edit-client"

interface PageProps {
  params: {
    id: string
  }
}

export default async function OutOfSectionEditPage({ params }: PageProps) {
  const formId = Number.parseInt(params.id)

  if (isNaN(formId)) {
    notFound()
  }

  const result = await getOutOfSectionFormById(formId)

  if (!result.success || !result.data) {
    notFound()
  }

  const form = result.data

  // Check if the form can be edited (created today in UTC-3)
  const todayUTC3 = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
  const formCreatedDateUTC3 = new Date(form.created_at).toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  })

  if (formCreatedDateUTC3 !== todayUTC3) {
    // Redirect to details page if form cannot be edited
    redirect(`/out-of-section/${formId}`)
  }

  return <OutOfSectionEditClient form={form} />
}
