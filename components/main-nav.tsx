import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Home, Bug, LayoutDashboard, FileText } from "lucide-react"

export function MainNav() {
  return (
    <nav className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base">
            <FileText className="h-5 w-5" />
            <span>Inspection App</span>
          </Link>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Form
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/calendar">
                <FileText className="h-4 w-4 mr-2" />
                Calendar
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/test-form">
                <Bug className="h-4 w-4 mr-2" />
                Test Form
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/debug">
                <Bug className="h-4 w-4 mr-2" />
                Debug DB
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
