// Create a utility file for consistent date handling across the app

/**
 * Get current date in UTC-3 timezone in YYYY-MM-DD format
 */
export function getCurrentDateUTC3(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

/**
 * Format a date string to display in UTC-3 timezone
 */
export function formatDateUTC3(dateString: string): string {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Format a datetime string to display in UTC-3 timezone
 */
export function formatDateTimeUTC3(dateTimeString: string): string {
  return new Date(dateTimeString).toLocaleString("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

/**
 * Format a datetime string to display in UTC-3 timezone (short format)
 */
export function formatDateTimeShortUTC3(dateTimeString: string): string {
  return new Date(dateTimeString).toLocaleString("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Check if two dates are the same day in UTC-3 timezone
 */
export function isSameDayUTC3(date1: string | Date, date2: string | Date): boolean {
  const d1 = typeof date1 === "string" ? new Date(date1) : date1
  const d2 = typeof date2 === "string" ? new Date(date2) : date2

  const date1UTC3 = d1.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
  const date2UTC3 = d2.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })

  return date1UTC3 === date2UTC3
}

/**
 * Convert a date to UTC-3 date string (YYYY-MM-DD)
 */
export function toDateStringUTC3(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
}
