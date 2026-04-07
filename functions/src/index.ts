import * as admin from "firebase-admin";
import * as cors from "cors";
import * as dotenv from "dotenv";
import * as functions from "firebase-functions/v1";
import * as https from "https";
import * as nodemailer from "nodemailer";

dotenv.config();

const corsHandler = cors({ origin: true });

if (!admin.apps.length) {
  admin.initializeApp();
}

const DEFAULT_APP_BASE_URL = "https://rentalpartner.kr";
const QUOTE_EMAIL_SETTINGS_KEY = "quote_email_notifications";
const QUOTE_EMAIL_DISPATCH_KEY_PREFIX = "quote_email_dispatch:";

interface QuoteEmailRecipient {
  email: string;
  enabled: boolean;
}

interface QuoteEmailSettingsResponse {
  enabled: boolean;
  recipients: QuoteEmailRecipient[];
  updatedAt?: string;
  updatedByUid?: string;
  updatedByEmail?: string;
}

interface QuoteEmailSettingsStored {
  enabled: boolean;
  recipients: QuoteEmailRecipient[];
  updatedByUid?: string;
  updatedByEmail?: string;
}

interface QuoteEmailDispatchRecord {
  bookingId: string;
  status: string;
  updatedAt?: string;
  reason?: string;
  recipients?: string[];
  productName?: string;
  userId?: string;
  sentAt?: string;
  failedAt?: string;
  errorMessage?: string;
}

interface SupabaseSiteSettingRow {
  setting_key: string;
  setting_value: string;
  updated_at?: string;
}

interface SupabaseUserProfileRow {
  firebase_uid: string;
  email?: string;
  name?: string;
  phone?: string;
  company_name?: string;
  is_admin?: boolean;
}

interface SelectedOption {
  name?: string;
  quantity?: number;
  price?: number;
}

interface BasicComponent {
  name?: string;
  quantity?: number;
  model_name?: string;
}

interface SupabaseBookingRow {
  id: string;
  product_id: string;
  user_id: string;
  user_email?: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  selected_options?: SelectedOption[];
  basic_components?: BasicComponent[];
  created_at?: string;
}

interface SupabaseProductRow {
  id: string;
  name?: string;
  image_url?: string;
}

type JsonRecord = Record<string, unknown>;

const normalizeEnvValue = (value?: string) => {
  if (!value) {
    return "";
  }
  return value.trim().replace(/^['"]|['"]$/g, "");
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatPrice = (amount?: number) =>
  new Intl.NumberFormat("ko-KR").format(
    typeof amount === "number" && Number.isFinite(amount) ? amount : 0,
  );

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getAppBaseUrl = () =>
  normalizeEnvValue(process.env.APP_BASE_URL) || DEFAULT_APP_BASE_URL;

const createTransporter = () => {
  const emailUser = normalizeEnvValue(process.env.EMAIL_USER);
  const emailPass = normalizeEnvValue(process.env.EMAIL_PASS);
  const emailFromName = normalizeEnvValue(process.env.EMAIL_FROM_NAME) || "렌탈어때";
  const smtpHost = normalizeEnvValue(process.env.SMTP_HOST);
  const smtpPort = parseInt(normalizeEnvValue(process.env.SMTP_PORT) || "587", 10);
  const smtpSecure = normalizeEnvValue(process.env.SMTP_SECURE) === "true";

  if (!emailUser || !emailPass) {
    throw new Error("Missing SMTP credentials");
  }

  const transporter = smtpHost
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      })
    : nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });

  return {
    transporter,
    emailUser,
    emailFromName,
  };
};

const sendJsonError = (
  res: functions.Response,
  statusCode: number,
  message: string,
) => {
  res.status(statusCode).json({ error: message });
};

const withCors = (
  req: functions.Request,
  res: functions.Response,
  handler: () => Promise<void>,
) => {
  corsHandler(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      await handler();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      console.error("[Functions] Unhandled error:", error);
      sendJsonError(res, 500, message);
    }
  });
};

