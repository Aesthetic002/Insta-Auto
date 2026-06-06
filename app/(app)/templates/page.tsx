import { redirect } from "next/navigation";

// The /templates gallery was replaced by /studio in the dental-templates pivot.
// This stub keeps old links (sidebar, deep-links from emails) working.
export default function TemplatesRedirect() {
  redirect("/studio");
}
