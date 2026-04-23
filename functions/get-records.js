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
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405, headers: cors });

  try {
    const { results } = await env.DB.prepare(`
      SELECT r.*, u.picture_url
      FROM records r
      LEFT JOIN users u ON r.user_id = u.user_id
      ORDER BY r.timestamp DESC
    `).all();

    const formatted = results.map(r => ({
      _id: r.id,
      name: r.name,
      phone: r.phone,
      car: r.car,
      mileage: r.mileage,
      reason: r.reason,
      routeText: r.route_text,
      totalDistance: r.total_distance,
      totalTime: r.total_time,
      hasPhoto: r.has_photo === 1,
      returnStatus: r.return_status,
      returnedAt: r.returned_at,
      durationText: r.duration_text,
      returnLocation: r.return_location ? JSON.parse(r.return_location) : null,
      timestamp: r.timestamp,
      pictureUrl: r.picture_url || null
    }));

    return new Response(JSON.stringify(formatted), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors });
  }
}
