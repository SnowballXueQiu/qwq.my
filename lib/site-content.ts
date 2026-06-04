import fs from "node:fs/promises";
import path from "node:path";
import { getCollection } from "./database";
import type { SiteContent } from "./site-content-types";

const siteContentPath = path.join(process.cwd(), "data", "site-content.json");

export async function getSiteContent(): Promise<SiteContent> {
  const collection = await getCollection("siteContent");
  if (collection) {
    const document = await collection.findOne({ _id: "current" });
    if (document) {
      const { _id, ...content } = document;
      void _id;
      return content as SiteContent;
    }
  }

  const raw = await fs.readFile(siteContentPath, "utf8");
  return JSON.parse(raw) as SiteContent;
}

export async function updateSiteContent(content: SiteContent): Promise<SiteContent> {
  const collection = await getCollection("siteContent");
  if (collection) {
    await collection.updateOne({ _id: "current" }, { $set: { ...content, _id: "current" } }, { upsert: true });
    return content;
  }

  await fs.writeFile(siteContentPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
  return content;
}
