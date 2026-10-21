import { Metadata } from "next"
import { redirect } from "next/navigation"
import { storefrontMetadata } from "../lib/data/brand"

export async function generateMetadata(): Promise<Metadata> {
  return storefrontMetadata("My appointments")
}

/** Preserve bookmarked entry points without restoring email-only record lookup. */
export async function AppointmentsPage() { redirect('/account') }
