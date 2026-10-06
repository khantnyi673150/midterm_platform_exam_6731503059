import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const app = new Hono();
const port = Number(process.env.PORT ?? 8787);
const hostname = process.env.HOST ?? '0.0.0.0';
const dbPath = './data/campus.db';

mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      equipment_id TEXT NOT NULL,
      borrower_name TEXT NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      purpose TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (equipment_id) REFERENCES equipment(id)
    );
  `);

  const equipmentInsert = db.prepare(`
    INSERT OR IGNORE INTO equipment (id, name, location)
    VALUES (?, ?, ?)
  `);

  equipmentInsert.run('eq-1', 'Projector A', 'Building 1');
  equipmentInsert.run('eq-2', 'Meeting Room 2', 'Building 2');
  equipmentInsert.run('eq-3', 'Camera Kit', 'Building 3');
}

initializeDatabase();

app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

app.get('/health', (c) => c.json({ status: 'ok' }));

app.get('/api/equipment', (c) => {
  const rows = db.prepare('SELECT id, name, location FROM equipment ORDER BY name ASC').all() as Array<{
    id: string;
    name: string;
    location: string;
  }>;

  return c.json(rows);
});

app.get('/api/bookings', (c) => {
  const rows = db
    .prepare(
      `SELECT
        id,
        equipment_id AS equipmentId,
        borrower_name AS borrowerName,
        start_at AS startAt,
        end_at AS endAt,
        purpose,
        created_at AS createdAt
      FROM bookings ORDER BY start_at ASC`,
    )
    .all() as Array<Record<string, string>>;

  return c.json(rows);
});

function jsonError(c: any, status: number, message: string) {
  return c.json({ error: message }, status);
}

function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

app.get('/api/bookings/:id', (c) => {
  const { id } = c.req.param();
  const booking = db
    .prepare(
      `SELECT
        id,
        equipment_id AS equipmentId,
        borrower_name AS borrowerName,
        start_at AS startAt,
        end_at AS endAt,
        purpose,
        created_at AS createdAt
      FROM bookings WHERE id = ?`,
    )
    .get(id) as Record<string, string> | undefined;

  if (!booking) {
    return jsonError(c, 404, 'Booking not found');
  }

  return c.json(booking);
});

function validateBookingPayload(body: unknown, currentId?: string) {
  if (!body || typeof body !== 'object') {
    throw { status: 400, error: 'Request body must be a JSON object' };
  }

  const payload = body as Record<string, unknown>;

  const equipmentId = payload.equipmentId;
  const borrowerName = payload.borrowerName;
  const startAt = payload.startAt;
  const endAt = payload.endAt;
  const purpose = payload.purpose;

  if (typeof equipmentId !== 'string' || equipmentId.trim() === '') {
    throw { status: 400, error: 'equipmentId is required' };
  }

  const equipmentExists = db.prepare('SELECT 1 FROM equipment WHERE id = ?').get(equipmentId);
  if (!equipmentExists) {
    throw { status: 400, error: 'equipmentId does not exist' };
  }

  if (typeof borrowerName !== 'string' || borrowerName.trim() === '') {
    throw { status: 400, error: 'borrowerName is required' };
  }

  if (!isValidIsoDate(startAt)) {
    throw { status: 400, error: 'startAt must be a valid ISO date string' };
  }

  if (!isValidIsoDate(endAt)) {
    throw { status: 400, error: 'endAt must be a valid ISO date string' };
  }

  if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
    throw { status: 400, error: 'startAt must be before endAt' };
  }

  if (typeof purpose !== 'string' || purpose.trim() === '') {
    throw { status: 400, error: 'purpose is required' };
  }

  const startMs = new Date(startAt).getTime();
  const endMs = new Date(endAt).getTime();
  const overlaps = db
    .prepare(
      `SELECT id, start_at AS startAt, end_at AS endAt
       FROM bookings
       WHERE equipment_id = ? AND id != ?`,
    )
    .all(equipmentId, currentId ?? '');

  for (const row of overlaps as Array<Record<string, string>>) {
    const existingStart = new Date(row.startAt).getTime();
    const existingEnd = new Date(row.endAt).getTime();
    const hasConflict = startMs < existingEnd && endMs > existingStart;
    if (hasConflict) {
      throw { status: 409, error: 'Booking time conflicts with an existing booking for this equipment' };
    }
  }
}

app.post('/api/bookings', async (c) => {
  try {
    const body = await c.req.json();
    validateBookingPayload(body);

    const id = randomUUID();
    const booking = {
      id,
      equipmentId: String((body as Record<string, unknown>).equipmentId),
      borrowerName: String((body as Record<string, unknown>).borrowerName).trim(),
      startAt: String((body as Record<string, unknown>).startAt),
      endAt: String((body as Record<string, unknown>).endAt),
      purpose: String((body as Record<string, unknown>).purpose).trim(),
    };

    db.prepare(
      `INSERT INTO bookings (id, equipment_id, borrower_name, start_at, end_at, purpose)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      booking.id,
      booking.equipmentId,
      booking.borrowerName,
      booking.startAt,
      booking.endAt,
      booking.purpose,
    );

    return c.json(
      {
        id: booking.id,
        equipmentId: booking.equipmentId,
        borrowerName: booking.borrowerName,
        startAt: booking.startAt,
        endAt: booking.endAt,
        purpose: booking.purpose,
      },
      201,
    );
  } catch (error: unknown) {
    const err = error as { status?: number; error?: string };

    if (err && typeof err === 'object' && 'status' in err && 'error' in err) {
      return jsonError(c, err.status ?? 400, err.error ?? 'Bad request');
    }

    const payload = await c.req.raw.clone().json().catch(() => null);
    if (payload === null) {
      return jsonError(c, 400, 'Invalid JSON payload');
    }

    return jsonError(c, 500, 'Unexpected server error');
  }
});

