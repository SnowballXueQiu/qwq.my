import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCollection } from "./database";
import type { PresencePayload, PresenceState } from "./presence-types";

const presenceFile = path.join(process.cwd(), "data", "presence.json");
const staleAfterMs = 45_000;

const fallbackPresence: PresenceState = {
  status: "offline",
  location: "Shanghai",
  bpm: 72,
  device: {
    name: "Mac",
    os: "macOS",
  },
  activeApp: {
    name: "Unknown",
  },
  editing: {
    isEditor: true,
    editor: "Next.js",
    file: "app/page.tsx",
    branch: "main",
  },
  updatedAt: new Date(0).toISOString(),
  stale: true,
};

export async function getPresence(): Promise<PresenceState> {
  const collection = await getCollection("presence");
  if (collection) {
    const document = await collection.findOne({ _id: "current" }, { projection: { _id: 0 } });
    if (document) return withStaleStatus(document as PresenceState);
  }

  try {
    const raw = await readFile(presenceFile, "utf-8");
    const state = JSON.parse(raw) as PresenceState;
    return withStaleStatus(state);
  } catch {
    return fallbackPresence;
  }
}

export async function updatePresence(payload: PresencePayload): Promise<PresenceState> {
  const previous = await getPresence();
  const next: PresenceState = withStaleStatus({
    ...previous,
    ...payload,
    device: payload.device ?? previous.device,
    activeApp: payload.activeApp ?? previous.activeApp,
    editing: payload.editing ?? previous.editing,
    updatedAt: new Date().toISOString(),
    stale: false,
  });

  await mkdir(path.dirname(presenceFile), { recursive: true });
  await writeFile(presenceFile, `${JSON.stringify(next, null, 2)}\n`, "utf-8");

  const collection = await getCollection("presence");
  if (collection) {
    await collection.updateOne({ _id: "current" }, { $set: { ...next, _id: "current" } }, { upsert: true });
  }

  return next;
}

function withStaleStatus(state: PresenceState): PresenceState {
  const stale = Date.now() - new Date(state.updatedAt).getTime() > staleAfterMs;
  return {
    ...state,
    status: stale ? "offline" : state.status,
    stale,
  };
}
