import type { Locale } from "./i18n";

export type PostMeta = {
  slug: string;
  date: string;
  title: string;
  summary: string;
  tags: string[];
  /** Written by AI; the post shows an AIGC mark with a notice. */
  aigc: boolean;
  /** The language the text is actually in; differs from the page's when we fell back. */
  lang: Locale;
};
