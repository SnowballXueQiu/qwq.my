export type PresenceApp = {
  name: string;
  bundleIdentifier?: string;
  windowTitle?: string;
};

export type PresenceEditing = {
  isEditor: boolean;
  editor?: string;
  file?: string;
  workspace?: string;
  branch?: string;
};

export type PresenceDevice = {
  name: string;
  os: string;
  cpuUsagePercent?: number;
  memoryUsedPercent?: number;
  memoryUsedGB?: number;
  memoryTotalGB?: number;
};

export type PresencePayload = {
  status: "online" | "offline";
  location?: string;
  bpm?: number;
  device?: PresenceDevice;
  activeApp?: PresenceApp;
  editing?: PresenceEditing;
  sentAt?: string;
};

export type PresenceState = PresencePayload & {
  updatedAt: string;
  stale: boolean;
};
