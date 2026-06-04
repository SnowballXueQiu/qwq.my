import { getCollection } from "./database";

export type MediaAsset = {
  filename: string;
  url: string;
  contentType: string;
  size: number;
  createdAt: string;
};

export async function addMediaAsset(asset: MediaAsset) {
  const collection = await getCollection("media");
  if (!collection) return asset;

  await collection.insertOne(asset);
  return asset;
}

export async function getMediaAssets(): Promise<MediaAsset[]> {
  const collection = await getCollection("media");
  if (!collection) return [];

  const assets = await collection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  return assets as MediaAsset[];
}
