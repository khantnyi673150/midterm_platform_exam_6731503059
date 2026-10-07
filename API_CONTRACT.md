# API Contract

Base URL for local development: `http://localhost:8787/api`

Base URL for remote/public testing: `https://<your-host>/api` or `http://<server-ip>:8787/api`

Current deployed public URL: `https://knna-midterm-campus-booking-2026.quickbite-api.workers.dev/api`

For the submission, use the deployed Cloudflare Worker URL above.

## Equipment

### `GET /api/equipment`

Returns all available equipment records.

Success response: `200 OK`

```json
[
  { "id": "eq-1", "name": "Projector A", "location": "Building 1" },
  { "id": "eq-2", "name": "Meeting Room 2", "location": "Building 2" }
]
```

## Bookings

### `GET /api/bookings`

Returns all bookings.

Success response: `200 OK`

```json
[
  {
    "id": "1fda...",
    "equipmentId": "eq-1",
    "borrowerName": "Somchai Jaidee",
    "startAt": "2026-10-20T09:00:00.000Z",
    "endAt": "2026-10-20T11:00:00.000Z",
    "purpose": "Class presentation",
    "createdAt": "2026-10-06T06:00:00.000Z"
  }
]
```

### `GET /api/bookings/:id`

Returns one booking by id.

Success response: `200 OK`

### `POST /api/bookings`

Creates a booking.

Request body:

```json
{
  "equipmentId": "eq-1",
  "borrowerName": "Somchai Jaidee",
  "startAt": "2026-10-20T09:00:00.000Z",
  "endAt": "2026-10-20T11:00:00.000Z",
  "purpose": "Class presentation"
}
```

Success response: `201 Created`

```json
{
  "id": "uuid-value",
  "equipmentId": "eq-1",
  "borrowerName": "Somchai Jaidee",
  "startAt": "2026-10-20T09:00:00.000Z",
  "endAt": "2026-10-20T11:00:00.000Z",
  "purpose": "Class presentation"
}
```

### `PATCH /api/bookings/:id`

Updates an existing booking.

Same payload shape as `POST /api/bookings`.

Success response: `200 OK`

### `DELETE /api/bookings/:id`

Deletes a booking.

Success response: `204 No Content`

## Error response format

All errors follow this shape:

```json
{ "error": "A message understandable to a user or developer" }
```

Status codes used:

- `400` for missing/invalid request values
- `404` when a resource is not found
- `409` when booking conflicts with another booking on the same equipment
- `500` for unhandled server errors

## Validation rules

- `equipmentId` must reference an existing equipment record.
- `borrowerName` is required.
- `startAt` and `endAt` must be valid ISO timestamps.
- `startAt` must be earlier than `endAt`.
- Bookings for the same equipment may not overlap in time.
- SQL statements use parameter binding rather than string concatenation.
