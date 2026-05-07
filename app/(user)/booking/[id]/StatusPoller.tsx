"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StatusPoller({
  appointmentId,
  initialStatus,
}: {
  appointmentId: string;
  initialStatus: string;
}) {
  const router = useRouter();
  useEffect(() => {
    if (initialStatus !== "PENDING") return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/appointments/${appointmentId}`);
        if (!r.ok) return;
        const j = (await r.json()) as { status?: string };
        if (j.status && j.status !== "PENDING") router.refresh();
      } catch {
        // ignore
      }
    }, 5000);
    return () => clearInterval(t);
  }, [appointmentId, initialStatus, router]);
  return null;
}
