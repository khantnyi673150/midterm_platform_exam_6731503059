const equipmentSeed = [
  { id: 'eq-1', name: 'Projector A', location: 'Building 1' },
  { id: 'eq-2', name: 'Meeting Room 2', location: 'Building 2' },
  { id: 'eq-3', name: 'Camera Kit', location: 'Building 3' },
];

type Equipment = { id: string; name: string; location: string };
type Booking = {
  id: string;
  equipmentId: string;
  borrowerName: string;
  startAt: string;
  endAt: string;
  purpose: string;
  createdAt: string;
};

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `bk-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isValidIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function createSQLiteStorage() {
  const equipment: Equipment[] = [...equipmentSeed];
  const bookings: Booking[] = [];

  function findEquipmentById(id: string) {
    return equipment.find((item) => item.id === id);
  }

  function validateBookingPayload(payload: unknown, excludeBookingId?: string) {
    if (!payload || typeof payload !== 'object') {
      throw { status: 400, error: 'Request body must be a JSON object' };
    }

    const b = payload as Record<string, unknown>;
    const equipmentId = b.equipmentId;
    const borrowerName = b.borrowerName;
    const startAt = b.startAt;
    const endAt = b.endAt;
    const purpose = b.purpose;

    if (typeof equipmentId !== 'string' || equipmentId.trim() === '') {
      throw { status: 400, error: 'equipmentId is required' };
    }
    if (!findEquipmentById(equipmentId)) {
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
    const overlap = bookings.some((existing) => {
      if (existing.id === excludeBookingId) return false;
      if (existing.equipmentId !== equipmentId) return false;
      const existingStart = new Date(existing.startAt).getTime();
      const existingEnd = new Date(existing.endAt).getTime();
      return startMs < existingEnd && endMs > existingStart;
    });

    if (overlap) {
      throw { status: 409, error: 'Booking time conflicts with an existing booking for this equipment' };
    }

    return {
      equipmentId: String(equipmentId),
      borrowerName: String(borrowerName).trim(),
      startAt: String(startAt),
      endAt: String(endAt),
      purpose: String(purpose).trim(),
    };
  }

  return {
    allEquipment() {
      return equipment;
    },
    allBookings() {
      return bookings;
    },
    getBooking(id: string) {
      return bookings.find((booking) => booking.id === id);
    },
    createBooking(payload: unknown) {
      const bookingData = validateBookingPayload(payload);

      const booking: Booking = {
        id: generateId(),
        ...bookingData,
        createdAt: new Date().toISOString(),
      };

      bookings.push(booking);
      return booking;
    },
    updateBooking(id: string, payload: unknown) {
      const existing = bookings.find((booking) => booking.id === id);
      if (!existing) {
        throw { status: 404, error: 'Booking not found' };
      }

      const bookingData = validateBookingPayload(payload, id);

      existing.equipmentId = bookingData.equipmentId;
      existing.borrowerName = bookingData.borrowerName;
      existing.startAt = bookingData.startAt;
      existing.endAt = bookingData.endAt;
      existing.purpose = bookingData.purpose;

      return existing;
    },
    deleteBooking(id: string) {
      const index = bookings.findIndex((booking) => booking.id === id);
      if (index === -1) return false;
      bookings.splice(index, 1);
      return true;
    },
  };
}
