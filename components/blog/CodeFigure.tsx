"use client";

import { useRef, useState } from "react";

/**
 * A highlighted code block (from rehype-pretty-code) under a header bar: the language on
 * the left, a copy button on the right. The bar is sticky inside the block, so once the
 * block's top scrolls under the site header the bar stays pinned there, and it leaves
 * with the block.
 */
export function CodeFigure({ lang, children, ...props }: React.ComponentProps<"figure"> & { lang?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = ref.current?.querySelector("code")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text.replace(/\n$/, ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <figure ref={ref} {...props}>
      <div className="code-head">
        <span>{lang && lang !== "plaintext" ? lang : "text"}</span>
        <button type="button" onClick={copy} aria-label={copied ? "Copied" : "Copy code"} data-copied={copied || undefined}>
          <svg aria-hidden viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            {copied ? (
              <path d="M3 8.5 6.5 12 13 4.5" />
            ) : (
              <>
                <rect x="5.5" y="5.5" width="8" height="8" />
                <path d="M10.5 5.5v-3h-8v8h3" />
              </>
            )}
          </svg>
          {copied ? "COPIED" : "COPY"}
        </button>
      </div>
      {children}
    </figure>
  );
}
