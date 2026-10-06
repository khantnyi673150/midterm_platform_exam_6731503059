# AI Log

This log records how AI support was used and what was verified independently.

## Prompt 1

"Design a small Hono + SQLite REST API for a campus equipment booking system, including validation, conflict detection, and JSON error responses."

### Used from the response
- Hono route structure for `GET/POST/PATCH/DELETE` on bookings.
- SQLite schema design with `equipment` and `bookings` tables.
- Overlap logic using start/end timestamp comparisons.

### Verified by me
- Confirmed the SQL is parameterized with `?` placeholders.
- Checked that `equipmentId` existence and `startAt < endAt` checks are enforced.
- Verified responses use JSON `{"error": "..."}` format.

## Prompt 2

"Improve the API to ensure 400, 404, and 409 errors are returned correctly, and add CORS for local browser testing."

### Used from the response
- CORS configuration with `hono/cors`.
- Error handling pattern that returns status-specific JSON responses.

### Verified by me
- Tested invalid payloads and overlapping bookings with `curl`.
- Confirmed `404` for missing booking IDs.
- Confirmed `409` for overlapping equipment reservations.

## Prompt 3

"Write concise project documentation and testing steps for a practical lab submission."

### Used from the response
- README structure, base URL, and testing guide layout.
- Contract formatting and business-rule summary.

### Verified by me
- Cross-checked the endpoints against the task brief.
- Confirmed that the API responses match the required JSON contract.

## Ownership statement

I reviewed each AI suggestion and validated the behavior with direct API tests in the terminal before accepting it. The final implementation is my own work, and I can explain the decisions behind the data model, validation rules, and error handling.
