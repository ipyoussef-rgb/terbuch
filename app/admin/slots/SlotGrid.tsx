"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SlotStatus = "FREE" | "PENDING" | "BOOKED" | "BLOCKED";

const STATUS_STYLE: Record<SlotStatus, string> = {
  FREE: "bg-white border-[var(--color-kobil-line)] text-[var(--color-kobil-navy)] hover:border-[var(--color-kobil-blue)] hover:bg-[var(--color-kobil-mist-50)]",
  PENDING: "bg-amber-50 border-amber-200 text-amber-800 cursor-not-allowed",
  BOOKED: "bg-emerald-50 border-emerald-200 text-emerald-800 cursor-not-allowed",
  BLOCKED: "bg-[var(--color-kobil-mist)] border-[var(--color-kobil-line)] text-[var(--color-kobil-navy)]/40 line-through hover:border-[var(--color-kobil-blue)]",
};

export default function SlotGrid({
  slots,
}: {
  slots: { id: string; time: string; status: SlotStatus }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(id: string, status: SlotStatus) {
    if (status !== "FREE" && status !== "BLOCKED") return;
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/slots/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: status === "FREE" ? "BLOCKED" : "FREE",
        }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
      {slots.map((s) => {
        const interactive = s.status === "FREE" || s.status === "BLOCKED";
        return (
          <button
            key={s.id}
            type="button"
            disabled={!interactive || busy === s.id}
            onClick={() => toggle(s.id, s.status)}
            title={`${s.status} — klicken zum Wechseln`}
            className={`rounded-lg border px-3 py-2 text-sm font-medium tabular-nums transition-colors ${STATUS_STYLE[s.status]} ${
              busy === s.id ? "opacity-50" : ""
            }`}
          >
            {s.time}
          </button>
        );
      })}
    </div>
  );
}
