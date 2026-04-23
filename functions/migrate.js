// migrate.js — เปิด URL นี้ครั้งเดียวใน browser เพื่อย้ายข้อมูลจาก JSONBin → D1
// หลัง migrate เสร็จ ลบไฟล์นี้ออกจาก repo ได้เลย

const JSONBIN_API = 'https://api.jsonbin.io/v3/b';

export async function onRequest(context) {
  const { request, env } = context;

  // กันไม่ให้คนอื่นเรียก — ต้องใส่ secret key ใน URL
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  if (secret !== env.MIGRATE_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }

  const key = env.JSONBIN_MASTER_KEY;
  const results = { users: 0, records: 0, requests: 0, errors: [] };

  // ─── 1. Migrate Users ───────────────────────────────────────────
  try {
    const res = await fetch(`${JSONBIN_API}/${env.USER_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': key, 'X-Bin-Meta': 'false' }
    });
    const raw = await res.json();
    const userMap = raw.record || raw;

    for (const [userId, u] of Object.entries(userMap)) {
      if (!userId || typeof u !== 'object') continue;
      try {
        await env.DB.prepare(`
          INSERT OR REPLACE INTO users
            (user_id, name, phone, department, role, status, picture_url, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          userId,
          u.name || u.displayName || 'ไม่ระบุชื่อ',
          u.phone || '',
          u.department || 'พนักงาน',
          u.role || 'user',
          u.status || 'active',
          u.pictureUrl || u.picture_url || null,
          u.createdAt || u.registeredAt || new Date().toISOString(),
          u.updatedAt || new Date().toISOString()
        ).run();
        results.users++;
      } catch (e) {
        results.errors.push(`user ${userId}: ${e.message}`);
      }
    }
  } catch (e) {
    results.errors.push(`fetch users: ${e.message}`);
  }

  // ─── 2. Migrate Records (Old + New Bin) ─────────────────────────
  const allRecords = [];
  const binIds = [env.OLD_RECORDS_BIN_ID, env.RECORDS_BIN_ID].filter(Boolean);

    for (const binId of binIds) {
      try {
        const res = await fetch(`${JSONBIN_API}/${binId}/latest`, {
          headers: { 'X-Master-Key': env.RECORDS_MASTER_KEY, 'X-Bin-Meta': 'false' }
        });
      const raw = await res.json();
      const data = raw.record || raw;
      const recs = data.records || (Array.isArray(data) ? data : []);
      allRecords.push(...recs);
    } catch (e) {
      results.errors.push(`fetch records bin ${binId}: ${e.message}`);
    }
  }

  for (const r of allRecords) {
    if (!r) continue;
    const id = r._id || r.id || `${Date.now()}_${Math.random()}`;
    try {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO records
          (id, user_id, name, phone, car, mileage, reason, route_text,
           total_distance, total_time, has_photo, return_status,
           returned_at, duration_text, return_location, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        String(id),
        r.userId || null,
        r.name || r.originalName || r.displayName || 'ไม่ระบุชื่อ',
        r.phone || '-',
        r.car || 'ไม่ระบุ',
        r.mileage || '0',
        r.reason || '',
        r.routeText || r.route_text || '',
        r.totalDistance || r.total_distance || 0,
        r.totalTime || r.total_time || 0,
        r.hasPhoto || r.has_photo ? 1 : 0,
        r.returnStatus || r.return_status || 'returned',
        r.returnedAt || r.returned_at || null,
        r.durationText || r.duration_text || null,
        r.returnLocation ? JSON.stringify(r.returnLocation) : null,
        r.timestamp || new Date().toISOString()
      ).run();
      results.records++;
    } catch (e) {
      results.errors.push(`record ${id}: ${e.message}`);
    }
  }

  // ─── 3. Migrate Requests ─────────────────────────────────────────
  try {
    const res = await fetch(`${JSONBIN_API}/${env.REQUEST_BIN_ID}/latest`, {
      headers: { 'X-Master-Key': key, 'X-Bin-Meta': 'false' }
    });
    const raw = await res.json();
    const data = raw.record || raw;
    const reqList = Array.isArray(data) ? data : Object.values(data);

    for (const r of reqList) {
      if (!r) continue;
      const ud = r.userData || {};
      const id = String(r.id || Date.now());
      try {
        await env.DB.prepare(`
          INSERT OR REPLACE INTO requests
            (id, user_id, display_name, picture_url, full_name, phone, department, status, submitted_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          ud.userId || null,
          ud.displayName || null,
          ud.pictureUrl || null,
          ud.fullName || ud.full_name || null,
          ud.phone || null,
          ud.department || null,
          r.status || 'pending',
          r.submittedAt || r.submitted_at || new Date().toISOString()
        ).run();
        results.requests++;
      } catch (e) {
        results.errors.push(`request ${id}: ${e.message}`);
      }
    }
  } catch (e) {
    results.errors.push(`fetch requests: ${e.message}`);
  }

  return new Response(JSON.stringify({
    success: true,
    migrated: results,
    message: results.errors.length === 0
      ? '✅ Migration สำเร็จ! ลบไฟล์ migrate.js ออกจาก repo ได้เลย'
      : '⚠️ Migration เสร็จแต่มีบาง error ดูใน errors[]'
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