const getBearerToken = (req: functions.Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return "";
  }
  return authHeader.slice("Bearer ".length).trim();
};

const requireAuthUser = async (req: functions.Request) => {
  const token = getBearerToken(req);
  if (!token) {
    throw new Error("인증 토큰이 없습니다.");
  }

  try {
    return await admin.auth().verifyIdToken(token);
  } catch (error) {
    console.error("[Auth] Failed to verify Firebase ID token:", error);
    throw new Error("인증에 실패했습니다.");
  }
};

const requestJson = async <T>(
  url: URL,
  options: https.RequestOptions,
  body?: string,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const request = https.request(url, options, (response) => {
      let rawData = "";

      response.on("data", (chunk) => {
        rawData += chunk;
      });

      response.on("end", () => {
        const statusCode = response.statusCode || 500;
        const hasBody = rawData.trim().length > 0;

        if (statusCode < 200 || statusCode >= 300) {
          let errorMessage = rawData || `Request failed with status ${statusCode}`;
          if (hasBody) {
            try {
              const parsed = JSON.parse(rawData) as JsonRecord;
              if (typeof parsed.message === "string") {
                errorMessage = parsed.message;
              } else if (typeof parsed.error === "string") {
                errorMessage = parsed.error;
              }
            } catch {
              // Ignore JSON parsing error and fall back to raw text.
            }
          }
          reject(new Error(errorMessage));
          return;
        }

        if (!hasBody) {
          resolve(undefined as T);
          return;
        }

        try {
          resolve(JSON.parse(rawData) as T);
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });

const getSupabaseConfig = () => {
  const supabaseUrl = normalizeEnvValue(process.env.SUPABASE_URL);
  const supabaseApiKey =
    normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    normalizeEnvValue(process.env.SUPABASE_ANON_KEY);

  if (!supabaseUrl || !supabaseApiKey) {
    throw new Error("Missing Supabase API credentials");
  }

  return { supabaseUrl, supabaseApiKey };
};

const supabaseSelect = async <T>(
  table: string,
  params: Record<string, string>,
): Promise<T[]> => {
  const { supabaseUrl, supabaseApiKey } = getSupabaseConfig();
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return requestJson<T[]>(url, {
    method: "GET",
    headers: {
      apikey: supabaseApiKey,
      Authorization: `Bearer ${supabaseApiKey}`,
      Accept: "application/json",
    },
  });
};

const supabaseUpsert = async (
  table: string,
  rows: JsonRecord[],
  onConflict: string,
) => {
  const { supabaseUrl, supabaseApiKey } = getSupabaseConfig();
  const url = new URL(`/rest/v1/${table}`, supabaseUrl);
  url.searchParams.set("on_conflict", onConflict);

  await requestJson<void>(
    url,
    {
      method: "POST",
      headers: {
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
    },
    JSON.stringify(rows),
  );
};

const getUserProfileByFirebaseUid = async (
  firebaseUid: string,
): Promise<SupabaseUserProfileRow | null> => {
  const profiles = await supabaseSelect<SupabaseUserProfileRow>("user_profiles", {
    select: "firebase_uid,email,name,phone,company_name,is_admin",
    firebase_uid: `eq.${firebaseUid}`,
    limit: "1",
  });

  return profiles[0] || null;
};

const requireAdminUser = async (req: functions.Request) => {
  const decodedToken = await requireAuthUser(req);
  const profile = await getUserProfileByFirebaseUid(decodedToken.uid);

  if (!profile?.is_admin) {
    throw new Error("관리자 권한이 필요합니다.");
  }

  return {
    decodedToken,
    profile,
  };
};

const sanitizeRecipients = (raw: unknown): QuoteEmailRecipient[] => {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();

  return raw.reduce<QuoteEmailRecipient[]>((acc, recipient) => {
    if (!recipient || typeof recipient !== "object") {
      return acc;
    }

    const emailValue =
      "email" in recipient && typeof recipient.email === "string"
        ? recipient.email
        : "";
    const enabledValue =
      "enabled" in recipient ? recipient.enabled !== false : true;
    const email = normalizeEmail(emailValue);

    if (!email || !isValidEmail(email) || seen.has(email)) {
      return acc;
    }

    seen.add(email);
    acc.push({
      email,
      enabled: enabledValue,
    });
    return acc;
  }, []);
};

const parseJsonRecord = (value?: string): JsonRecord => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonRecord)
      : {};
  } catch {
    return {};
  }
};

const getSiteSetting = async (
  settingKey: string,
): Promise<SupabaseSiteSettingRow | null> => {
  const rows = await supabaseSelect<SupabaseSiteSettingRow>("site_settings", {
    select: "setting_key,setting_value,updated_at",
    setting_key: `eq.${settingKey}`,
    limit: "1",
  });

  return rows[0] || null;
};

const upsertSiteSetting = async (settingKey: string, settingValue: string) => {
  await supabaseUpsert(
    "site_settings",
    [
      {
        setting_key: settingKey,
        setting_value: settingValue,
      },
    ],
    "setting_key",
  );
};

const toQuoteEmailSettingsResponse = (
  row?: SupabaseSiteSettingRow | null,
): QuoteEmailSettingsResponse => {
  const data = parseJsonRecord(row?.setting_value);

  return {
    enabled: data.enabled === true,
    recipients: sanitizeRecipients(data.recipients),
    updatedAt: row?.updated_at,
    updatedByUid:
      typeof data.updatedByUid === "string" ? data.updatedByUid : undefined,
    updatedByEmail:
      typeof data.updatedByEmail === "string" ? data.updatedByEmail : undefined,
  };
};

const getQuoteEmailSettings = async (): Promise<QuoteEmailSettingsResponse> => {
  const row = await getSiteSetting(QUOTE_EMAIL_SETTINGS_KEY);
  if (!row) {
    return {
      enabled: false,
      recipients: [],
    };
  }

  return toQuoteEmailSettingsResponse(row);
};

const buildQuoteEmailSettingsPayload = (
  body: unknown,
  updatedByUid: string,
  updatedByEmail?: string,
): QuoteEmailSettingsStored => {
  const data = body && typeof body === "object" ? (body as JsonRecord) : {};

  return {
    enabled: data.enabled === true,
    recipients: sanitizeRecipients(data.recipients),
    updatedByUid,
    updatedByEmail,
  };
};

const getDispatchSettingKey = (bookingId: string) =>
  `${QUOTE_EMAIL_DISPATCH_KEY_PREFIX}${bookingId}`;

const getDispatchRecord = async (bookingId: string) =>
  parseJsonRecord((await getSiteSetting(getDispatchSettingKey(bookingId)))?.setting_value);

const saveDispatchRecord = async (bookingId: string, payload: JsonRecord) => {
  await upsertSiteSetting(
    getDispatchSettingKey(bookingId),
    JSON.stringify({
      ...payload,
      updatedAt: new Date().toISOString(),
    }),
  );
};

const toQuoteEmailDispatchRecord = (
  row: SupabaseSiteSettingRow,
): QuoteEmailDispatchRecord | null => {
  const data = parseJsonRecord(row.setting_value);
  const rawBookingId =
    typeof data.bookingId === "string"
      ? data.bookingId
      : row.setting_key.startsWith(QUOTE_EMAIL_DISPATCH_KEY_PREFIX)
        ? row.setting_key.slice(QUOTE_EMAIL_DISPATCH_KEY_PREFIX.length)
        : "";

  if (!rawBookingId) {
    return null;
  }

  return {
    bookingId: rawBookingId,
    status: typeof data.status === "string" ? data.status : "unknown",
    updatedAt:
      typeof data.updatedAt === "string" ? data.updatedAt : row.updated_at,
    reason: typeof data.reason === "string" ? data.reason : undefined,
    recipients: Array.isArray(data.recipients)
      ? data.recipients.filter(
          (recipient): recipient is string => typeof recipient === "string",
        )
      : undefined,
    productName:
      typeof data.productName === "string" ? data.productName : undefined,
    userId: typeof data.userId === "string" ? data.userId : undefined,
    sentAt: typeof data.sentAt === "string" ? data.sentAt : undefined,
    failedAt: typeof data.failedAt === "string" ? data.failedAt : undefined,
    errorMessage:
      typeof data.errorMessage === "string" ? data.errorMessage : undefined,
  };
};

const getRecentQuoteEmailDispatches = async (
  limit = 20,
): Promise<QuoteEmailDispatchRecord[]> => {
  const rows = await supabaseSelect<SupabaseSiteSettingRow>("site_settings", {
    select: "setting_key,setting_value,updated_at",
    setting_key: `like.${QUOTE_EMAIL_DISPATCH_KEY_PREFIX}*`,
    order: "updated_at.desc",
    limit: String(limit),
  });

  return rows
    .map((row) => toQuoteEmailDispatchRecord(row))
    .filter(
      (record): record is QuoteEmailDispatchRecord =>
        Boolean(record && record.bookingId),
    );
};

const getActiveRecipientEmails = (settings: QuoteEmailSettingsResponse) =>
  settings.recipients
    .filter((recipient) => recipient.enabled)
    .map((recipient) => recipient.email);

const getBookingById = async (
  bookingId: string,
): Promise<SupabaseBookingRow | null> => {
  const bookings = await supabaseSelect<SupabaseBookingRow>("bookings", {
    select:
      "id,product_id,user_id,user_email,start_date,end_date,total_price,status,selected_options,basic_components,created_at",
    id: `eq.${bookingId}`,
    limit: "1",
  });

  return bookings[0] || null;
};

const getProductById = async (
  productId: string,
): Promise<SupabaseProductRow | null> => {
  const products = await supabaseSelect<SupabaseProductRow>("products", {
    select: "id,name,image_url",
    id: `eq.${productId}`,
    limit: "1",
  });

  return products[0] || null;
};

const renderSelectedOptionsHtml = (selectedOptions?: SelectedOption[]) => {
  if (!selectedOptions || selectedOptions.length === 0) {
    return `<p style="margin: 0; color: #64748b; font-size: 14px;">추가 선택 옵션 없음</p>`;
  }

  const rows = selectedOptions
    .map((option) => {
      const name = escapeHtml(option.name || "옵션");
      const quantity =
        typeof option.quantity === "number" && Number.isFinite(option.quantity)
          ? option.quantity
          : 0;
      const subtotal =
        typeof option.price === "number" && Number.isFinite(option.price)
          ? option.price * quantity
          : 0;

      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a;">${name}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 14px; color: #334155;">${quantity}개</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 14px; color: #0f172a;">${formatPrice(subtotal)}원</td>
        </tr>
      `;
    })
    .join("");

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
      <thead>
        <tr style="background: #f8fafc;">
          <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b;">옵션</th>
          <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #64748b;">수량</th>
          <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #64748b;">예상 금액</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const buildQuoteRequestEmailContent = (
  booking: SupabaseBookingRow,
  product: SupabaseProductRow | null,
  userProfile: SupabaseUserProfileRow | null,
) => {
  const customerName = userProfile?.name || "고객";
  const companyName = userProfile?.company_name || "-";
  const phone = userProfile?.phone || "-";
  const email = userProfile?.email || booking.user_email || "-";
  const productName = product?.name || booking.product_id;
  const adminUrl = `${getAppBaseUrl()}/admin/rental-requests`;

  const subject = `[렌탈어때] 신규 견적 요청 - ${customerName} / ${productName}`;

  const text = [
    "신규 견적 요청이 접수되었습니다.",
    `고객명: ${customerName}`,
    `회사명: ${companyName}`,
    `연락처: ${phone}`,
    `이메일: ${email}`,
    `상품명: ${productName}`,
    `대여기간: ${formatDate(booking.start_date)} ~ ${formatDate(booking.end_date)}`,
    `예상 금액: ${formatPrice(booking.total_price)}원`,
    `관리자 확인: ${adminUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px;">
      <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="padding: 24px 28px; background: linear-gradient(135deg, #001E45 0%, #2A8FC2 100%); color: #ffffff;">
          <div style="font-size: 13px; opacity: 0.8; margin-bottom: 8px;">Rentalpartner Admin Notification</div>
          <h1 style="margin: 0; font-size: 24px; line-height: 1.4;">신규 견적 요청이 접수되었습니다.</h1>
          <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">
            관리자 페이지에서 상세 내용을 확인하고 후속 안내를 진행해주세요.
          </p>
        </div>

        <div style="padding: 28px;">
          <div style="display: grid; gap: 16px; margin-bottom: 24px;">
            <div style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 12px;">고객 정보</div>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr>
                    <td style="padding: 6px 0; width: 110px; font-size: 14px; color: #64748b;">고객명</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700;">${escapeHtml(customerName)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #64748b;">회사명</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${escapeHtml(companyName)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #64748b;">연락처</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${escapeHtml(phone)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #64748b;">이메일</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${escapeHtml(email)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <div style="font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 12px;">요청 정보</div>
              <table style="width: 100%; border-collapse: collapse;">
                <tbody>
                  <tr>
                    <td style="padding: 6px 0; width: 110px; font-size: 14px; color: #64748b;">상품명</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700;">${escapeHtml(productName)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #64748b;">대여기간</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${escapeHtml(formatDate(booking.start_date))} ~ ${escapeHtml(formatDate(booking.end_date))}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #64748b;">예상 금액</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${formatPrice(booking.total_price)}원</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #64748b;">접수 시각</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #0f172a;">${escapeHtml(formatDate(booking.created_at))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style="padding: 18px; border: 1px solid #e2e8f0; border-radius: 16px; margin-bottom: 24px;">
            <div style="font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 12px;">추가 선택 옵션</div>
            ${renderSelectedOptionsHtml(booking.selected_options)}
          </div>

          <a
            href="${escapeHtml(adminUrl)}"
            style="display: inline-block; padding: 14px 18px; border-radius: 12px; background: #001E45; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px;"
          >
            관리자에서 요청 확인하기
          </a>
        </div>
      </div>
    </div>
  `;

  return {
    subject,
    html,
    text,
  };
};

export const sendEmailVerification = functions.https.onRequest((req, res) => {
  withCors(req, res, async () => {
    if (req.method !== "POST") {
      sendJsonError(res, 405, "Method Not Allowed");
      return;
    }

    const { to, subject, html } = req.body as {
      to?: string;
      subject?: string;
      html?: string;
    };

    if (!to || !subject || !html) {
      sendJsonError(res, 400, "Missing required fields (to, subject, html)");
      return;
    }

    const { transporter, emailUser, emailFromName } = createTransporter();

    const info = await transporter.sendMail({
      from: `"${emailFromName}" <${emailUser}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully:", info.response);
    res.status(200).json({ message: "Email sent successfully", info });
  });
});

export const manageQuoteEmailSettings = functions.https.onRequest((req, res) => {
  withCors(req, res, async () => {
    if (req.method !== "GET" && req.method !== "PUT") {
      sendJsonError(res, 405, "Method Not Allowed");
      return;
    }

    try {
      const { decodedToken, profile } = await requireAdminUser(req);

      if (req.method === "GET") {
        const settings = await getQuoteEmailSettings();
        const includeDispatches =
          typeof req.query.includeDispatches === "string" &&
          req.query.includeDispatches === "true";
        const rawLimit =
          typeof req.query.dispatchLimit === "string"
            ? parseInt(req.query.dispatchLimit, 10)
            : 20;
        const dispatchLimit =
          Number.isFinite(rawLimit) && rawLimit > 0
            ? Math.min(rawLimit, 50)
            : 20;

        if (!includeDispatches) {
          res.status(200).json(settings);
          return;
        }

        const dispatches = await getRecentQuoteEmailDispatches(dispatchLimit);
        res.status(200).json({
          ...settings,
          dispatches,
        });
        return;
      }

      const payload = buildQuoteEmailSettingsPayload(
        req.body,
        decodedToken.uid,
        profile.email || decodedToken.email,
      );

      await upsertSiteSetting(QUOTE_EMAIL_SETTINGS_KEY, JSON.stringify(payload));
      const savedSettings = await getQuoteEmailSettings();
      res.status(200).json(savedSettings);
    } catch (error) {
      const message = error instanceof Error ? error.message : "관리자 인증에 실패했습니다.";
      const statusCode =
        message === "관리자 권한이 필요합니다." || message === "인증에 실패했습니다."
          ? 403
          : message === "인증 토큰이 없습니다."
            ? 401
            : 500;
      console.error("[QuoteEmailSettings] Failed to handle request:", error);
      sendJsonError(res, statusCode, message);
    }
  });
});

export const sendQuoteRequestNotification = functions.https.onRequest((req, res) => {
  withCors(req, res, async () => {
    if (req.method !== "POST") {
      sendJsonError(res, 405, "Method Not Allowed");
      return;
    }

    try {
      const decodedToken = await requireAuthUser(req);
      const bookingId =
        req.body && typeof req.body.bookingId === "string"
          ? req.body.bookingId.trim()
          : "";

      if (!bookingId) {
        sendJsonError(res, 400, "bookingId is required");
        return;
      }

      const existingDispatch = await getDispatchRecord(bookingId);
      if (existingDispatch.status === "sent") {
        res.status(200).json({
          success: true,
          skipped: true,
          reason: "already_sent",
        });
        return;
      }

      const settings = await getQuoteEmailSettings();
      if (!settings.enabled) {
        await saveDispatchRecord(bookingId, {
          status: "skipped",
          reason: "disabled",
          bookingId,
          userId: decodedToken.uid,
        });
        res.status(200).json({ success: true, skipped: true, reason: "disabled" });
        return;
      }

      const recipients = getActiveRecipientEmails(settings);
      if (recipients.length === 0) {
        await saveDispatchRecord(bookingId, {
          status: "skipped",
          reason: "no_recipients",
          bookingId,
          userId: decodedToken.uid,
        });
        res.status(200).json({
          success: true,
          skipped: true,
          reason: "no_recipients",
        });
        return;
      }

      const booking = await getBookingById(bookingId);
      if (!booking) {
        sendJsonError(res, 404, "견적 요청 정보를 찾을 수 없습니다.");
        return;
      }

      if (booking.user_id !== decodedToken.uid) {
        sendJsonError(res, 403, "본인 요청에 대해서만 알림 메일을 보낼 수 있습니다.");
        return;
      }

      const [product, userProfile] = await Promise.all([
        getProductById(booking.product_id),
        getUserProfileByFirebaseUid(booking.user_id),
      ]);

      const { transporter, emailUser, emailFromName } = createTransporter();
      const emailContent = buildQuoteRequestEmailContent(booking, product, userProfile);

      const info = await transporter.sendMail({
        from: `"${emailFromName}" <${emailUser}>`,
        to: recipients.join(", "),
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      console.log("Quote request admin email sent:", info.response);

      await saveDispatchRecord(bookingId, {
        status: "sent",
        bookingId,
        userId: decodedToken.uid,
        recipients,
        productName: product?.name || booking.product_id,
        sentAt: new Date().toISOString(),
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[QuoteRequestNotification] Failed to send email:", error);

      const bookingId =
        req.body && typeof req.body.bookingId === "string"
          ? req.body.bookingId.trim()
          : "";
      if (bookingId) {
        await saveDispatchRecord(bookingId, {
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Failed to send quote email",
          failedAt: new Date().toISOString(),
        });
      }

      const message =
        error instanceof Error ? error.message : "Failed to send quote email";
      const statusCode =
        message === "인증 토큰이 없습니다."
          ? 401
          : message === "인증에 실패했습니다." ||
              message === "본인 요청에 대해서만 알림 메일을 보낼 수 있습니다."
            ? 403
            : 500;

      sendJsonError(res, statusCode, message);
    }
  });
});
