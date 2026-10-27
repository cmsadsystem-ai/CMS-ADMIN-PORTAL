const API_BASE = import.meta.env.VITE_API_BASE_URL
  || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:8000' : '');

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, error: errData.detail || 'Request failed' };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err.message || 'Network error / server offline' };
  }
}

export async function loginApi(role, username, password) {
  const result = await safeFetch('/portal/auth/login', {
    method: 'POST',
    body: JSON.stringify({ role, username, password }),
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return {
    ok: true,
    token: result.data.token,
    role: result.data.role,
    username: result.data.username,
    fullName: result.data.fullName,
  };
}

export async function fetchApplicationsApi() {
  const result = await safeFetch('/portal/applications');
  if (result.ok && Array.isArray(result.data)) {
    return result.data;
  }
  return null;
}

export async function submitApplicationApi(appData) {
  const result = await safeFetch('/portal/applications', {
    method: 'POST',
    body: JSON.stringify(appData),
  });
  if (result.ok) {
    return result.data;
  }
  return appData;
}

export async function updateApplicationApi(appId, updates, comment = null, actor = null) {
  const result = await safeFetch(`/portal/applications/${encodeURIComponent(appId)}`, {
    method: 'PUT',
    body: JSON.stringify({ updates, comment, actor }),
  });
  if (result.ok) {
    return result.data;
  }
  return null;
}

export async function fetchSettingApi(key, fallback = null) {
  const result = await safeFetch(`/portal/settings/${encodeURIComponent(key)}`);
  if (result.ok && result.data && result.data.value !== null && result.data.value !== undefined) {
    return result.data.value;
  }
  return fallback;
}

export async function saveSettingApi(key, value) {
  await safeFetch(`/portal/settings/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export const DEFAULT_ENQUIRING_EMAIL = 'admissions@cms.edu.in';

export async function sendApplicationStatusEmail({
  to,
  studentName,
  applicationId,
  status,
  course,
  enquiringEmail = DEFAULT_ENQUIRING_EMAIL,
}) {
  if (!to) return { ok: false, error: 'Student email is required.' };

  const payload = {
    to,
    studentName,
    applicationId,
    status, // 'Enquiring' or 'Confirmed'
    course,
    enquiringEmail,
    sentAt: new Date().toISOString(),
  };

  // Connect to backend email endpoint without fake success alerts if backend is unavailable
  return safeFetch('/portal/email/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
