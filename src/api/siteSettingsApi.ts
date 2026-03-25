import { supabase } from "../lib/supabase";

export interface SiteSetting {
  setting_key: string;
  setting_value: string;
  updated_at?: string;
}

const TABLE_NAME = "site_settings";

export const CS_CENTER_SETTING_KEYS = {
  phone: "cs_center_phone",
  business_hours_text: "cs_center_business_hours_text",
  chat_url: "cs_center_chat_url",
  chat_hours_text: "cs_center_chat_hours_text",
} as const;

export interface CSCenterSettings {
  phone: string;
  business_hours_text: string;
  chat_url: string;
  chat_hours_text: string;
}

export const DEFAULT_CS_CENTER_SETTINGS: CSCenterSettings = {
  phone: "1800-1985",
  business_hours_text: "고객행복센터(전화): 오전 9시 ~ 오후 6시 운영",
  chat_url: "https://pf.kakao.com/_iRxghX/chat",
  chat_hours_text: "채팅 상담 문의: 24시간 운영",
};

export const getSiteSettings = async (
  keys?: string[],
): Promise<Record<string, string>> => {
  let query = supabase.from(TABLE_NAME).select("setting_key, setting_value");
  if (keys && keys.length > 0) {
    query = query.in("setting_key", keys);
  }

  const { data, error } = await query;
  if (error) throw error;

  const records = data || [];
  return records.reduce<Record<string, string>>((acc, row) => {
    acc[row.setting_key] = row.setting_value;
    return acc;
  }, {});
};

export const upsertSiteSettings = async (
  settings: Record<string, string>,
): Promise<void> => {
  const payload = Object.entries(settings).map(([setting_key, setting_value]) => ({
    setting_key,
    setting_value,
  }));

  if (payload.length === 0) return;

  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: "setting_key" });

  if (error) throw error;
};

export const getCSCenterSettings = async (): Promise<CSCenterSettings> => {
  const settings = await getSiteSettings(Object.values(CS_CENTER_SETTING_KEYS));
  return {
    phone: settings[CS_CENTER_SETTING_KEYS.phone] || DEFAULT_CS_CENTER_SETTINGS.phone,
    business_hours_text:
      settings[CS_CENTER_SETTING_KEYS.business_hours_text] ||
      DEFAULT_CS_CENTER_SETTINGS.business_hours_text,
    chat_url:
      settings[CS_CENTER_SETTING_KEYS.chat_url] || DEFAULT_CS_CENTER_SETTINGS.chat_url,
    chat_hours_text:
      settings[CS_CENTER_SETTING_KEYS.chat_hours_text] ||
      DEFAULT_CS_CENTER_SETTINGS.chat_hours_text,
  };
};

export const upsertCSCenterSettings = async (
  settings: Partial<CSCenterSettings>,
): Promise<void> => {
  const payload: Record<string, string> = {};

  if (typeof settings.phone === "string") {
    payload[CS_CENTER_SETTING_KEYS.phone] = settings.phone;
  }
  if (typeof settings.business_hours_text === "string") {
    payload[CS_CENTER_SETTING_KEYS.business_hours_text] = settings.business_hours_text;
  }
  if (typeof settings.chat_url === "string") {
    payload[CS_CENTER_SETTING_KEYS.chat_url] = settings.chat_url;
  }
  if (typeof settings.chat_hours_text === "string") {
    payload[CS_CENTER_SETTING_KEYS.chat_hours_text] = settings.chat_hours_text;
  }

  await upsertSiteSettings(payload);
};
