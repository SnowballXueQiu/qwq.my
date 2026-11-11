import { locale as rootLocale } from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "./i18n";

const dictionaries = {
  zh: () => import("@/messages/zh.json").then((m) => m.default),
  en: () => import("@/messages/en.json").then((m) => m.default),
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["zh"]>>;

export async function getLocale(): Promise<Locale> {
  const value = await rootLocale();
  if (!hasLocale(value)) notFound();
  return value;
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()]();
}
