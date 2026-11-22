import { describe, expect, it } from 'vitest';

import { pushRoute } from './push-route';

describe('pushRoute', () => {
  it('opens home for a manual push', () => {
    expect(pushRoute({ kind: 'manual' })).toBe('/');
  });

  it('opens the notes for a staff message', () => {
    expect(pushRoute({ kind: 'message', episodeId: 'e1' })).toBe('/notes');
  });

  it('opens home for an unknown kind', () => {
    expect(pushRoute({ kind: 'something_new' })).toBe('/');
  });

  it('ignores data without a kind', () => {
    expect(pushRoute(undefined)).toBeNull();
    expect(pushRoute({})).toBeNull();
    expect(pushRoute({ kind: 3 })).toBeNull();
  });
});
