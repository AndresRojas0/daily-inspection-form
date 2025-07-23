import "./globals.css"
import { Inter, Fira_Code } from "next/font/google"
import type { Metadata } from "next"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })
const fira = Fira_Code({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Daily Inspection Form",
  description: "Created with v0",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.className} ${fira.className}`}>
      <body>{children}</body>
    </html>
  )
}
