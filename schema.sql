-- วิ่งใน Cloudflare D1 Console ก่อน deploy

CREATE TABLE IF NOT EXISTS users (
  user_id     TEXT PRIMARY KEY,
  name        TEXT,
  phone       TEXT,
  department  TEXT DEFAULT 'พนักงาน',
  role        TEXT DEFAULT 'pending',
  status      TEXT DEFAULT 'pending',
  picture_url TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS records (
  id              TEXT PRIMARY KEY,
  user_id         TEXT,
  name            TEXT,
  phone           TEXT,
  car             TEXT,
  mileage         TEXT,
  reason          TEXT,
  route_text      TEXT,
  total_distance  REAL DEFAULT 0,
  total_time      REAL DEFAULT 0,
  has_photo       INTEGER DEFAULT 0,
  return_status   TEXT DEFAULT 'pending',
  returned_at     TEXT,
  duration_text   TEXT,
  return_location TEXT,
  timestamp       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS requests (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  display_name TEXT,
  picture_url  TEXT,
  full_name    TEXT,
  phone        TEXT,
  department   TEXT,
  status       TEXT DEFAULT 'pending',
  submitted_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_records_timestamp ON records(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_records_car ON records(car);
CREATE INDEX IF NOT EXISTS idx_requests_user ON requests(user_id);