app.patch('/api/bookings/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const existing = db.prepare('SELECT id FROM bookings WHERE id = ?').get(id) as { id: string } | undefined;
    if (!existing) {
      return jsonError(c, 404, 'Booking not found');
    }

    const body = await c.req.json();
    validateBookingPayload(body, id);

    const equipmentId = String((body as Record<string, unknown>).equipmentId);
    const borrowerName = String((body as Record<string, unknown>).borrowerName).trim();
    const startAt = String((body as Record<string, unknown>).startAt);
    const endAt = String((body as Record<string, unknown>).endAt);
    const purpose = String((body as Record<string, unknown>).purpose).trim();

    db.prepare(
      `UPDATE bookings
       SET equipment_id = ?, borrower_name = ?, start_at = ?, end_at = ?, purpose = ?
       WHERE id = ?`,
    ).run(equipmentId, borrowerName, startAt, endAt, purpose, id);

    return c.json({
      id,
      equipmentId,
      borrowerName,
      startAt,
      endAt,
      purpose,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; error?: string };

    if (err && typeof err === 'object' && 'status' in err && 'error' in err) {
      return jsonError(c, err.status ?? 400, err.error ?? 'Bad request');
    }

    return jsonError(c, 500, 'Unexpected server error');
  }
});

app.delete('/api/bookings/:id', (c) => {
  const { id } = c.req.param();
  const result = db.prepare('DELETE FROM bookings WHERE id = ?').run(id);

  if (result.changes === 0) {
    return jsonError(c, 404, 'Booking not found');
  }

  return c.body(null, 204);
});

app.notFound((c) => jsonError(c, 404, 'Route not found'));

app.onError((err, c) => {
  console.error(err);
  return jsonError(c, 500, 'Internal server error');
});

serve({ fetch: app.fetch, port, hostname });
console.log(`Booking API listening on http://${hostname}:${port}`);
