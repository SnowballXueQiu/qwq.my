import { getCollection } from "./database";
import { DEFAULT_PRESENCE } from "./default-content";
import type { PresencePayload, PresenceState } from "./presence-types";

const staleAfterMs = 45_000;

export async function getPresence(): Promise<PresenceState> {
  const collection = await getCollection("presence");
  if (collection) {
    const document = await collection.findOne({ _id: "current" }, { projection: { _id: 0 } });
    if (document) return withStaleStatus(document as PresenceState);
  }

  return DEFAULT_PRESENCE;
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

  const collection = await getCollection("presence");
  if (collection) {
    await collection.updateOne({ _id: "current" }, { $set: { ...next, _id: "current" } }, { upsert: true });
    return next;
  }

  throw new Error("MongoDB is required to update presence.");
}

function withStaleStatus(state: PresenceState): PresenceState {
  const stale = Date.now() - new Date(state.updatedAt).getTime() > staleAfterMs;
  return {
    ...state,
    status: stale ? "offline" : state.status,
    stale,
  };
}
