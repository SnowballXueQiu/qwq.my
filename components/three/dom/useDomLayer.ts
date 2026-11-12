"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * A fixed, full-screen layer for drei <Html> content. drei would otherwise
 * position elements against the scrolled document. Its own z-index keeps
 * every element drei stacks inside it in one place in the page's order.
 *
 * The element exists from the first render (the canvas is client-only), so
 * drei never mounts into a fallback container and then has to move.
 */
export function useDomLayer(zIndex: number) {
  const [el] = useState(() => {
    const div = document.createElement("div");
    div.style.cssText = `position:fixed;inset:0;pointer-events:none;overflow:hidden`;
    return div;
  });
  useEffect(() => {
    el.style.zIndex = String(zIndex);
    document.body.appendChild(el);
    return () => el.remove();
  }, [el, zIndex]);
  return useMemo(() => ({ current: el }) as React.RefObject<HTMLElement>, [el]);
}
