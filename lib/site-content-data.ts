import content from "@/data/site-content.json";
import type { SiteContent } from "./site-content-types";

export function getStaticSiteContent(): SiteContent {
  return content as SiteContent;
}
