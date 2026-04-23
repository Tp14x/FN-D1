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
    const { id, updates } = await request.json();
    if (!id) return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400, headers: cors });

    const fields = Object.keys(updates)
      .map(k => {
        const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
        return `${col} = ?`;
      }).join(', ');

    const values = Object.values(updates);
    values.push(id);

    await env.DB.prepare(
      `UPDATE records SET ${fields} WHERE id = ?`
    ).bind(...values).run();

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: cors });
  }
}
