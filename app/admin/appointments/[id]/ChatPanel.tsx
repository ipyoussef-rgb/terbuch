"use client";

import { useEffect, useRef, useState } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [initialMessages.length]);

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
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 max-h-[500px] overflow-y-auto rounded-xl bg-[var(--color-kobil-mist-50)] border border-[var(--color-kobil-line)] p-3 space-y-2"
      >
        {initialMessages.length === 0 ? (
          <div className="text-sm text-[var(--color-kobil-navy)]/50 text-center py-8">
            Noch keine Nachrichten.
          </div>
        ) : (
          initialMessages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                m.direction === "OUT"
                  ? "ml-auto bg-[var(--color-kobil-blue)] text-white rounded-br-sm"
                  : "bg-white border border-[var(--color-kobil-line)] rounded-bl-sm"
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{m.body}</div>
              <div
                className={`text-[10px] mt-1 ${
                  m.direction === "OUT"
                    ? "text-white/65"
                    : "text-[var(--color-kobil-navy)]/45"
                }`}
              >
                {m.type} · {new Date(m.createdAt).toLocaleString("de-DE")}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <div className="rounded-xl border border-[var(--color-kobil-line)] focus-within:border-[var(--color-kobil-blue)] focus-within:ring-2 focus-within:ring-[var(--color-kobil-blue)]/20 transition-colors bg-white">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={'Nachricht an die Bürger:in (z.B. „Bitte Personalausweis mitbringen“)…'}
            className="w-full resize-none rounded-xl bg-transparent px-3.5 py-2.5 text-sm placeholder:text-[var(--color-kobil-navy)]/35 focus:outline-none"
          />
        </div>
        {error ? (
          <div className="text-xs text-red-700">{error}</div>
        ) : null}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={send}
            disabled={sending || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-kobil-blue)] text-white px-4 py-2 text-sm font-medium hover:bg-[var(--color-kobil-blue-600)] disabled:opacity-50 transition-colors"
          >
            {sending ? "Sende…" : "Senden"}
            {!sending ? (
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" aria-hidden="true">
                <path
                  d="M2 8 14 2 9 14l-2-5-5-1Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}
