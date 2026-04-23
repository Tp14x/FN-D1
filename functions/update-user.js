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
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    if (!userId) return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: cors });
    try {
      const user = await env.DB.prepare('SELECT * FROM users WHERE user_id = ?').bind(userId).first();
      return new Response(JSON.stringify(user || null), { status: 200, headers: cors });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
    }
  }

  try {
    const { userId, pictureUrl } = await request.json();
    if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400, headers: cors });

    await env.DB.prepare(
      'UPDATE users SET picture_url = ?, updated_at = ? WHERE user_id = ?'
    ).bind(pictureUrl, new Date().toISOString(), userId).run();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: cors });
  }
}
