import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/db";

const MAX_QR_CHARS = 900_000; // ~0.7MB base64

function sanitizeQr(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!trimmed.startsWith("data:image/")) {
    throw new Error("QR must be an image data URL");
  }
  if (trimmed.length > MAX_QR_CHARS) {
    throw new Error("QR image is too large (max ~500KB)");
  }
  return trimmed;
}

export async function GET() {
  return NextResponse.json({ settings: getSettings() });
}

export async function PUT(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      whatsapp?: string;
      wechat?: string;
      whatsappQr?: string;
      wechatQr?: string;
    };
    const settings = updateSettings({
      whatsapp: body.whatsapp?.trim() ?? undefined,
      wechat: body.wechat?.trim() ?? undefined,
      whatsappQr: sanitizeQr(body.whatsappQr),
      wechatQr: sanitizeQr(body.wechatQr),
    });
    return NextResponse.json({ settings });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update settings" },
      { status: 400 }
    );
  }
}
