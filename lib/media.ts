import { Readable } from "node:stream";
import { getCollection, getMongoDb } from "./database";

export type MediaAsset = {
  id: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
  createdAt: string;
};

const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;

export async function addMediaAsset(asset: Omit<MediaAsset, "id" | "url"> & { bytes: Buffer }) {
  const db = await getMongoDb();
  if (!db) {
    throw new Error("MongoDB is required to upload media.");
  }

  const { GridFSBucket } = await dynamicImport("mongodb");
  const bucket = new GridFSBucket(db, { bucketName: "mediaFiles" });
  const fileId = await new Promise<any>((resolve, reject) => {
    const stream = bucket.openUploadStream(asset.filename, {
      metadata: {
        contentType: asset.contentType,
        createdAt: asset.createdAt,
      },
    });
    stream.on("finish", () => resolve(stream.id));
    stream.on("error", reject);
    stream.end(asset.bytes);
  });
  const id = String(fileId);
  const mediaAsset: MediaAsset = {
    id,
    filename: asset.filename,
    url: `/api/media/${id}`,
    contentType: asset.contentType,
    size: asset.size,
    createdAt: asset.createdAt,
  };

  const collection = await getCollection("media");
  if (!collection) return mediaAsset;

  await collection.insertOne(mediaAsset);
  return mediaAsset;
}

export async function getMediaAssets(): Promise<MediaAsset[]> {
  const collection = await getCollection("media");
  if (!collection) return [];

  const assets = await collection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  return assets as MediaAsset[];
}

export async function getMediaAsset(id: string): Promise<MediaAsset | undefined> {
  const collection = await getCollection("media");
  if (!collection) return undefined;

  const asset = await collection.findOne({ id }, { projection: { _id: 0 } });
  return (asset as MediaAsset | null) ?? undefined;
}

export async function getMediaAssetByFilename(filename: string): Promise<MediaAsset | undefined> {
  const collection = await getCollection("media");
  if (!collection) return undefined;

  const asset = await collection.findOne({ filename }, { projection: { _id: 0 } });
  return (asset as MediaAsset | null) ?? undefined;
}

export async function getMediaFileStream(id: string) {
  const db = await getMongoDb();
  if (!db) return null;

  const { GridFSBucket, ObjectId } = await dynamicImport("mongodb");
  const bucket = new GridFSBucket(db, { bucketName: "mediaFiles" });
  const nodeStream = bucket.openDownloadStream(new ObjectId(id));
  return Readable.toWeb(nodeStream) as ReadableStream;
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const db = await getMongoDb();
  if (!db) {
    throw new Error("MongoDB is required to delete media.");
  }

  const { GridFSBucket, ObjectId } = await dynamicImport("mongodb");
  const bucket = new GridFSBucket(db, { bucketName: "mediaFiles" });
  await bucket.delete(new ObjectId(id)).catch(() => undefined);

  const collection = await getCollection("media");
  await collection?.deleteOne({ id });
}
