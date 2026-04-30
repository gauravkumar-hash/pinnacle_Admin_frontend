import { Session } from "@supabase/supabase-js";
import { onErrorCallback } from "./index";

const BASE = import.meta.env.VITE_ADMIN_API_URL;

const URLS = {
  services: `${BASE}/api/admin/services`,
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

export interface Service {
  id: number;
  specialisation_id: number;
  service_name: string;
  clinic_name: string;
  consultation_fee: number;
  clinic_photo_path?: string;
  banner_image_path?: string;
  bio?: string;
  service_details?: string;
  languages?: string;
  years_of_practice?: number;
  hospital_affiliations?: string;
  board_certifications?: string;
  awards?: string;
  insurance_tpa?: string;
  insurance_shield_plan?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  available_days?: string;
  available_time_slots?: string;
  active: boolean;
  display_order?: number;
  created_at: string;
  updated_at?: string;
}

// ── Services ───────────────────────────────────────────────────────────────────

export const getServices = async (
  session: Session,
  onError: onErrorCallback,
): Promise<Service[]> => {
  const res = await fetch(`${URLS.services}/`, {
    headers: getHeaders(session),
  });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return [];
  }
  return res.json();
};

export const createService = async (
  session: Session,
  body: Partial<Service> | FormData,
  onError: onErrorCallback,
) => {
  const isFormData = body instanceof FormData;
  const res = await fetch(`${URLS.services}/`, {
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

export const updateService = async (
  session: Session,
  id: number,
  body: Partial<Service> | FormData,
  onError: onErrorCallback,
) => {
  const isFormData = body instanceof FormData;
  const res = await fetch(`${URLS.services}/${id}`, {
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

export const deleteService = async (
  session: Session,
  id: number,
  onError: onErrorCallback,
) => {
  const res = await fetch(`${URLS.services}/${id}`, {
    method: "DELETE",
    headers: getHeaders(session),
  });
  if (!res.ok) {
    onError(res.status, (await res.json())?.detail);
    return;
  }
  return res.json();
};
