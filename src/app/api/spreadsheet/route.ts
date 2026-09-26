import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSpreadsheet, saveSpreadsheet } from "@/lib/db";
import type { SheetData } from "@/lib/types";

function isHidden(sheet: SheetData): boolean {
  return sheet.hide === 1 || sheet.hide === true;
}

/** Public viewers only see non-hidden sheets; keep one active. */
function forPublicView(sheets: SheetData[]): SheetData[] {
  const visible = sheets.filter((s) => !isHidden(s));
  if (visible.length === 0) return [];

  const hasActive = visible.some((s) => s.status === 1);
  if (hasActive) return visible;

  return visible.map((s, i) => ({
    ...s,
    status: i === 0 ? 1 : 0,
  }));
}

export async function GET() {
  try {
    const sheet = getSpreadsheet();
    const admin = await requireAdmin();
    const data = admin ? sheet.data : forPublicView(sheet.data);

    return NextResponse.json({
      data,
      updatedAt: sheet.updatedAt,
      updatedBy: sheet.updatedBy,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load spreadsheet" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { data?: SheetData[] };
    if (!body.data || !Array.isArray(body.data)) {
      return NextResponse.json(
        { error: "Invalid spreadsheet data" },
        { status: 400 }
      );
    }
    saveSpreadsheet(body.data, session.username ?? null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to save spreadsheet" },
      { status: 500 }
    );
  }
}
