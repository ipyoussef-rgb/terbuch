"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Msg = {
  id: string;
  direction: "OUT" | "IN";
  type: string;
  body: string;
  createdAt: string;
};

export default function ChatPanel({
  appointmentId,
  initialMessages,
}: {
  appointmentId: string;
  initialMessages: Msg[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/send-message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ appointmentId, text: text.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setText("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col gap-3">
      <div className="flex-1 max-h-[400px] overflow-y-auto border border-neutral-200 rounded p-3 space-y-2 bg-neutral-50">
        {initialMessages.length === 0 ? (
          <div className="text-sm text-neutral-500">Noch keine Nachrichten.</div>
        ) : (
          initialMessages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded px-3 py-2 text-sm ${
                m.direction === "OUT"
                  ? "ml-auto bg-neutral-900 text-white"
                  : "bg-white border border-neutral-200"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.body}</div>
              <div
                className={`text-[10px] mt-1 ${
                  m.direction === "OUT" ? "text-neutral-400" : "text-neutral-500"
                }`}
              >
                {m.type} · {new Date(m.createdAt).toLocaleString("de-DE")}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Nachricht an die Bürgerin / den Bürger…"
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        {error ? (
          <div className="text-xs text-red-700">{error}</div>
        ) : null}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={send}
            disabled={sending || !text.trim()}
            className="rounded bg-neutral-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {sending ? "Sende…" : "Senden"}
          </button>
        </div>
      </div>
    </div>
  );
}
