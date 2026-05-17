"use client";

// Renders a UTC timestamp in the user's local timezone.
// Using a client component avoids server/client timezone mismatch on Vercel (UTC) vs localhost (IST).

import { useEffect, useState } from "react";

interface Props {
  date: string; // ISO string
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
  timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
  /** If true, show only time (no date) */
  timeOnly?: boolean;
}

export function LocalTime({ date, dateStyle = "medium", timeStyle = "short", timeOnly = false }: Props) {
  const [label, setLabel] = useState<string>("");

  useEffect(() => {
    const d = new Date(date);
    if (timeOnly) {
      setLabel(d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }));
    } else {
      setLabel(d.toLocaleString(undefined, { dateStyle, timeStyle }));
    }
  }, [date, dateStyle, timeStyle, timeOnly]);

  // Render nothing on the server / before hydration to avoid mismatch
  if (!label) return <span className="opacity-0">--</span>;
  return <>{label}</>;
}
