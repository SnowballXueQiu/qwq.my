import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCollection } from "./database";

export type FriendApplication = {
  nickname: string;
  siteTitle: string;
  website: string;
  avatarUrl: string;
  email: string;
  intro: string;
  createdAt: string;
};

const applicationsFile = path.join(process.cwd(), "data", "friend-applications.json");

export async function getFriendApplications(): Promise<FriendApplication[]> {
  const collection = await getCollection("friendApplications");
  if (collection) {
    const applications = await collection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return applications as FriendApplication[];
  }

  try {
    const raw = await readFile(applicationsFile, "utf-8");
    return JSON.parse(raw) as FriendApplication[];
  } catch {
    return [];
  }
}

export async function addFriendApplication(application: Omit<FriendApplication, "createdAt">): Promise<FriendApplication> {
  const nextApplication: FriendApplication = {
    ...application,
    createdAt: new Date().toISOString(),
  };

  const collection = await getCollection("friendApplications");
  if (collection) {
    await collection.insertOne(nextApplication);
    return nextApplication;
  }

  const applications = await getFriendApplications();
  await mkdir(path.dirname(applicationsFile), { recursive: true });
  await writeFile(applicationsFile, `${JSON.stringify([nextApplication, ...applications], null, 2)}\n`, "utf-8");
  return nextApplication;
}
