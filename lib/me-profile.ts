import profile from "@/data/me-profile.json";

export type MeProfile = typeof profile;

export function getMeProfile(): MeProfile {
  return profile;
}
