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
    return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: cors });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });
  }

  // log-login รับข้อมูลแต่ไม่บล็อก — ตอบกลับทันทีไม่ต้องรอ write
  context.waitUntil((async () => {
    try {
      const loginData = await request.clone().json();
      const userId = loginData.userId || null;
      if (userId) {
        await env.DB.prepare(
          'UPDATE users SET updated_at = ? WHERE user_id = ?'
        ).bind(new Date().toISOString(), userId).run();
      }
    } catch (_) {}
  })());

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors });
}
