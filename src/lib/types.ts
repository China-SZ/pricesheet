export type SheetData = Record<string, unknown>;

export type UserRow = {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
};

export type PublicUser = {
  id: string;
  username: string;
  createdAt: string;
};

export type Settings = {
  whatsapp: string;
  wechat: string;
  whatsappQr: string;
  wechatQr: string;
};

export type SessionData = {
  userId?: string;
  username?: string;
  isLoggedIn: boolean;
};
