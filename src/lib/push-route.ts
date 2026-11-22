// Where a tapped server push should open. Pure so it can be unit-tested without native modules.

export type PushRoute = '/' | '/notes' | '/checkin' | '/buddy';

/**
 * The backend sends `data: { kind, episodeId? }`: `kind: 'manual'` (admin broadcast) and `kind: 'buddy'` (a buddy message or cheer);
 * the other kinds are placeholders until the backend adds automatic triggers. Unknown kinds open home.
 */
export function pushRoute(data: unknown): PushRoute | null {
  if (!data || typeof data !== 'object' || !('kind' in data) || typeof data.kind !== 'string') return null;
  switch (data.kind) {
    case 'message':
      return '/notes';
    case 'checkin_reminder':
      return '/checkin';
    case 'buddy':
      return '/buddy';
    default:
      return '/';
  }
}
