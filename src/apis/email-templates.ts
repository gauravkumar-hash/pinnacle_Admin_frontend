import { Session } from '@supabase/supabase-js';
import { onErrorCallback } from './index';

const BASE = import.meta.env.VITE_ADMIN_API_URL;
const URL  = `${BASE}/email-templates`;

const getHeaders = (session: Session) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
});

// ── Types ──────────────────────────────────────────────────────────────────────

export interface EmailTemplate {
    id: number;
    template_key: string;
    label: string;
    subject: string;
    body_html: string;
    body_text: string;
    description?: string;
    created_at: string;
    updated_at?: string;
}

export interface EmailTemplateUpdate {
    label?: string;
    subject?: string;
    body_html?: string;
    body_text?: string;
    description?: string;
}

// ── API calls ──────────────────────────────────────────────────────────────────

export const getEmailTemplates = async (
    session: Session,
    onError: onErrorCallback,
): Promise<EmailTemplate[]> => {
    const res = await fetch(`${URL}/`, { headers: getHeaders(session) });
    if (!res.ok) { onError(res.status, (await res.json())?.detail); return []; }
    return res.json();
};

export const getEmailTemplate = async (
    session: Session,
    key: string,
    onError: onErrorCallback,
): Promise<EmailTemplate | null> => {
    const res = await fetch(`${URL}/${key}`, { headers: getHeaders(session) });
    if (!res.ok) { onError(res.status, (await res.json())?.detail); return null; }
    return res.json();
};

export const updateEmailTemplate = async (
    session: Session,
    key: string,
    body: EmailTemplateUpdate,
    onError: onErrorCallback,
): Promise<EmailTemplate | null> => {
    const res = await fetch(`${URL}/${key}`, {
        method: 'PATCH',
        headers: getHeaders(session),
        body: JSON.stringify(body),
    });
    if (!res.ok) { onError(res.status, (await res.json())?.detail); return null; }
    return res.json();
};

export const seedEmailTemplates = async (
    session: Session,
    onError: onErrorCallback,
): Promise<{ seeded: string[]; skipped: string[] } | null> => {
    const res = await fetch(`${URL}/seed`, {
        method: 'POST',
        headers: getHeaders(session),
    });
    if (!res.ok) { onError(res.status, (await res.json())?.detail); return null; }
    return res.json();
};
