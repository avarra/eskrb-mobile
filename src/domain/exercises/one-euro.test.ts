import { describe, expect, it } from 'vitest';

import { createPointFilter } from './one-euro';

const at = (x: number, y: number, visible = true) => ({ x, y, visible });

describe('createPointFilter', () => {
  it('passes the first sample through unchanged', () => {
    const f = createPointFilter();
    expect(f.apply([at(100, 200)], 0)).toEqual([{ x: 100, y: 200 }]);
  });

  it('damps small jitter around a still point', () => {
    const f = createPointFilter();
    f.apply([at(100, 100)], 0);
    let last = { x: 0, y: 0 };
    // ±6 px noise at 15 fps.
    for (let i = 1; i <= 30; i++) {
      const noise = i % 2 === 0 ? 6 : -6;
      const [p] = f.apply([at(100 + noise, 100 - noise)], i * 66);
      if (p) last = p;
    }
    expect(Math.abs(last.x - 100)).toBeLessThan(3);
    expect(Math.abs(last.y - 100)).toBeLessThan(3);
  });

  it('follows a fast, sustained move closely', () => {
    const f = createPointFilter();
    f.apply([at(0, 0)], 0);
    let last = { x: 0, y: 0 };
    for (let i = 1; i <= 15; i++) {
      const [p] = f.apply([at(i * 40, 0)], i * 66); // ~600 px/s
      if (p) last = p;
    }
    expect(last.x).toBeGreaterThan(15 * 40 - 80);
  });

  it('holds a briefly invisible point, then drops it and restarts after a long gap', () => {
    const f = createPointFilter(undefined, 400);
    f.apply([at(10, 20)], 0);
    expect(f.apply([at(0, 0, false)], 100)).toEqual([{ x: 10, y: 20 }]);
    expect(f.apply([at(0, 0, false)], 600)).toEqual([null]);
    // Reappears far away after the stale window: no slide from the old position.
    expect(f.apply([at(500, 500)], 1000)).toEqual([{ x: 500, y: 500 }]);
  });

  it('keeps filtering through a short dropout', () => {
    const f = createPointFilter(undefined, 400);
    f.apply([at(0, 0)], 0);
    f.apply([at(0, 0, false)], 66);
    const [p] = f.apply([at(300, 0)], 132);
    expect(p?.x).toBeGreaterThan(0);
    expect(p?.x).toBeLessThan(300);
  });
});
