"use client";

import { useSelectedLayoutSegments } from "next/navigation";
import { isTag } from "@/content/tags";
import { TagChips } from "./Tags";

/** The tag bar, with the tag being shown (from /blog/tag/<id>) marked. */
export function TagBar(props: Omit<React.ComponentProps<typeof TagChips>, "active">) {
  const [segment, id] = useSelectedLayoutSegments();
  return <TagChips {...props} active={segment === "tag" && id && isTag(id) ? id : undefined} />;
}
