"use client";

import { useEffect, useId, useState } from "react";

export function MermaidBlock({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            primaryColor: "#ffe0ec",
            primaryTextColor: "#252845",
            primaryBorderColor: "#252845",
            lineColor: "#706f91",
            secondaryColor: "#ead8ff",
            tertiaryColor: "#e2f3ff",
            fontFamily: "Short Stack, system-ui, sans-serif",
          },
        });
        const result = await mermaid.render(`mermaid-${id}`, chart);
        if (!cancelled) setSvg(result.svg);
      } catch (renderError) {
        if (!cancelled) setError(renderError instanceof Error ? renderError.message : "Mermaid render failed.");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return (
      <pre className="markdown-code-block">
        <code>{chart}</code>
      </pre>
    );
  }

  return <div className="mermaid-block" dangerouslySetInnerHTML={{ __html: svg || "<span>Rendering diagram...</span>" }} />;
}
