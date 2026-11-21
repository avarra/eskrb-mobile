/** The eSkrb backend. Override per build with EXPO_PUBLIC_API_URL (e.g. a local server). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://eskrb-api.home.sync.si').replace(/\/+$/, '');

// TODO(before external TestFlight): replace with the ward's real phone number.
export const WARD_PHONE = '+38600000000';

export const REMINDER = { hour: 9, minute: 0 } as const;

export const EMERGENCY_NUMBER = '112';

/** Shown next to care-team messages; the server does not send a ward name yet. */
export const WARD = 'Ortopedija';
