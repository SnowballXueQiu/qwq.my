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

export async function getFriendApplications(): Promise<FriendApplication[]> {
  const collection = await getCollection("friendApplications");
  if (collection) {
    const applications = await collection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
    return applications as FriendApplication[];
  }

  return [];
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

  throw new Error("MongoDB is required to save friend applications.");
}
