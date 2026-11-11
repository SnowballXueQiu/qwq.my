import type { Locale } from "./i18n";

export type PostMeta = {
  slug: string;
  date: string;
  title: string;
  summary: string;
  tags: string[];
  /** The language the text is actually in; differs from the page's when we fell back. */
  lang: Locale;
};
