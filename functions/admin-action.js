const getCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
});

export async function onRequest(context) {
  const { request, env } = context;
  const cors = getCorsHeaders(env.ALLOWED_ORIGIN);

  if (request.method === 'OPTIONS') return new Response('', { status: 200, headers: cors });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });

  try {
    const body = await request.json();
    const { action, requestingUserId } = body;

    if (requestingUserId !== env.ADMIN_USER_ID) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: cors });
    }

    if (action === 'load') {
      const [usersRes, reqRes] = await Promise.all([
        env.DB.prepare('SELECT * FROM users').all(),
        env.DB.prepare("SELECT * FROM requests ORDER BY submitted_at DESC").all()
      ]);
      const userMap = {};
      for (const u of usersRes.results) userMap[u.user_id] = u;
      return new Response(JSON.stringify({ userMap, requests: reqRes.results }), { status: 200, headers: cors });
    }

    if (action === 'approve') {
      const { userId, userData } = body;
      const now = new Date().toISOString();
      await env.DB.prepare(`
        UPDATE users SET name=?, phone=?, department=?, role='user', status='active', updated_at=?
        WHERE user_id=?
      `).bind(userData.name, userData.phone, userData.department, now, userId).run();
      await env.DB.prepare(
        "UPDATE requests SET status='approved' WHERE user_id=?"
      ).bind(userId).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors });
    }

    if (action === 'reject') {
      await env.DB.prepare(
        "UPDATE requests SET status='rejected' WHERE user_id=?"
      ).bind(body.userId).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors });
    }

    if (action === 'save') {
      const { userId, userData } = body;
      await env.DB.prepare(`
        UPDATE users SET name=?, phone=?, department=?, role=?, status=?, updated_at=?
        WHERE user_id=?
      `).bind(userData.name, userData.phone, userData.department, userData.role, userData.status,
        new Date().toISOString(), userId).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors });
    }

    if (action === 'toggle') {
      const user = await env.DB.prepare('SELECT status FROM users WHERE user_id=?').bind(body.userId).first();
      if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: cors });
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      await env.DB.prepare('UPDATE users SET status=?, updated_at=? WHERE user_id=?')
        .bind(newStatus, new Date().toISOString(), body.userId).run();
      return new Response(JSON.stringify({ success: true, newStatus }), { status: 200, headers: cors });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: cors });
  }
}
