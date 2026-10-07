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

The same schema is also available in [erd.md](erd.md).

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

The API was verified against the public deployment at:

`https://knna-midterm-campus-booking-2026.quickbite-api.workers.dev/api`

| Case | Request | Expected status | Result |
|---|---|---:|---|
| 1 | `GET /equipment` | 200 | Seeded equipment list returned |
| 2 | `POST /bookings` valid payload | 201 | Booking created with `id` |
| 3 | `GET /bookings` | 200 | Created booking listed |
| 4 | `POST /bookings` invalid range | 400 | JSON error returned |
| 5 | `POST /bookings` overlap | 409 | Conflict returned |
| 6 | `GET /bookings/does-not-exist` | 404 | Not found returned |
| 7 | `PATCH /bookings/:id` | 200 | Booking updated |
| 8 | `DELETE /bookings/:id` | 204 | Booking deleted |

Suggested test commands:

```bash
curl -sS -w "\nHTTP_STATUS:%{http_code}\n" https://knna-midterm-campus-booking-2026.quickbite-api.workers.dev/api/equipment

curl -sS -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://knna-midterm-campus-booking-2026.quickbite-api.workers.dev/api/bookings \
  -H 'Content-Type: application/json' \
  -d '{"equipmentId":"eq-1","borrowerName":"Somchai Jaidee","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Class presentation"}'

curl -sS -w "\nHTTP_STATUS:%{http_code}\n" -X POST https://knna-midterm-campus-booking-2026.quickbite-api.workers.dev/api/bookings \
  -H 'Content-Type: application/json' \
  -d '{"equipmentId":"eq-1","borrowerName":"Bad User","startAt":"2026-10-20T12:00:00.000Z","endAt":"2026-10-20T10:00:00.000Z","purpose":"Invalid"}'
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
