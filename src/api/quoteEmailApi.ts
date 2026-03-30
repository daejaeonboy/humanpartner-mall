import { auth } from "../firebase";

export interface QuoteEmailRecipient {
  email: string;
  enabled: boolean;
}

export interface QuoteEmailSettings {
  enabled: boolean;
  recipients: QuoteEmailRecipient[];
  updatedAt?: string;
  updatedByEmail?: string;
}

const SETTINGS_ENDPOINT = "/api/admin/quote-email-settings";
const QUOTE_REQUEST_NOTIFY_ENDPOINT = "/api/email/quote-request-notify";
const SETTINGS_FUNCTION_URL =
  import.meta.env.VITE_QUOTE_EMAIL_SETTINGS_FUNCTION_URL?.trim();
const QUOTE_REQUEST_NOTIFY_FUNCTION_URL =
  import.meta.env.VITE_QUOTE_REQUEST_NOTIFY_FUNCTION_URL?.trim();

const DEFAULT_SETTINGS: QuoteEmailSettings = {
  enabled: false,
  recipients: [],
};

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const getApiUrl = (endpoint: string, functionUrl?: string) =>
  isLocalhost && functionUrl ? functionUrl : endpoint;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const normalizeRecipients = (
  recipients: unknown,
): QuoteEmailRecipient[] => {
  if (!Array.isArray(recipients)) return [];

  const seen = new Set<string>();

  return recipients.reduce<QuoteEmailRecipient[]>((acc, recipient) => {
    if (!recipient || typeof recipient !== "object") return acc;

    const emailValue = "email" in recipient ? recipient.email : "";
    const enabledValue = "enabled" in recipient ? recipient.enabled : true;

    if (typeof emailValue !== "string") return acc;

    const email = normalizeEmail(emailValue);
    if (!email || seen.has(email)) return acc;

    seen.add(email);
    acc.push({
      email,
      enabled: enabledValue !== false,
    });
    return acc;
  }, []);
};

const normalizeSettings = (payload: unknown): QuoteEmailSettings => {
  if (!payload || typeof payload !== "object") return DEFAULT_SETTINGS;

  const enabled = "enabled" in payload ? payload.enabled === true : false;
  const updatedAt =
    "updatedAt" in payload && typeof payload.updatedAt === "string"
      ? payload.updatedAt
      : undefined;
  const updatedByEmail =
    "updatedByEmail" in payload && typeof payload.updatedByEmail === "string"
      ? payload.updatedByEmail
      : undefined;

  return {
    enabled,
    recipients: normalizeRecipients("recipients" in payload ? payload.recipients : []),
    updatedAt,
    updatedByEmail,
  };
};

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("로그인이 필요합니다.");
  }

  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

const parseJsonResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

const assertOk = async (response: Response) => {
  if (response.ok) return;

  const data = await parseJsonResponse(response);
  const message =
    (data && typeof data.error === "string" && data.error) ||
    (data && typeof data.message === "string" && data.message) ||
    "요청 처리에 실패했습니다.";

  throw new Error(message);
};

export const getQuoteEmailSettings = async (): Promise<QuoteEmailSettings> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    getApiUrl(SETTINGS_ENDPOINT, SETTINGS_FUNCTION_URL),
    {
    method: "GET",
    headers,
    },
  );

  await assertOk(response);
  const data = await parseJsonResponse(response);
  return normalizeSettings(data);
};

export const updateQuoteEmailSettings = async (
  settings: QuoteEmailSettings,
): Promise<QuoteEmailSettings> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    getApiUrl(SETTINGS_ENDPOINT, SETTINGS_FUNCTION_URL),
    {
    method: "PUT",
    headers,
    body: JSON.stringify({
      enabled: settings.enabled,
      recipients: normalizeRecipients(settings.recipients),
    }),
    },
  );

  await assertOk(response);
  const data = await parseJsonResponse(response);
  return normalizeSettings(data);
};

export const sendQuoteRequestNotificationEmail = async (
  bookingId: string,
): Promise<{ success?: boolean; skipped?: boolean; reason?: string }> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    getApiUrl(
      QUOTE_REQUEST_NOTIFY_ENDPOINT,
      QUOTE_REQUEST_NOTIFY_FUNCTION_URL,
    ),
    {
    method: "POST",
    headers,
    body: JSON.stringify({ bookingId }),
    },
  );

  await assertOk(response);
  const data = await parseJsonResponse(response);
  if (!data || typeof data !== "object") {
    return { success: true };
  }

  return {
    success: data.success === true,
    skipped: data.skipped === true,
    reason: typeof data.reason === "string" ? data.reason : undefined,
  };
};
