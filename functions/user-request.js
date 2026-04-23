const getCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
});

export async function onRequest(context) {
  const { request, env } = context;
  const cors = getCorsHeaders(env.ALLOWED_ORIGIN);

  if (request.method === 'OPTIONS') return new Response('', { status: 200, headers: cors });

  if (request.method === 'GET') {
    try {
      const { results } = await env.DB.prepare(
        "SELECT * FROM requests ORDER BY submitted_at DESC"
      ).all();
      return new Response(JSON.stringify(results), { status: 200, headers: cors });
    } catch (_) {
      return new Response(JSON.stringify([]), { status: 200, headers: cors });
    }
  }

  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

  try {
    const { action, userId, displayName, pictureUrl, formData } = await request.json();

    if (action === 'check') {
      const row = await env.DB.prepare(
        "SELECT id FROM requests WHERE user_id = ? AND status = 'pending'"
      ).bind(userId).first();
      return new Response(JSON.stringify({ exists: !!row }), { status: 200, headers: cors });
    }

    if (action === 'submit') {
      const existing = await env.DB.prepare(
        'SELECT id FROM requests WHERE user_id = ?'
      ).bind(userId).first();
      if (existing) return new Response(JSON.stringify({ duplicate: true }), { status: 200, headers: cors });

      await env.DB.prepare(`
        INSERT INTO requests (id, user_id, display_name, picture_url, full_name, phone, department, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `).bind(
        Date.now().toString(),
        userId,
        displayName || null,
        pictureUrl || null,
        formData?.fullName || null,
        formData?.phone || null,
        formData?.department || null,
        new Date().toISOString()
      ).run();

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
  }
}
