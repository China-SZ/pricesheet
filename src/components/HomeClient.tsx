"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Spreadsheet, {
  type SpreadsheetHandle,
} from "@/components/Spreadsheet";
import SiteHeader from "@/components/SiteHeader";
import ContactButtons from "@/components/ContactButtons";
import { appendImportedSheets, importXlsxFile } from "@/lib/import-xlsx";
import type { SheetData } from "@/lib/types";

type User = { id: string; username: string };

export default function HomeClient() {
  const sheetRef = useRef<SpreadsheetHandle>(null);
  const [data, setData] = useState<SheetData[] | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [wechat, setWechat] = useState("");
  const [whatsappQr, setWhatsappQr] = useState("");
  const [wechatQr, setWechatQr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "PriceSheet";
  const tagline =
    process.env.NEXT_PUBLIC_SITE_TAGLINE || "Online Price Spreadsheet";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sheetRes, meRes, settingsRes] = await Promise.all([
          fetch("/api/spreadsheet"),
          fetch("/api/auth/me"),
          fetch("/api/settings"),
        ]);
        if (!sheetRes.ok) throw new Error("Failed to load spreadsheet");
        const sheetJson = await sheetRes.json();
        const meJson = await meRes.json();
        const settingsJson = await settingsRes.json();
        if (cancelled) return;
        setData(sheetJson.data);
        setUser(meJson.user ?? null);
        setWhatsapp(settingsJson.settings?.whatsapp ?? "");
        setWechat(settingsJson.settings?.wechat ?? "");
        setWhatsappQr(settingsJson.settings?.whatsappQr ?? "");
        setWechatQr(settingsJson.settings?.wechatQr ?? "");
      } catch {
        if (!cancelled) setError("Failed to load data. Please refresh.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.reload();
  }, []);

  const handleSave = useCallback(() => {
    void sheetRef.current?.save();
  }, []);

  const handleImportFile = useCallback(
    async (file: File) => {
      setImporting(true);
      setSaveStatus("idle");
      try {
        const imported = await importXlsxFile(file);
        const current = sheetRef.current?.getSheets() ?? data ?? [];
        const merged = appendImportedSheets(current, imported);
        setData(merged);
        setSheetKey((k) => k + 1);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Import failed");
      } finally {
        setImporting(false);
      }
    },
    [data]
  );

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading latest prices...
      </div>
    );
  }

  const isAdmin = !!user;

  return (
    <div className="flex h-screen flex-col bg-white text-slate-900">
      <SiteHeader
        siteName={siteName}
        tagline={tagline}
        isAdmin={isAdmin}
        username={user?.username}
        saveStatus={isAdmin ? saveStatus : "idle"}
        importing={importing}
        onSave={handleSave}
        onImportFile={handleImportFile}
        onLogout={handleLogout}
      />
      <div className="shrink-0 bg-sky-50 px-4 py-2 text-center text-sm text-sky-900">
        Prices are updated in real-time. Use the tabs at the bottom to switch
        categories.
        {isAdmin &&
          " Import Excel (.xlsx) adds new sheets; click Save to publish."}
      </div>
      <main className="min-h-0 flex-1">
        <Spreadsheet
          key={`${isAdmin ? "edit" : "view"}-${sheetKey}`}
          ref={sheetRef}
          data={data}
          allowEdit={isAdmin}
          onSaveStatus={setSaveStatus}
        />
      </main>
      <ContactButtons
        whatsapp={whatsapp}
        wechat={wechat}
        whatsappQr={whatsappQr}
        wechatQr={wechatQr}
      />
    </div>
  );
}
