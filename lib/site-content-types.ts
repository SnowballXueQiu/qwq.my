import type { PostColor } from "./post-types";

export type SiteProject = {
  title: string;
  summary: string;
  status: string;
  tags: string[];
  color: PostColor | "mint";
};

export type FriendLink = {
  name: string;
  url: string;
  description: string;
};

export type MeCard = {
  title: string;
  summary: string;
};

export type StatisticItem = {
  label: string;
  value: string;
  note: string;
};

export type SiteLink = {
  label: string;
  url: string;
  note: string;
};

export type SiteAbout = {
  copyright: string;
};

export type SiteSettings = {
  title: string;
  description: string;
  faviconUrl: string;
  brandName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroTagline: string;
  heroImageUrl: string;
  heroImageAlt: string;
  primaryButtonLabel: string;
  secondaryButtonLabel: string;
  projectsIntro: string;
  githubUrl: string;
  xUrl: string;
  email: string;
};

export type SiteContent = {
  site: SiteSettings;
  me: MeCard[];
  projects: SiteProject[];
  friends: FriendLink[];
  about: SiteAbout;
};
