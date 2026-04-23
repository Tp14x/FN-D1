const getCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
});

export async function onRequest(context) {
  const { request, env } = context;
  const cors = getCorsHeaders(env.ALLOWED_ORIGIN);

  if (request.method === 'OPTIONS') return new Response('', { status: 200, headers: cors });
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

  try {
    const users = await env.DB.prepare('SELECT * FROM users').all();
    const userMap = {};
    for (const u of users.results) {
      userMap[u.user_id] = {
        name: u.name,
        phone: u.phone,
        department: u.department,
        role: u.role,
        status: u.status,
        pictureUrl: u.picture_url,
        updatedAt: u.updated_at
      };
    }
    return new Response(JSON.stringify(userMap), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
  }
}
