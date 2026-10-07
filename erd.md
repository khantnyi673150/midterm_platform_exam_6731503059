# Schema / ERD

## Overview

The API uses two tables:

- `equipment` stores the shared resources that can be booked.
- `bookings` stores reservation records and links each booking to one equipment item.

## ERD

```text
equipment
- id (PK)
- name
- location

    1
    |
    | one-to-many
    |
    v

bookings
- id (PK)
- equipment_id (FK -> equipment.id)
- borrower_name
- start_at
- end_at
- purpose
- created_at
```

## Relationship

- One equipment item can have many bookings.
- Each booking belongs to exactly one equipment item.

## Business rules supported by the schema

- `equipment_id` must reference an existing equipment record.
- Booking times are stored as ISO timestamps.
- Overlap checks are performed on bookings for the same equipment.
