"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowRight, Trash2 } from "lucide-react"
import Link from "next/link"
import { deleteDailyInspectionForm } from "@/lib/actions"
import type { DailyInspectionFormDB } from "@/lib/database"

interface DashboardClientProps {
  initialForms: DailyInspectionFormDB[]
}

export function DashboardClient({ initialForms }: DashboardClientProps) {
  const [forms, setForms] = useState(initialForms)

  const handleDelete = async (formId: number) => {
    const result = await deleteDailyInspectionForm(formId)
    if (result.success) {
      setForms((prevForms) => prevForms.filter((form) => form.id !== formId))
    } else {
      alert(`Failed to delete form: ${result.message}`)
    }
  }

  return (
    <div className="space-y-4">
      {forms.map((form) => (
        <Card key={form.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4">
          <div className="flex-1 mb-4 sm:mb-0">
            <h3 className="font-semibold text-lg">{form.inspector_name}</h3>
            <p className="text-sm text-gray-600">
              {new Date(form.date).toLocaleDateString()} - {form.place_of_work}
            </p>
            <p className="text-xs text-gray-500">Submitted: {new Date(form.created_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{form.service_checks_count || 0} checks</Badge>
            <Link href={`/dashboard/${form.id}`} passHref>
              <Button variant="outline" size="sm">
                View Details <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {
                      "This action cannot be undone. This will permanently delete this inspection form and all associated service checks from our servers."
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(form.id)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      ))}
    </div>
  )
}
