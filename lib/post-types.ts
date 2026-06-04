export type Topic = "all" | "design" | "frontend" | "systems";
export type SortMode = "newest" | "oldest" | "short";
export type PostColor = "pink" | "violet" | "blue";

export type Post = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  topic: Exclude<Topic, "all">;
  tags: string[];
  read: number;
  color: PostColor;
  content: string[];
};
