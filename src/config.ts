/** The eSkrb backend. Override per build with EXPO_PUBLIC_API_URL (e.g. a local server). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://eskrb-api.home.sync.si').replace(/\/+$/, '');

// TODO(before external TestFlight): replace with the ward's real phone number.
export const WARD_PHONE = '+38600000000';

export const REMINDER = { hour: 9, minute: 0 } as const;

export const EMERGENCY_NUMBER = '112';

/** Shown next to care-team messages; the server does not send a ward name yet. */
export const WARD = 'Ortopedija';

/**
 * Speech to text. `soniox` streams microphone PCM straight to Soniox with a single-use key from
 * `POST /stt/temporary-key`, falling back to on-device dictation; `device` uses on-device dictation only.
 * The region must match the Soniox project the backend mints keys from (currently US).
 * TODO(before real patient data): move the backend to an EU Soniox project and switch this to 'eu'.
 */
export const STT = {
  engine: process.env.EXPO_PUBLIC_STT === 'device' ? 'device' : 'soniox',
  region: process.env.EXPO_PUBLIC_SONIOX_REGION ?? 'us',
  model: 'stt-rt-v6',
} as const;
