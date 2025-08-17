import "./globals.css"
import { Inter } from "next/font/google" // Removed Fira_Code
import type { Metadata } from "next"
import type React from "react"
import { MainNav } from "@/components/main-nav" // Import the new MainNav component

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Daily Inspection Form",
  description: "Created with v0",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <MainNav /> {/* Add the navigation component here */}
        {children}
      </body>
    </html>
  )
}
