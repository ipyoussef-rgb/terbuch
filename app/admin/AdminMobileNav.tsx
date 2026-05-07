"use client";

import Link from "next/link";
import { useState } from "react";

export default function AdminMobileNav({ userLabel }: { userLabel: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
        className="rounded-md p-2 text-[var(--color-kobil-navy)] hover:bg-[var(--color-kobil-mist-50)]"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-[var(--color-kobil-navy)]/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-kobil-line)]">
              <span className="text-sm font-semibold uppercase tracking-wider text-[var(--color-kobil-navy)]/60">
                Menü
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Schließen"
                className="rounded-md p-1.5 hover:bg-[var(--color-kobil-mist-50)]"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
                  <path
                    d="M6 6l12 12M6 18 18 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              <MobileItem href="/admin" onClick={() => setOpen(false)}>
                Dashboard
              </MobileItem>
              <MobileItem
                href="/admin/appointments"
                onClick={() => setOpen(false)}
              >
                Termine
              </MobileItem>
              <MobileItem href="/admin/slots" onClick={() => setOpen(false)}>
                Slots
              </MobileItem>
            </nav>
            <div className="p-4 border-t border-[var(--color-kobil-line)] space-y-3">
              <div className="text-xs">
                <div className="text-[var(--color-kobil-navy)]/50 uppercase tracking-wider">
                  Angemeldet
                </div>
                <div className="text-[var(--color-kobil-navy)] font-medium truncate mt-0.5">
                  {userLabel}
                </div>
              </div>
              <a
                href="/api/auth/admin/logout"
                className="block w-full text-center rounded-full border border-[var(--color-kobil-line)] px-3 py-2 text-xs font-medium text-[var(--color-kobil-navy)] hover:border-[var(--color-kobil-blue)] hover:text-[var(--color-kobil-blue)]"
              >
                Abmelden
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MobileItem({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-lg px-3 py-2.5 text-sm text-[var(--color-kobil-navy)]/80 hover:bg-[var(--color-kobil-mist-50)] hover:text-[var(--color-kobil-blue)]"
    >
      {children}
    </Link>
  );
}
