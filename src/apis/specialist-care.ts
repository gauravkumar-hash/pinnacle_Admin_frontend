import { Session } from "@supabase/supabase-js";
import { onErrorCallback } from "./index";

const BASE = import.meta.env.VITE_ADMIN_API_URL;

const URLS = {
  specialisations: `${BASE}/specialisations`,
  specialists: `${BASE}/specialists`,
  requests: `${BASE}/appointment-requests`,
};

const getHeaders = (session: Session, isFormData: boolean = false) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${session?.access_token}`,
  };
  // Don't set Content-Type for FormData - browser will set it with boundary
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Specialisation {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon_url?: string;
  banner_url?: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Specialist {
  id: number;
  specialisation_id: number;
  title?: string;
  name: string;
  image_url?: string;
  clinic_name?: string;
  consultation_fee?: number;
  clinic_photo_path?: string;
  banner_image_path?: string;
  credentials?: string;
  short_bio?: string;
  full_bio?: string;
  languages?: string;
  years_of_practice?: number;
  hospital_affiliations?: string;
  board_certifications?: string;
  awards?: string;
  appointment_email: string;
  contact_email?: string;
  contact_phone?: string;
  insurance_tpa?: string;
  insurance_shield_plan?: string;
  available_days?: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AppointmentRequest {
  id: number;
  specialisation_id: number;
  specialist_id?: number;
  service_id?: number;
  patient_name: string;
  patient_dob?: string;
  contact_number: string;
  email: string;
  preferred_days?: string;
  preferred_time?: string;
  reason?: string;
  status: "requested" | "confirmed" | "rejected" | "completed" | "rescheduled" | "cancelled";
  status_message?: string;
  submitted_at: string;
  updated_at?: string;
  specialist?: { id: number; name: string; title?: string; image_url?: string };
  service?: { id: number; service_name: string; clinic_name: string };
}

// ── Specialisations ────────────────────────────────────────────────────────────

export const getSpecialisations = async (
  session: Session,
  onError: onErrorCallback,
): Promise<Specialisation[]> => {
  const res = await fetch(`${URLS.specialisations}/`, {
    headers: getHeaders(session),
  });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return [];
  }
  return res.json();
};

export const createSpecialisation = async (
  session: Session,
  body: Partial<Specialisation> | FormData,
  onError: onErrorCallback,
) => {
  const isFormData = body instanceof FormData;
  const res = await fetch(`${URLS.specialisations}/`, {
    method: "POST",
    headers: getHeaders(session, isFormData),
    body: isFormData ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return;
  }
  return res.json();
};

export const updateSpecialisation = async (
  session: Session,
  id: number,
  body: Partial<Specialisation> | FormData,
  onError: onErrorCallback,
) => {
  const isFormData = body instanceof FormData;
  const res = await fetch(`${URLS.specialisations}/${id}`, {
    method: "PATCH",
    headers: getHeaders(session, isFormData),
    body: isFormData ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return;
  }
  return res.json();
};

export const deleteSpecialisation = async (
  session: Session,
  id: number,
  onError: onErrorCallback,
) => {
  const res = await fetch(`${URLS.specialisations}/${id}`, {
    method: "DELETE",
    headers: getHeaders(session),
  });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return;
  }
  return res.json();
};

// ── Specialists ────────────────────────────────────────────────────────────────

export const getSpecialists = async (
  session: Session,
  onError: onErrorCallback,
): Promise<Specialist[]> => {
  const res = await fetch(`${URLS.specialists}/`, {
    headers: getHeaders(session),
  });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return [];
  }
  return res.json();
};

export const createSpecialist = async (
  session: Session,
  body: Partial<Specialist> | FormData,
  onError: onErrorCallback,
) => {
  const isFormData = body instanceof FormData;
  const res = await fetch(`${URLS.specialists}/`, {
    method: "POST",
    headers: getHeaders(session, isFormData),
    body: isFormData ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return;
  }
  return res.json();
};

export const updateSpecialist = async (
  session: Session,
  id: number,
  body: Partial<Specialist> | FormData,
  onError: onErrorCallback,
) => {
  const isFormData = body instanceof FormData;
  const res = await fetch(`${URLS.specialists}/${id}`, {
    method: "PATCH",
    headers: getHeaders(session, isFormData),
    body: isFormData ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return;
  }
  return res.json();
};

export const deleteSpecialist = async (
  session: Session,
  id: number,
  onError: onErrorCallback,
) => {
  const res = await fetch(`${URLS.specialists}/${id}`, {
    method: "DELETE",
    headers: getHeaders(session),
  });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return;
  }
  return res.json();
};

// ── Appointment Requests ───────────────────────────────────────────────────────

export const getAppointmentRequests = async (
  session: Session,
  onError: onErrorCallback,
  params?: { status?: string; specialist_id?: number },
): Promise<AppointmentRequest[]> => {
  let url = `${URLS.requests}/admin/all`;
  if (params) {
    const q = new URLSearchParams();
    if (params.status) q.append("status", params.status);
    if (params.specialist_id)
      q.append("specialist_id", String(params.specialist_id));
    if ([...q].length) url += "?" + q.toString();
  }
  const res = await fetch(url, { headers: getHeaders(session) });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return [];
  }
  return res.json();
};

export const updateRequestStatus = async (
  session: Session,
  id: number,
  body: { status: string; status_message?: string },
  onError: onErrorCallback,
) => {
  const res = await fetch(`${URLS.requests}/admin/${id}/status`, {
    method: "PATCH",
    headers: getHeaders(session),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return;
  }

  return res.json();
};
export const rescheduleRequest = async (
  session: Session,
  id: number,
  body: { preferred_days: string; preferred_time: string },
  onError: onErrorCallback,
) => {
  const res = await fetch(`${URLS.requests}/${id}/reschedule`, {
    method: "POST",
    headers: getHeaders(session),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return;
  }
  return res.json();
};

export const cancelRequest = async (
  session: Session,
  id: number,
  body: { reason: string },
  onError: onErrorCallback,
) => {
  const res = await fetch(`${URLS.requests}/${id}/cancel`, {
    method: "POST",
    headers: getHeaders(session),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return;
  }
  return res.json();
};
