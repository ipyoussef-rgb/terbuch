"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SlotStatus = "FREE" | "PENDING" | "BOOKED" | "BLOCKED";

const STATUS_STYLE: Record<SlotStatus, string> = {
  FREE: "bg-white border-neutral-300 text-neutral-700",
  PENDING: "bg-amber-100 border-amber-300 text-amber-800",
  BOOKED: "bg-green-100 border-green-300 text-green-800",
  BLOCKED: "bg-neutral-200 border-neutral-300 text-neutral-500 line-through",
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
    <div className="flex flex-wrap gap-2">
      {slots.map((s) => {
        const interactive = s.status === "FREE" || s.status === "BLOCKED";
        return (
          <button
            key={s.id}
            type="button"
            disabled={!interactive || busy === s.id}
            onClick={() => toggle(s.id, s.status)}
            title={`${s.status} — klicken zum Wechseln`}
            className={`rounded border px-3 py-2 text-sm tabular-nums ${STATUS_STYLE[s.status]} ${
              interactive ? "hover:border-neutral-900 cursor-pointer" : "cursor-not-allowed"
            } ${busy === s.id ? "opacity-50" : ""}`}
          >
            {s.time}
          </button>
        );
      })}
    </div>
  );
}
