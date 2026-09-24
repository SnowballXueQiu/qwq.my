export function estimateReadTime(content: string) {
  const plain = String(content ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/:::[\s\S]*?:::/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ");
  const latinWords = plain.match(/[A-Za-z0-9]+/g)?.length ?? 0;
  const cjkChars = plain.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  return Math.max(1, Math.ceil((latinWords + cjkChars / 2) / 220));
}
