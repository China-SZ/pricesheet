"use client";

import { useRef } from "react";

type Props = {
  siteName: string;
  tagline: string;
  isAdmin: boolean;
  username?: string | null;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  importing?: boolean;
  onSave?: () => void;
  onImportFile?: (file: File) => void;
  onLogout?: () => void;
};

export default function SiteHeader({
  siteName,
  tagline,
  isAdmin,
  username,
  saveStatus = "idle",
  importing = false,
  onSave,
  onImportFile,
  onLogout,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const statusText =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : importing
            ? "Importing..."
            : null;

  return (
    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {siteName}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">{tagline}</p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
        {statusText && (
          <span
            className={
              saveStatus === "error"
                ? "text-red-600"
                : saveStatus === "saved"
                  ? "text-emerald-600"
                  : "text-slate-500"
            }
          >
            {statusText}
          </span>
        )}
        {isAdmin ? (
          <>
            <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">
              {username} · editing
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onImportFile?.(file);
              }}
            />
            <button
              type="button"
              disabled={importing || saveStatus === "saving"}
              onClick={() => fileRef.current?.click()}
              className="rounded border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Import
            </button>
            <button
              type="button"
              disabled={saveStatus === "saving" || importing}
              onClick={onSave}
              className="rounded bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saveStatus === "saving" ? "Saving..." : "Save"}
            </button>
            <a
              href="/admin"
              className="rounded border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Admin
            </a>
            <button
              type="button"
              onClick={onLogout}
              className="rounded border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Logout
            </button>
          </>
        ) : (
          <a
            href="/login"
            className="rounded border border-slate-200 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
          >
            Admin login
          </a>
        )}
      </div>
    </header>
  );
}
