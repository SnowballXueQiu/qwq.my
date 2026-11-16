"use client";

import { useRef, useState } from "react";

/**
 * A highlighted code block (from rehype-pretty-code) with a copy button. The button rides
 * in a sticky strip, so it stays at the block's top-right corner on screen until the whole
 * block has scrolled away.
 */
export function CodeFigure({ children, ...props }: React.ComponentProps<"figure">) {
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
      <div className="code-copy">
        <button type="button" onClick={copy} aria-label={copied ? "Copied" : "Copy code"} data-copied={copied || undefined}>
          {copied ? "✓ COPIED" : "COPY"}
        </button>
      </div>
      {children}
    </figure>
  );
}
