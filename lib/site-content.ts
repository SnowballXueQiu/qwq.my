import { getCollection } from "./database";
import { DEFAULT_SITE_CONTENT } from "./default-content";
import type { SiteContent } from "./site-content-types";

export async function getSiteContent(): Promise<SiteContent> {
  const collection = await getCollection("siteContent");
  if (collection) {
    const document = await collection.findOne({ _id: "current" });
    if (document) {
      const { _id, ...content } = document;
      void _id;
      return mergeSiteContent(content as Partial<SiteContent>);
    }
  }

  return DEFAULT_SITE_CONTENT;
}

export async function updateSiteContent(content: SiteContent): Promise<SiteContent> {
  const collection = await getCollection("siteContent");
  if (!collection) {
    throw new Error("MongoDB is required to update site content.");
  }

  await collection.updateOne({ _id: "current" }, { $set: { ...content, _id: "current" } }, { upsert: true });
  return content;
}

function mergeSiteContent(content: Partial<SiteContent>): SiteContent {
  return {
    site: { ...DEFAULT_SITE_CONTENT.site, ...(content.site ?? {}) },
    me: Array.isArray(content.me) && content.me.length ? content.me.map(mergeMeCard) : DEFAULT_SITE_CONTENT.me,
    projects: Array.isArray(content.projects) ? content.projects : DEFAULT_SITE_CONTENT.projects,
    friends: Array.isArray(content.friends) ? content.friends : DEFAULT_SITE_CONTENT.friends,
    about: { ...DEFAULT_SITE_CONTENT.about, ...(content.about ?? {}) },
  };
}

function mergeMeCard(card: Partial<SiteContent["me"][number]>): SiteContent["me"][number] {
  return {
    id: card.id ?? `me-${Date.now()}`,
    kind: card.kind ?? "text",
    title: card.title ?? "Untitled module",
    summary: card.summary ?? "",
    enabled: card.enabled ?? true,
    imageUrl: card.imageUrl,
    imageAlt: card.imageAlt,
    items: Array.isArray(card.items) ? card.items : [],
    links: Array.isArray(card.links) ? card.links : [],
  };
}
