"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; username: string; createdAt: string };

export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; username: string } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [wechat, setWechat] = useState("");
  const [whatsappQr, setWhatsappQr] = useState("");
  const [wechatQr, setWechatQr] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/auth/me");
      const meJson = await meRes.json();
      if (!meJson.user) {
        router.replace("/login");
        return;
      }
      setMe(meJson.user);

      const [adminsRes, settingsRes] = await Promise.all([
        fetch("/api/admins"),
        fetch("/api/settings"),
      ]);
      if (!adminsRes.ok) {
        setError("Failed to load admins");
        return;
      }
      const adminsJson = await adminsRes.json();
      const settingsJson = await settingsRes.json();
      setUsers(adminsJson.users);
      setWhatsapp(settingsJson.settings?.whatsapp ?? "");
      setWechat(settingsJson.settings?.wechat ?? "");
      setWhatsappQr(settingsJson.settings?.whatsappQr ?? "");
      setWechatQr(settingsJson.settings?.wechatQr ?? "");
    } catch {
      setError("Failed to load admin panel");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createAdmin(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch("/api/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, password: newPassword }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Create failed");
      return;
    }
    setNewUsername("");
    setNewPassword("");
    setMessage("Admin created");
    void load();
  }

  async function changePassword(id: string) {
    const password = window.prompt("New password (min 6 characters):");
    if (!password) return;
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/admins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Update failed");
      return;
    }
    setMessage("Password updated");
  }

  async function removeAdmin(id: string) {
    if (!window.confirm("Delete this admin?")) return;
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/admins/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Delete failed");
      return;
    }
    setMessage("Admin deleted");
    void load();
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsapp, wechat, whatsappQr, wechatQr }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Save failed");
      return;
    }
    setMessage("Contact settings saved");
  }

  function readQrFile(
    file: File | undefined,
    setter: (value: string) => void
  ) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }
    if (file.size > 500_000) {
      setError("QR image must be under 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setter(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
            <p className="text-sm text-slate-500">Signed in as {me?.username}</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Spreadsheet
            </a>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>

        {message && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Administrators</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {users.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div>
                  <div className="font-medium text-slate-800">{u.username}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(u.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => changePassword(u.id)}
                    className="rounded border border-slate-200 px-2.5 py-1 text-xs hover:bg-slate-50"
                  >
                    Change password
                  </button>
                  {u.id !== me?.id && (
                    <button
                      type="button"
                      onClick={() => removeAdmin(u.id)}
                      className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <form onSubmit={createAdmin} className="mt-4 grid gap-2 sm:grid-cols-3">
            <input
              placeholder="New username"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add admin
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Contact QR codes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload QR images (recommended for WeChat). WhatsApp can also
            auto-generate a QR from the phone/link if no image is uploaded.
          </p>
          <form onSubmit={saveSettings} className="mt-4 space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                WhatsApp phone or link
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+1234567890 or https://wa.me/..."
                />
              </label>
              <label className="block text-sm font-medium">
                WhatsApp QR image (optional)
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm font-normal"
                  onChange={(e) =>
                    readQrFile(e.target.files?.[0], setWhatsappQr)
                  }
                />
              </label>
              {whatsappQr && (
                <div className="flex items-end gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={whatsappQr}
                    alt="WhatsApp QR preview"
                    className="h-24 w-24 rounded border object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setWhatsappQr("")}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-4">
              <label className="block text-sm font-medium">
                WeChat ID (optional label)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                  value={wechat}
                  onChange={(e) => setWechat(e.target.value)}
                  placeholder="wechat_id"
                />
              </label>
              <label className="block text-sm font-medium">
                WeChat QR image
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm font-normal"
                  onChange={(e) => readQrFile(e.target.files?.[0], setWechatQr)}
                />
              </label>
              {wechatQr && (
                <div className="flex items-end gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={wechatQr}
                    alt="WeChat QR preview"
                    className="h-24 w-24 rounded border object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setWechatQr("")}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Save contacts
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
