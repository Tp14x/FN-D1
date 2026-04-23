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
    const { userId, displayName, pictureUrl, formData } = await request.json();
    if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400, headers: cors });

    const existing = await env.DB.prepare('SELECT user_id FROM users WHERE user_id = ?').bind(userId).first();
    if (existing) return new Response(JSON.stringify({ success: false, exists: true }), { status: 200, headers: cors });

    const isAdmin = userId === env.ADMIN_USER_ID;

    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO users (user_id, name, phone, department, role, status, picture_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      formData?.fullName || displayName || 'ไม่ระบุชื่อ',
      formData?.phone || '',
      formData?.department || 'รออนุมัติ',
      isAdmin ? 'admin' : 'pending',
      isAdmin ? 'active' : 'pending',
      pictureUrl || null,
      now, now
    ).run();

    if (!isAdmin) {
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
        now
      ).run();
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: cors });
  }
}
