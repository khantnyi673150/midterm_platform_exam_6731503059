# Quality Gate Review

## Review focus

After the initial implementation, I checked the work against the midterm quality principles and corrected weak points before final submission.

## Finding 1: Validation coverage was incomplete

What I found:
- The first version needed explicit checks for missing `equipmentId`, invalid time range, and non-existent equipment.

How I fixed it:
- I added validation before inserting or updating a booking, including `equipmentId` existence checks and `startAt < endAt` enforcement.

Evidence:
- `curl -X POST http://localhost:8787/api/bookings -H 'Content-Type: application/json' -d '{"equipmentId":"eq-9","borrowerName":"Bad","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T10:00:00.000Z","purpose":"Test"}'`
- Result: `400` with `{ "error": "equipmentId does not exist" }`

## Finding 2: Overlap detection needed reliability checks

What I found:
- A booking could conflict with an existing reservation if the intervals overlapped, so I needed a precise time comparison.

How I fixed it:
- I implemented overlap detection using timestamp comparisons against the same equipment only, while excluding the current booking during updates.

Evidence:
- Two requests for `eq-1` created at `09:00-11:00` and `10:30-12:00`.
- Result: second request returned `409` with `{ "error": "Booking time conflicts with an existing booking for this equipment" }`

## Finding 3: Error responses and resource handling needed consistency

What I found:
- Missing booking IDs and invalid routes should return standardized JSON errors and correct HTTP status codes.

How I fixed it:
- I added explicit `404` handling for missing bookings and a default route-not-found response. I also standardized `PATCH/DELETE` error handling.

Evidence:
- `curl http://localhost:8787/api/bookings/does-not-exist`
- Result: `404` with `{ "error": "Booking not found" }`

## Reliability / Accuracy

I verified the implementation by running direct terminal tests, not only by reading code. This included checking normal success responses, validation failures, conflicts, and not-found cases.

## Reasoning / You Own It

I traced each business rule back to the task brief and checked that the final code matched the contract. I can explain why each status code is used and why parameterized SQL is required for safe database access.
