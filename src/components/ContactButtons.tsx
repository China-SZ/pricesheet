"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type Props = {
  whatsapp?: string;
  wechat?: string;
  whatsappQr?: string;
  wechatQr?: string;
};

type Channel = "whatsapp" | "wechat";

function whatsappHref(value: string) {
  return value.startsWith("http")
    ? value
    : `https://wa.me/${value.replace(/\D/g, "")}`;
}

export default function ContactButtons({
  whatsapp,
  wechat,
  whatsappQr,
  wechatQr,
}: Props) {
  const [open, setOpen] = useState<Channel | null>(null);

  const showWhatsapp = !!(whatsapp || whatsappQr);
  const showWechat = !!(wechat || wechatQr);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const whatsappLink = useMemo(
    () => (whatsapp ? whatsappHref(whatsapp) : ""),
    [whatsapp]
  );

  if (!showWhatsapp && !showWechat) return null;

  return (
    <>
      <div className="fixed bottom-16 right-4 z-50 flex flex-col gap-3">
        {showWhatsapp && (
          <button
            type="button"
            onClick={() => setOpen("whatsapp")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:brightness-95"
            aria-label="WhatsApp QR"
            title="WhatsApp"
          >
            <WhatsAppIcon />
          </button>
        )}
        {showWechat && (
          <button
            type="button"
            onClick={() => setOpen("wechat")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#07C160] text-white shadow-lg hover:brightness-95"
            aria-label="WeChat QR"
            title="WeChat"
          >
            <WeChatIcon />
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-5 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900">
              {open === "whatsapp" ? "WhatsApp" : "WeChat"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Scan the QR code to contact us
            </p>
            <div className="mt-4 flex justify-center">
              {open === "whatsapp" ? (
                whatsappQr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={whatsappQr}
                    alt="WhatsApp QR"
                    className="h-52 w-52 rounded-lg object-contain"
                  />
                ) : whatsappLink ? (
                  <QRCodeSVG value={whatsappLink} size={208} />
                ) : null
              ) : wechatQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={wechatQr}
                  alt="WeChat QR"
                  className="h-52 w-52 rounded-lg object-contain"
                />
              ) : wechat ? (
                <QRCodeSVG value={wechat} size={208} />
              ) : null}
            </div>
            {open === "whatsapp" && whatsapp && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-sm font-medium text-[#25D366] hover:underline"
              >
                Open WhatsApp
              </a>
            )}
            {open === "wechat" && wechat && (
              <p className="mt-4 text-sm text-slate-600">ID: {wechat}</p>
            )}
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function WeChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.168-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.934 2.595-6.458.09-.057.182-.106.273-.16-.39-3.55-3.748-6.214-7.68-6.214zm-2.99 5.617c-.55 0-.998-.445-.998-.995s.448-.995.998-.995.998.445.998.995-.448.995-.998.995zm5.98 0c-.55 0-.998-.445-.998-.995s.448-.995.998-.995.998.445.998.995-.448.995-.998.995z" />
      <path d="M22.5 15.188c0-3.417-3.197-6.188-7.14-6.188-3.943 0-7.14 2.771-7.14 6.188s3.197 6.188 7.14 6.188c.77 0 1.51-.1 2.205-.278a.68.68 0 01.562.077l1.49.872a.256.256 0 00.132.042c.127 0 .228-.103.228-.23 0-.056-.023-.112-.038-.167l-.305-1.16a.463.463 0 01.167-.52C21.59 18.52 22.5 16.95 22.5 15.188zm-9.48-1.555c-.43 0-.78-.35-.78-.78s.35-.78.78-.78.78.35.78.78-.35.78-.78.78zm4.68 0c-.43 0-.78-.35-.78-.78s.35-.78.78-.78.78.35.78.78-.35.78-.78.78z" />
    </svg>
  );
}
