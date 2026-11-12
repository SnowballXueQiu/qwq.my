"use client";

import { useState } from "react";

type Contact = { label: string; value: string; href?: string; copy?: boolean };

/** Every way to reach me; handles without a public URL copy to the clipboard. */
export function ContactList({ contacts, copiedLabel }: { contacts: Contact[]; copiedLabel: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (c: Contact) => {
    try {
      await navigator.clipboard.writeText(c.value);
      setCopied(c.label);
      setTimeout(() => setCopied((v) => (v === c.label ? null : v)), 1600);
    } catch {}
  };
  return (
    <dl className="pointer-events-auto mt-6 grid max-w-xl grid-cols-[88px_1fr] border-t border-ink font-mono text-sm">
      {contacts.map((c) => (
        <div key={c.label} className="contents">
          <dt className="label border-b border-rule bg-paper/80 py-2.5 pr-2 text-ink-soft">{c.label}</dt>
          <dd className="border-b border-rule bg-paper/80 py-2">
            {c.href ? (
              <a
                href={c.href}
                data-cursor="OPEN"
                className="group inline-flex items-baseline gap-2 hover:text-accent"
                {...(c.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {c.value}
                <span className="text-accent opacity-0 transition-opacity group-hover:opacity-100">↗</span>
              </a>
            ) : (
              <button type="button" data-cursor="COPY" onClick={() => copy(c)} className="group inline-flex items-baseline gap-2 hover:text-accent">
                {c.value}
                <span className={`label ${copied === c.label ? "text-accent" : "text-ink-soft opacity-0 group-hover:opacity-100"}`}>
                  {copied === c.label ? copiedLabel : "⧉"}
                </span>
              </button>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
