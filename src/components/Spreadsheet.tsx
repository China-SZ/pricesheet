"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import type { SheetData } from "@/lib/types";

const Workbook = dynamic(
  () => import("@fortune-sheet/react").then((m) => m.Workbook),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading spreadsheet...
      </div>
    ),
  }
);

export type SpreadsheetHandle = {
  save: () => Promise<boolean>;
  getSheets: () => SheetData[];
};

type Props = {
  data: SheetData[];
  allowEdit: boolean;
  onSaveStatus?: (status: "idle" | "saving" | "saved" | "error") => void;
};

function matrixToCelldata(matrix: unknown[][]): unknown[] {
  const celldata: unknown[] = [];
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      if (row[c] != null) celldata.push({ r, c, v: row[c] });
    }
  }
  return celldata;
}

function countCells(sheets: SheetData[]): number {
  return sheets.reduce((sum, s) => {
    if (Array.isArray(s.celldata)) return sum + s.celldata.length;
    if (Array.isArray(s.data)) {
      let n = 0;
      for (const row of s.data as unknown[][]) {
        if (!row) continue;
        for (const cell of row) if (cell != null) n++;
      }
      return sum + n;
    }
    return sum;
  }, 0);
}

const Spreadsheet = forwardRef<SpreadsheetHandle, Props>(function Spreadsheet(
  { data, allowEdit, onSaveStatus },
  ref
) {
  const latestRef = useRef<SheetData[]>(data);
  const baselineCelldata = useRef<Record<string, unknown[]>>({});
  const initialCellCount = useRef(countCells(data));
  const [mounted, setMounted] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    latestRef.current = data;
    initialCellCount.current = countCells(data);
    for (const sheet of data) {
      const id = String(sheet.id ?? sheet.name ?? "");
      if (id && Array.isArray(sheet.celldata) && sheet.celldata.length > 0) {
        baselineCelldata.current[id] = sheet.celldata as unknown[];
      }
    }
  }, [data]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const buildPayload = useCallback(() => {
    return latestRef.current.map((sheet) => {
      const id = String(sheet.id ?? sheet.name ?? "");
      const matrix = sheet.data as unknown[][] | undefined;
      const existing = Array.isArray(sheet.celldata)
        ? (sheet.celldata as unknown[])
        : [];
      let celldata = existing;

      if (matrix && matrix.length > 0) {
        const fromMatrix = matrixToCelldata(matrix);
        if (
          fromMatrix.length > 0 &&
          (existing.length === 0 || fromMatrix.length >= existing.length * 0.3)
        ) {
          celldata = fromMatrix;
        }
      }

      if (celldata.length === 0 && id && baselineCelldata.current[id]) {
        celldata = baselineCelldata.current[id];
      }
      if (celldata.length > 0 && id) {
        baselineCelldata.current[id] = celldata;
      }

      return {
        name: sheet.name,
        id: sheet.id,
        status: sheet.status,
        order: sheet.order,
        hide: sheet.hide,
        row: sheet.row,
        column: sheet.column,
        config: sheet.config,
        celldata,
        zoomRatio: sheet.zoomRatio,
        images: sheet.images,
        frozen: sheet.frozen,
        calcChain: sheet.calcChain,
        defaultRowHeight: sheet.defaultRowHeight,
        defaultColWidth: sheet.defaultColWidth,
        showGridLines: sheet.showGridLines,
      } as SheetData;
    });
  }, []);

  const persist = useCallback(async () => {
    if (!allowEdit || savingRef.current) return false;

    const sheets = buildPayload();
    const nextCount = countCells(sheets);

    if (
      initialCellCount.current > 5 &&
      nextCount < initialCellCount.current * 0.3
    ) {
      console.warn("Skip save: payload looks incomplete", {
        initial: initialCellCount.current,
        next: nextCount,
      });
      onSaveStatus?.("error");
      return false;
    }

    savingRef.current = true;
    onSaveStatus?.("saving");
    try {
      const res = await fetch("/api/spreadsheet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: sheets }),
      });
      if (!res.ok) throw new Error("save failed");
      initialCellCount.current = Math.max(initialCellCount.current, nextCount);
      onSaveStatus?.("saved");
      setTimeout(() => onSaveStatus?.("idle"), 2000);
      return true;
    } catch {
      onSaveStatus?.("error");
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [allowEdit, buildPayload, onSaveStatus]);

  useImperativeHandle(
    ref,
    () => ({
      save: persist,
      getSheets: buildPayload,
    }),
    [persist, buildPayload]
  );

  const handleChange = useCallback((sheets: SheetData[]) => {
    latestRef.current = sheets;
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading spreadsheet...
      </div>
    );
  }

  return (
    <div className="h-full w-full [&_.fortune-container]:h-full">
      <Workbook
        data={data as never}
        onChange={handleChange as never}
        allowEdit={allowEdit}
        showToolbar={allowEdit}
        showFormulaBar={allowEdit}
        showSheetTabs
        lang="zh"
      />
    </div>
  );
});

export default Spreadsheet;
