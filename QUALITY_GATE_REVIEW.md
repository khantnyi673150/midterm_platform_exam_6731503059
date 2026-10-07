# Quality Gate Review

## Review focus

I reviewed the project against the midterm quality gate after the main implementation and used the results to improve the API, the tests, and the documentation before submission.

## Finding 1: Reliability — update handling needed to be safe

What I found:
- The `PATCH /api/bookings/:id` flow had to be checked carefully so it would not conflict with the booking being updated.

How I fixed it:
- I updated the booking overlap logic to exclude the current record during updates and verified the flow against the live API.

Evidence:
- Updated booking request returned `200`.
- Follow-up delete returned `204`, confirming the record was updated correctly and remained addressable.

## Finding 2: Accuracy — the public deployment needed persistent storage

What I found:
- The public Worker had to keep bookings across requests, so an in-memory-only approach was not enough.

How I fixed it:
- I moved the deployed Worker to Cloudflare D1 and verified that list, create, conflict, update, and delete requests worked against the live URL.

Evidence:
- `GET /api/equipment` returned `200`.
- `POST /api/bookings` returned `201`.
- `POST /api/bookings` with overlap returned `409`.

## Finding 3: Reasoning / You Own It — the submission instructions needed to be explicit

What I found:
- The contract and README needed a single, clear public URL and a better testing checklist so the reviewer could follow the exact submission path.

How I fixed it:
- I added the final deployed Worker URL to `API_CONTRACT.md` and expanded the README with a public test table and sample commands.

Evidence:
- `API_CONTRACT.md` now includes `https://knna-midterm-campus-booking-2026.quickbite-api.workers.dev/api`.
- `README.md` now includes a public test checklist and copy-paste curl examples.

## Reliability / Accuracy

I verified the API by testing the live deployed URL, not only by reading the code. I checked success paths and error paths, including `201`, `200`, `204`, `400`, `404`, and `409`.

## Reasoning / You Own It

I can explain why each route exists, why `400`/`404`/`409` are used, how the overlap check works, and why the deployed Worker uses D1 instead of local-only storage.
