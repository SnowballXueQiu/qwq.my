import type { PostColor } from "./post-types";

export type SiteProject = {
  title: string;
  summary: string;
  status: string;
  tags: string[];
  color: PostColor | "mint";
  githubUrl: string;
};

export type FriendLink = {
  name: string;
  url: string;
  description: string;
};

export type MeModuleItem = {
  title: string;
  subtitle: string;
  url: string;
  meta: string;
  color?: PostColor | "mint" | "yellow";
  past?: boolean;
};

export type MeModuleLink = {
  label: string;
  value: string;
  url: string;
  enabled: boolean;
};

export type MeCard = {
  id: string;
  kind: "intro" | "links" | "timeline" | "skills" | "text";
  summary: string;
  title: string;
  enabled: boolean;
  imageUrl?: string;
  imageAlt?: string;
  items: MeModuleItem[];
  links: MeModuleLink[];
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
  projectsIntro: string;
  githubUrl: string;
  xUrl: string;
  email: string;
  showGithub: boolean;
  showX: boolean;
  showEmail: boolean;
};

export type SiteContent = {
  site: SiteSettings;
  me: MeCard[];
  projects: SiteProject[];
  friends: FriendLink[];
  about: SiteAbout;
};
