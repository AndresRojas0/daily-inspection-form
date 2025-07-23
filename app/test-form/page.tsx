"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"
import { saveDailyInspectionForm } from "@/lib/actions"

export default function TestFormPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const createTestForm = async () => {
    setIsSubmitting(true)
    setResult(null)

    const testForm = {
      formHeader: {
        title: "DAILY INSPECTION FORM",
        inspectorName: "Test Inspector",
        date: new Date().toISOString().split("T")[0],
        placeOfWork: "Test Location",
      },
      serviceChecks: [
        {
          lineOrRouteNumber: "Route 101",
          driverName: "Test Driver",
          serviceCode: "SVC001",
          fleetCoachNumber: "FC123",
          exactHourOfArrival: "08:30:00",
          gpsStatus: {
            minutes: 0,
            status: "on-time" as const,
          },
          passengersOnBoard: 25,
          passesUsed: 20,
          addressOfStop: "Test Stop Address",
          observations: "Test observation",
        },
      ],
    }

    try {
      const saveResult = await saveDailyInspectionForm(testForm)
      setResult(saveResult)
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Test Form Creation</h1>

        <Card>
          <CardHeader>
            <CardTitle>Create Test Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              This will create a test form with sample data to verify the database is working correctly.
            </p>

            <Button onClick={createTestForm} disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Creating Test Form..." : "Create Test Form"}
            </Button>

            {result && (
              <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                  {result.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
