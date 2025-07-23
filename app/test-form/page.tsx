"use client"

import type React from "react"
import type { ReactElement } from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, PlusIcon, UploadIcon, TrashIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { processExcelFile } from "@/lib/excel-processor"
import { toast } from "@/components/ui/use-toast"
import UsersIcon from "@/components/icons/UsersIcon"

interface ServiceCheck {
  id: string
  lineOrRouteNumber: string
  driverName: string
  serviceCode: string
  fleetCoachNumber: string
  exactHourOfArrival: string
  gpsStatus: {
    minutes: number
    status: "on-time" | "early" | "late"
  }
  passengersOnBoard: number
  passesUsed: number
  addressOfStop: string
  observations: string
  nonCompliance: boolean
}

interface FormHeader {
  title: string
  inspectorName: string
  date: string
  placeOfWork: string
}

export default function TestForm(): ReactElement {
  const [formHeader, setFormHeader] = useState<FormHeader>({
    title: "DAILY INSPECTION FORM",
    inspectorName: "",
    date: format(new Date(), "yyyy-MM-dd"),
    placeOfWork: "",
  })
  const [serviceChecks, setServiceChecks] = useState<ServiceCheck[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [excelFile, setExcelFile] = useState<File | null>(null)

  const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormHeader((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormHeader((prev) => ({ ...prev, date: format(date, "yyyy-MM-dd") }))
    }
  }

  const addServiceCheck = () => {
    setServiceChecks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        lineOrRouteNumber: "",
        driverName: "",
        serviceCode: "",
        fleetCoachNumber: "",
        exactHourOfArrival: "",
        gpsStatus: { minutes: 0, status: "on-time" },
        passengersOnBoard: 0,
        passesUsed: 0,
        addressOfStop: "",
        observations: "",
        nonCompliance: false,
      },
    ])
  }

  const updateServiceCheck = (id: string, field: keyof ServiceCheck, value: any) => {
    setServiceChecks((prev) => prev.map((check) => (check.id === id ? { ...check, [field]: value } : check)))
  }

  const removeServiceCheck = (id: string) => {
    setServiceChecks((prev) => prev.filter((check) => check.id !== id))
  }

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setExcelFile(e.target.files[0])
    } else {
      setExcelFile(null)
    }
  }

  const handleUploadExcel = async () => {
    if (!excelFile) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to upload.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const arrayBuffer = await excelFile.arrayBuffer()
      const result = await processExcelFile(arrayBuffer)

      if (result.success && result.data) {
        setFormHeader(result.data.formHeader)
        setServiceChecks(result.data.serviceChecks)
        toast({
          title: "Excel Upload Successful",
          description: result.message,
        })
      } else {
        toast({
          title: "Excel Upload Failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error during Excel upload:", error)
      toast({
        title: "Excel Upload Error",
        description: `An unexpected error occurred: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setExcelFile(null) // Clear the file input
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // In a real application, you would send this data to your backend
    console.log("Form Header:", formHeader)
    console.log("Service Checks:", serviceChecks)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    toast({
      title: "Form Submitted",
      description: "Daily inspection form submitted successfully!",
    })
    setIsSubmitting(false)
    // Optionally reset form
    // setFormHeader({ title: 'DAILY INSPECTION FORM', inspectorName: '', date: format(new Date(), 'yyyy-MM-dd'), placeOfWork: '' });
    // setServiceChecks([]);
  }

  const isFormValid =
    formHeader.inspectorName.trim() !== "" &&
    formHeader.date.trim() !== "" &&
    formHeader.placeOfWork.trim() !== "" &&
    serviceChecks.length > 0

  const formatGpsVariance = (minutes: number): string => {
    const sign = minutes < 0 ? "-" : "+"
    const absMinutes = Math.abs(minutes)
    const wholeMinutes = Math.floor(absMinutes)
    const seconds = Math.round((absMinutes - wholeMinutes) * 60)

    return `${sign}${String(wholeMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Test Form Page</h1>
      <p className="text-gray-600 text-lg">This is a placeholder page for testing purposes.</p>
      <div className="mt-8 p-6 bg-white rounded-lg shadow-md">
        <p className="text-gray-700">You can add specific test components or scenarios here.</p>
        <p className="text-gray-700 mt-2">For now, it just confirms the route is working.</p>
      </div>
      <div className="mx-auto max-w-4xl space-y-6 mt-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold text-blue-700">{formHeader.title}</CardTitle>
            <p className="text-center text-sm text-gray-500">Complete your daily service inspection</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="inspectorName">Inspector Name *</Label>
              <Input
                id="inspectorName"
                name="inspectorName"
                value={formHeader.inspectorName}
                onChange={handleHeaderChange}
                placeholder="Enter inspector name"
                required
              />
            </div>
            <div>
              <Label htmlFor="date">Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formHeader.date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formHeader.date ? format(new Date(formHeader.date), "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={new Date(formHeader.date)}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="placeOfWork">Place of Work *</Label>
              <Input
                id="placeOfWork"
                name="placeOfWork"
                value={formHeader.placeOfWork}
                onChange={handleHeaderChange}
                placeholder="City or address"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Service Inspections</CardTitle>
            <span className="text-sm text-gray-500">{serviceChecks.length} checks</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={addServiceCheck} className="flex-1">
                <PlusIcon className="mr-2 h-4 w-4" /> Add Service Check
              </Button>
              <div className="relative flex-1">
                <Input
                  id="excel-upload"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleExcelFileChange}
                  className="hidden"
                />
                <Label
                  htmlFor="excel-upload"
                  className="flex w-full cursor-pointer items-center justify-center rounded-md border border-input bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-600"
                >
                  <UploadIcon className="mr-2 h-4 w-4" /> Upload Excel
                </Label>
                {excelFile && <div className="absolute -bottom-6 left-0 text-xs text-gray-600">{excelFile.name}</div>}
              </div>
              <Button onClick={handleUploadExcel} disabled={!excelFile || isSubmitting} className="flex-1">
                {isSubmitting ? "Processing..." : "Process Excel"}
              </Button>
            </div>

            {serviceChecks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <UsersIcon className="h-12 w-12" />
                <p className="mt-2 text-sm">No service checks added yet.</p>
                <p className="text-sm">Click "Add Service Check" to get started.</p>
              </div>
            )}

            {serviceChecks.map((check, index) => (
              <Card key={check.id} className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Service Check #{index + 1}</h3>
                  <Button variant="ghost" size="icon" onClick={() => removeServiceCheck(check.id)}>
                    <TrashIcon className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor={`lineOrRouteNumber-${check.id}`}>Line/Route Number</Label>
                    <Input
                      id={`lineOrRouteNumber-${check.id}`}
                      value={check.lineOrRouteNumber}
                      onChange={(e) => updateServiceCheck(check.id, "lineOrRouteNumber", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`driverName-${check.id}`}>Driver Name</Label>
                    <Input
                      id={`driverName-${check.id}`}
                      value={check.driverName}
                      onChange={(e) => updateServiceCheck(check.id, "driverName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`serviceCode-${check.id}`}>Service Code</Label>
                    <Input
                      id={`serviceCode-${check.id}`}
                      value={check.serviceCode}
                      onChange={(e) => updateServiceCheck(check.id, "serviceCode", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`fleetCoachNumber-${check.id}`}>Fleet/Coach Number</Label>
                    <Input
                      id={`fleetCoachNumber-${check.id}`}
                      value={check.fleetCoachNumber}
                      onChange={(e) => updateServiceCheck(check.id, "fleetCoachNumber", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`exactHourOfArrival-${check.id}`}>Exact Hour of Arrival</Label>
                    <Input
                      id={`exactHourOfArrival-${check.id}`}
                      value={check.exactHourOfArrival}
                      onChange={(e) => updateServiceCheck(check.id, "exactHourOfArrival", e.target.value)}
                      placeholder="HH:MM:SS"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`gpsMinutes-${check.id}`}>GPS Variance (min:sec)</Label>
                    <Input
                      id={`gpsMinutes-${check.id}`}
                      value={formatGpsVariance(check.gpsStatus.minutes)}
                      onChange={(e) => {
                        const [minStr, secStr] = e.target.value.split(":")
                        const minutes = Number.parseFloat(minStr || "0")
                        const seconds = Number.parseFloat(secStr || "0")
                        const totalMinutes = minutes + seconds / 60
                        updateServiceCheck(check.id, "gpsStatus", {
                          minutes: totalMinutes,
                          status: totalMinutes < 0 ? "late" : totalMinutes >= 2 ? "early" : "on-time",
                        })
                      }}
                      placeholder="+MM:SS or -MM:SS"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`passengersOnBoard-${check.id}`}>Passengers On Board</Label>
                    <Input
                      id={`passengersOnBoard-${check.id}`}
                      type="number"
                      value={check.passengersOnBoard}
                      onChange={(e) =>
                        updateServiceCheck(check.id, "passengersOnBoard", Number.parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor={`passesUsed-${check.id}`}>Passes Used</Label>
                    <Input
                      id={`passesUsed-${check.id}`}
                      type="number"
                      value={check.passesUsed}
                      onChange={(e) => updateServiceCheck(check.id, "passesUsed", Number.parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-full">
                    <Label htmlFor={`addressOfStop-${check.id}`}>Address of Stop</Label>
                    <Input
                      id={`addressOfStop-${check.id}`}
                      value={check.addressOfStop}
                      onChange={(e) => updateServiceCheck(check.id, "addressOfStop", e.target.value)}
                    />
                  </div>
                  <div className="col-span-full">
                    <Label htmlFor={`observations-${check.id}`}>Observations</Label>
                    <Textarea
                      id={`observations-${check.id}`}
                      value={check.observations}
                      onChange={(e) => updateServiceCheck(check.id, "observations", e.target.value)}
                    />
                  </div>
                  <div className="col-span-full flex items-center space-x-2">
                    <Checkbox
                      id={`nonCompliance-${check.id}`}
                      checked={check.nonCompliance}
                      onCheckedChange={(checked) => updateServiceCheck(check.id, "nonCompliance", checked)}
                    />
                    <Label htmlFor={`nonCompliance-${check.id}`}>Non-Compliance</Label>
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full py-6" onClick={handleSubmit} disabled={isSubmitting || !isFormValid}>
          {isSubmitting ? "Submitting..." : "Submit Daily Inspection Form"}
        </Button>
        <div className="text-center text-sm text-gray-500">
          <p>Complete all required fields (*) and add at least one service check</p>
          <p>
            Form valid: {isFormValid ? "✓" : "X"} | Service checks: {serviceChecks.length}
          </p>
        </div>
      </div>
    </div>
  )
}
