import type { SheetData } from "./types";

type LuckyExport = {
  sheets?: SheetData[];
  info?: { name?: string };
};

function uniqueName(base: string, used: Set<string>): string {
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base} (${i})`)) i += 1;
  return `${base} (${i})`;
}

function normalizeImportedSheet(sheet: SheetData, index: number): SheetData {
  return {
    name: (sheet.name as string) || `Sheet${index + 1}`,
    id: `sheet-${crypto.randomUUID()}`,
    status: 0,
    order: index,
    row: typeof sheet.row === "number" ? sheet.row : 84,
    column: typeof sheet.column === "number" ? sheet.column : 60,
    celldata: Array.isArray(sheet.celldata) ? sheet.celldata : [],
    config: sheet.config ?? {},
    freeze: sheet.freeze,
    frozen: sheet.frozen,
    images: sheet.images,
    calcChain: sheet.calcChain,
    zoomRatio: sheet.zoomRatio ?? 1,
    defaultRowHeight: sheet.defaultRowHeight,
    defaultColWidth: sheet.defaultColWidth,
    showGridLines: sheet.showGridLines,
  };
}

/** Append imported sheets after existing ones (does not replace). */
export function appendImportedSheets(
  existing: SheetData[],
  imported: SheetData[]
): SheetData[] {
  const usedNames = new Set(
    existing.map((s) => String(s.name ?? "")).filter(Boolean)
  );
  const startOrder = existing.reduce((max, s) => {
    const o = typeof s.order === "number" ? s.order : 0;
    return Math.max(max, o);
  }, -1);

  const existingKept = existing.map((s) => ({
    ...s,
    status: 0,
  }));

  const appended = imported.map((raw, i) => {
    const sheet = normalizeImportedSheet(raw, i);
    const name = uniqueName(String(sheet.name), usedNames);
    usedNames.add(name);
    return {
      ...sheet,
      name,
      order: startOrder + 1 + i,
      // Activate the first newly imported sheet
      status: i === 0 ? 1 : 0,
    };
  });

  return [...existingKept, ...appended];
}

/** Parse an .xlsx File into FortuneSheet-compatible sheet data. */
export async function importXlsxFile(file: File): Promise<SheetData[]> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Only .xlsx files are supported");
  }

  const LuckyExcel = (await import("luckyexcel")).default;

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error("Import timed out or failed to parse the file"));
      }
    }, 30000);

    try {
      LuckyExcel.transformExcelToLucky(file, (exportJson) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const sheets = exportJson?.sheets as SheetData[] | undefined;
        if (!sheets || !Array.isArray(sheets) || sheets.length === 0) {
          reject(new Error("No sheets found in this Excel file"));
          return;
        }
        resolve(sheets.map((s, i) => normalizeImportedSheet(s, i)));
      });
    } catch (e) {
      settled = true;
      clearTimeout(timer);
      reject(e instanceof Error ? e : new Error("Failed to import Excel"));
    }
  });
}
