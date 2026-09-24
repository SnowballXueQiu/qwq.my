export function parsePostDate(value: string) {
  return new Date(value.replace(",", "")).getTime();
}
