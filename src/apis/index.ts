export const apiUrl = import.meta.env.VITE_ADMIN_API_URL + '/api/admin';
import { Session } from '@supabase/supabase-js';

export const getHeaders = (session: Session) => {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
    }
}

export type onErrorCallback = (status: number, msg: string) => void

// FastAPI error `detail` can be a string or a list of {loc, msg} objects
// (422 validation errors). Flatten it into a readable message.
export const formatApiDetail = (detail: unknown): string => {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        return detail
            .map((err) => {
                const field = Array.isArray(err?.loc)
                    ? err.loc.filter((p: unknown) => p !== 'body').join('.')
                    : '';
                return field ? `${field}: ${err?.msg ?? 'invalid value'}` : err?.msg ?? 'invalid value';
            })
            .join('; ');
    }
    if (detail && typeof detail === 'object') return JSON.stringify(detail);
    return 'Something went wrong';
}

export const get = async ({ url, body, session, onError }: { url: string, body?: object, session: Session, onError: onErrorCallback }) => {
    try {
        let combinedUrl = `${apiUrl}${url}`;
        if (body) {
            // Converts the body object values to strings
            const strBody = JSON.parse(JSON.stringify(body, (_, v) => v && typeof v === 'object' ? v : '' + v));
            combinedUrl += '?' + new URLSearchParams(strBody);
        }
        console.log(`GET ${combinedUrl}`);

        const headers = getHeaders(session);
        const response = await fetch(combinedUrl, {
            method: 'GET',
            headers,
        });
        if (response.status !== 200) {
            onError(response.status, (await response.json())?.detail);
            return;
        }
        return await response.json();
    } catch (error: any) {
        onError(500, error.toString());
    }
}

export const post = async ({ url, body, session, onError }: { url: string, body: object, session: Session, onError: onErrorCallback }) => {
    try {
        const combinedUrl = `${apiUrl}${url}`;
        console.log(`POST ${combinedUrl} ${JSON.stringify(body)}`);
        const headers = getHeaders(session);
        const response = await fetch(combinedUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        
        if (response.status !== 200) {
            onError(response.status, (await response.json())?.detail);
            return;
        }
        return await response.json();
    } catch (error: any) {
        onError(500, error.toString());
    }
}
