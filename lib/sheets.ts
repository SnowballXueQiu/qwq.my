/** The seven drawing sheets of the home page, in scroll order. */
export const sheets = [
  "hero",
  "about",
  "skills",
  "projects",
  "timeline",
  "writing",
  "contact",
] as const;

export type SheetId = (typeof sheets)[number];

export const sheetNumber = (id: SheetId) =>
  String(sheets.indexOf(id) + 1).padStart(2, "0");
