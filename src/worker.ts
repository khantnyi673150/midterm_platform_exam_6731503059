import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  midterm_campus_booking_2026_db: D1Database;
};

type Equipment = {
  id: string;
  name: string;
  location: string;
};

type Booking = {
  id: string;
  equipmentId: string;
  borrowerName: string;
  startAt: string;
  endAt: string;
  purpose: string;
  createdAt: string;
};

const app = new Hono<{ Bindings: Bindings }>();
let initialized: Promise<void> | null = null;

function jsonError(c: any, status: number, message: string) {
  return c.json({ error: message }, status as any);
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `bk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

async function ensureSchema(db: D1Database) {
  if (!initialized) {
    initialized = (async () => {
      await db
        .prepare('CREATE TABLE IF NOT EXISTS equipment (id TEXT PRIMARY KEY, name TEXT NOT NULL, location TEXT NOT NULL);')
        .run();

      await db
        .prepare(
          'CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, equipment_id TEXT NOT NULL, borrower_name TEXT NOT NULL, start_at TEXT NOT NULL, end_at TEXT NOT NULL, purpose TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (equipment_id) REFERENCES equipment(id));',
        )
        .run();

      const seedStatements = [
        ['eq-1', 'Projector A', 'Building 1'],
        ['eq-2', 'Meeting Room 2', 'Building 2'],
        ['eq-3', 'Camera Kit', 'Building 3'],
      ] as const;

      for (const [id, name, location] of seedStatements) {
        await db.prepare(
          `INSERT OR IGNORE INTO equipment (id, name, location)
           VALUES (?, ?, ?)`,
        ).bind(id, name, location).run();
      }
    })();
  }

  return initialized;
}

async function fetchEquipment(db: D1Database): Promise<Equipment[]> {
  const result = await db
    .prepare('SELECT id, name, location FROM equipment ORDER BY name ASC')
    .all<Equipment>();
  return (result.results ?? []) as Equipment[];
}

async function fetchBookings(db: D1Database): Promise<Booking[]> {
  const result = await db
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
    .all<Booking>();
  return (result.results ?? []) as Booking[];
}

async function fetchBookingById(db: D1Database, id: string): Promise<Booking | null> {
  const result = await db
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
    .bind(id)
    .first<Booking>();

  return result ?? null;
}

async function validateBookingPayload(db: D1Database, payload: unknown, excludeBookingId?: string) {
  if (!payload || typeof payload !== 'object') {
    throw { status: 400, error: 'Request body must be a JSON object' };
  }

  const body = payload as Record<string, unknown>;
  const equipmentId = body.equipmentId;
  const borrowerName = body.borrowerName;
  const startAt = body.startAt;
  const endAt = body.endAt;
  const purpose = body.purpose;

  if (typeof equipmentId !== 'string' || equipmentId.trim() === '') {
    throw { status: 400, error: 'equipmentId is required' };
  }

  const equipmentExists = await db.prepare('SELECT 1 FROM equipment WHERE id = ?').bind(equipmentId).first();
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

  const conflictQuery = excludeBookingId
    ? `SELECT 1 FROM bookings WHERE equipment_id = ? AND id != ? AND NOT (end_at <= ? OR start_at >= ?)`
    : `SELECT 1 FROM bookings WHERE equipment_id = ? AND NOT (end_at <= ? OR start_at >= ?)`;

  const conflict = excludeBookingId
    ? await db.prepare(conflictQuery).bind(equipmentId, excludeBookingId, startAt, endAt).first()
    : await db.prepare(conflictQuery).bind(equipmentId, startAt, endAt).first();

  if (conflict) {
    throw { status: 409, error: 'Booking time conflicts with an existing booking for this equipment' };
  }

  return {
    equipmentId,
    borrowerName: borrowerName.trim(),
    startAt,
    endAt,
    purpose: purpose.trim(),
  };
}

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

app.get('/api/equipment', async (c) => {
  await ensureSchema(c.env.midterm_campus_booking_2026_db);
  const rows = await fetchEquipment(c.env.midterm_campus_booking_2026_db);
  return c.json(rows);
});

app.get('/api/bookings', async (c) => {
  await ensureSchema(c.env.midterm_campus_booking_2026_db);
  const rows = await fetchBookings(c.env.midterm_campus_booking_2026_db);
  return c.json(rows);
});

app.get('/api/bookings/:id', async (c) => {
  await ensureSchema(c.env.midterm_campus_booking_2026_db);
  const { id } = c.req.param();
  const booking = await fetchBookingById(c.env.midterm_campus_booking_2026_db, id);
  if (!booking) return jsonError(c, 404, 'Booking not found');
  return c.json(booking);
});

app.post('/api/bookings', async (c) => {
  try {
    await ensureSchema(c.env.midterm_campus_booking_2026_db);
    const body = await c.req.json();
    const bookingData = await validateBookingPayload(c.env.midterm_campus_booking_2026_db, body);

    const booking: Booking = {
      id: generateId(),
      ...bookingData,
      createdAt: new Date().toISOString(),
    };

    await c.env.midterm_campus_booking_2026_db
      .prepare(
        `INSERT INTO bookings (id, equipment_id, borrower_name, start_at, end_at, purpose, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        booking.id,
        booking.equipmentId,
        booking.borrowerName,
        booking.startAt,
        booking.endAt,
        booking.purpose,
        booking.createdAt,
      )
      .run();

    return c.json(booking, 201);
  } catch (error: unknown) {
    const err = error as { status?: number; error?: string };
    if (err && typeof err === 'object' && 'status' in err && 'error' in err) {
      return jsonError(c, err.status ?? 400, err.error ?? 'Bad request');
    }
    return jsonError(c, 500, 'Unexpected server error');
  }
});

app.patch('/api/bookings/:id', async (c) => {
  try {
    await ensureSchema(c.env.midterm_campus_booking_2026_db);
    const { id } = c.req.param();
    const existing = await fetchBookingById(c.env.midterm_campus_booking_2026_db, id);
    if (!existing) return jsonError(c, 404, 'Booking not found');

    const body = await c.req.json();
    const bookingData = await validateBookingPayload(c.env.midterm_campus_booking_2026_db, body, id);

    const updated: Booking = {
      ...existing,
      ...bookingData,
      id,
    };

    await c.env.midterm_campus_booking_2026_db
      .prepare(
        `UPDATE bookings
         SET equipment_id = ?, borrower_name = ?, start_at = ?, end_at = ?, purpose = ?
         WHERE id = ?`,
      )
      .bind(updated.equipmentId, updated.borrowerName, updated.startAt, updated.endAt, updated.purpose, id)
      .run();

    return c.json(updated);
  } catch (error: unknown) {
    const err = error as { status?: number; error?: string };
    if (err && typeof err === 'object' && 'status' in err && 'error' in err) {
      return jsonError(c, err.status ?? 400, err.error ?? 'Bad request');
    }
    return jsonError(c, 500, 'Unexpected server error');
  }
});

app.delete('/api/bookings/:id', async (c) => {
  await ensureSchema(c.env.midterm_campus_booking_2026_db);
  const { id } = c.req.param();
  const result = await c.env.midterm_campus_booking_2026_db.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run();

  if ((result.meta?.changes ?? 0) === 0) {
    return jsonError(c, 404, 'Booking not found');
  }

  return c.body(null, 204);
});

app.notFound((c) => jsonError(c, 404, 'Route not found'));

export default {
  fetch: app.fetch,
};
