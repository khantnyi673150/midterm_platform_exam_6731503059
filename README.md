# Campus Equipment Booking API

This project implements the required midterm backend API for equipment booking. It uses Node.js, TypeScript, Hono, and SQLite with parameterized queries.

## Base API URL

`http://localhost:8787/api`

Public deployed URL:

`https://knna-midterm-campus-booking-2026.quickbite-api.workers.dev/api`

## Run locally

```bash
npm install
npm run dev
```

The server will start on:

`http://localhost:8787`

## API contract summary

See `API_CONTRACT.md` for the detailed contract.

Key endpoints:

- `GET /api/equipment` → list equipment records
- `GET /api/bookings` → list bookings
- `GET /api/bookings/:id` → fetch one booking
- `POST /api/bookings` → create a booking
- `PATCH /api/bookings/:id` → update a booking
- `DELETE /api/bookings/:id` → delete a booking

## Business rules

- `equipmentId` must exist in the equipment table.
- `startAt` must be valid and earlier than `endAt`.
- A booking cannot overlap an existing booking for the same equipment.
- Error responses use: `{ "error": "message" }`.

## Schema / ERD

```text
equipment
  - id (PK)
  - name
  - location

bookings
  - id (PK)
  - equipment_id (FK -> equipment.id)
  - borrower_name
  - start_at
  - end_at
  - purpose
  - created_at
```

## Example request payload

```json
{
  "equipmentId": "eq-1",
  "borrowerName": "Somchai Jaidee",
  "startAt": "2026-10-20T09:00:00.000Z",
  "endAt": "2026-10-20T11:00:00.000Z",
  "purpose": "Class presentation"
}
```

## Testing evidence

The following five checks were performed against the local API at `http://localhost:8787/api`:

1. `GET /equipment` → returns the seeded equipment list with `200`.
2. `POST /bookings` with valid payload → creates booking and returns `201`.
3. `GET /bookings` → lists all bookings with `200`.
4. `POST /bookings` with invalid time range `startAt >= endAt` → returns `400` and JSON error.
5. `POST /bookings` with overlapping times on same equipment → returns `409` conflict.
6. `GET /bookings/unknown-id` → returns `404` not found.
7. `PATCH /bookings/:id` → updates booking data correctly.
8. `DELETE /bookings/:id` → deletes booking and returns `204`.

Sample `curl` commands:

```bash
curl http://localhost:8787/api/equipment
curl -X POST http://localhost:8787/api/bookings \
  -H 'Content-Type: application/json' \
  -d '{"equipmentId":"eq-1","borrowerName":"Somchai Jaidee","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Class presentation"}'
curl http://localhost:8787/api/bookings
curl -X POST http://localhost:8787/api/bookings \
  -H 'Content-Type: application/json' \
  -d '{"equipmentId":"eq-1","borrowerName":"Bad User","startAt":"2026-10-20T11:00:00.000Z","endAt":"2026-10-20T10:00:00.000Z","purpose":"Invalid"}'
```

## Public / remote testing note

The API is configured to listen on all interfaces (`0.0.0.0`) so it can be exposed to the teacher or a public host. In deployment, the teacher will use the remote URL, for example:

`https://<your-host>/api`

or

`http://<server-ip>:8787/api`

The same endpoints and validation rules apply regardless of whether the URL is local or remote.

## Notes

- The app uses parameterized SQL queries via `better-sqlite3` placeholders.
- CORS is enabled for common local frontend origins.
- SQLite data is stored in `./data/campus.db`.
- The deployed public Worker uses Cloudflare D1 for persistent bookings data.
