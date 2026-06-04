import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const dynamicImport = new Function("specifier", "return import(specifier)");

async function readJson(file) {
  const raw = await readFile(path.join(process.cwd(), "data", file), "utf8");
  return JSON.parse(raw);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.log("MONGODB_URI is not set; skipping seed.");
    return;
  }

  const { MongoClient } = await dynamicImport("mongodb");
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  const db = client.db(process.env.MONGODB_DB || "qwq_my");
  const [siteContent, posts, applications, analytics, presence] = await Promise.all([
    readJson("site-content.json"),
    readJson("posts.json"),
    readJson("friend-applications.json").catch(() => []),
    readJson("analytics.json").catch(() => ({ totalPageViews: 0, pages: {}, updatedAt: new Date(0).toISOString() })),
    readJson("presence.json").catch(() => null),
  ]);

  await db.collection("siteContent").updateOne({ _id: "current" }, { $setOnInsert: { ...siteContent, _id: "current" } }, { upsert: true });

  for (const post of posts) {
    await db.collection("posts").updateOne({ slug: post.slug }, { $setOnInsert: post }, { upsert: true });
  }

  for (const application of applications) {
    await db
      .collection("friendApplications")
      .updateOne({ website: application.website, email: application.email }, { $setOnInsert: application }, { upsert: true });
  }

  await db.collection("analytics").updateOne({ _id: "current" }, { $setOnInsert: { ...analytics, _id: "current" } }, { upsert: true });

  if (presence) {
    await db.collection("presence").updateOne({ _id: "current" }, { $set: { ...presence, _id: "current" } }, { upsert: true });
  }

  await Promise.all([
    db.collection("posts").createIndex({ slug: 1 }, { unique: true }),
    db.collection("friendApplications").createIndex({ createdAt: -1 }),
    db.collection("media").createIndex({ createdAt: -1 }),
  ]);

  await client.close();
  console.log("Database seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
