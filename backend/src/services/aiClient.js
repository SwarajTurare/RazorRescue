import { env } from '../config/env.js';

async function postJson(url, body, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      let p = {};
      try { p = await res.json(); } catch {}
      throw new Error(p.detail || p.message || `AI service failed (${res.status})`);
    }
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('AI service request timed out. Check that FastAPI is running on port 8001.');
    if (err instanceof TypeError) throw new Error('Cannot reach AI service. Start FastAPI on http://localhost:8001.');
    throw err;
  } finally { clearTimeout(timer); }
}

export function aiPost(path, body) {
  return postJson(`${env.aiUrl}${path}`, body, 60000);
}

export async function aiReport(body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${env.aiUrl}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      let p = {};
      try { p = await res.json(); } catch {}
      throw new Error(p.detail || p.message || `Report service failed (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Report generation timed out. Check that the AI service is running.');
    if (err instanceof TypeError) throw new Error('Cannot reach AI service for report generation.');
    throw err;
  } finally { clearTimeout(timer); }
}
