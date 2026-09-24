import { DEFAULT_SITE_CONTENT } from "./default-content";

export type MeProfile = typeof DEFAULT_SITE_CONTENT.me;

export function getMeProfile(): MeProfile {
  return DEFAULT_SITE_CONTENT.me;
}
