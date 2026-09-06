import supabase from "@/services/supabase";

const BASE = `${import.meta.env.VITE_ADMIN_API_URL}/api/admin/marketing-campaigns`;

export type CampaignType = "consent_notice" | "marketing" | "system";
export type CampaignStatus =
  | "draft"
  | "building"
  | "queued"
  | "sending"
  | "paused"
  | "completed"
  | "failed";

export interface Campaign {
  id: string;
  type: CampaignType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  status: CampaignStatus;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  pending_count: number;
  delivered_count: number;
  undelivered_count: number;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface RecipientRow {
  account_id: string;
  name: string | null;
  mobile: string | null;
  status: string;
  attempts: number;
  last_error: string | null;
  sent_at: string | null;
  delivery: "delivered" | "undelivered" | "sent" | "not_sent";
  receipt_status: "ok" | "error" | null;
  receipt_error: string | null;
  receipt_checked_at: string | null;
}

async function authHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session?.access_token ?? ""}`,
  };
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: await authHeaders() });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      msg = body?.detail ?? body?.message ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export interface CreateCampaignInput {
  type: CampaignType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
}

export const listCampaigns = () =>
  req<{ rows: Campaign[] }>("").then((r) => r.rows);

export const getCampaign = (id: string) => req<Campaign>(`/${id}`);

export const createCampaign = (input: CreateCampaignInput) =>
  req<Campaign>("", { method: "POST", body: JSON.stringify(input) });

export const prepareCampaign = (id: string) =>
  req<{ success: boolean }>(`/${id}/prepare`, { method: "POST" });

export const startCampaign = (id: string) =>
  req<{ success: boolean }>(`/${id}/start`, { method: "POST" });

export const pauseCampaign = (id: string) =>
  req<{ success: boolean }>(`/${id}/pause`, { method: "POST" });

export const resumeCampaign = (id: string) =>
  req<{ success: boolean }>(`/${id}/resume`, { method: "POST" });

export const deleteCampaign = (id: string) =>
  req<{ success: boolean }>(`/${id}`, { method: "DELETE" });

export const listRecipients = (
  id: string,
  params: { status?: string; limit?: number; offset?: number } = {},
) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  qs.set("limit", String(params.limit ?? 50));
  qs.set("offset", String(params.offset ?? 0));
  return req<{ total: number; rows: RecipientRow[] }>(`/${id}/recipients?${qs.toString()}`);
};

export const CONSENT_NOTICE_DEFAULT_BODY =
  "We will be sending notifications about medical services and other healthcare " +
  "information. If you would prefer not to receive these, tap here to manage your " +
  "notification preferences and opt out. Appointment reminders are not affected.";

export const OPT_OUT_DEEP_LINK = { pathname: "/profile/notification-settings" };
