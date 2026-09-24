import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { title?: string; content?: string };
  const title = body.title?.trim() || "Untitled";
  const content = body.content?.trim() || "";
  if (!content) {
    return NextResponse.json({ error: "Missing content." }, { status: 400 });
  }

  const summary = await summarizeWithBedrock(title, content).catch(() => fallbackSummary(content));
  return NextResponse.json({ summary });
}

async function summarizeWithBedrock(title: string, content: string) {
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const region = process.env.AWS_REGION ?? "us-east-1";
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!token || !modelId) return fallbackSummary(content);

  const response = await fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 160,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Summarize this blog post in one concise sentence. Return only the sentence.\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 12000)}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) return fallbackSummary(content);
  const result = (await response.json()) as { content?: Array<{ text?: string }> };
  return result.content?.map((item) => item.text).filter(Boolean).join(" ").trim() || fallbackSummary(content);
}

function fallbackSummary(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/:::[\s\S]*?:::/g, "")
    .replace(/[#*_`$|>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}
