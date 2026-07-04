import { describe, it, expect } from 'vitest';
import { isMealLocked, cutoffLabel } from '../../food/mealCutoff';

// IST = UTC+5:30. Helper: build an epoch-ms timestamp from an IST wall-clock
// date + time, by first computing the equivalent UTC instant.
function istMs(dateStr: string, hh: number, mm: number): number {
  const utcMs = Date.parse(`${dateStr}T00:00:00.000Z`) + (hh * 60 + mm) * 60 * 1000 - 5.5 * 60 * 60 * 1000;
  return utcMs;
}

describe('isMealLocked', () => {
  describe('Breakfast — cutoff midnight (00:00) IST, same day', () => {
    it('is NOT locked for tomorrow at 11:59 PM tonight (cutoff is tomorrow itself, not tonight)', () => {
      const now = istMs('2026-07-10', 23, 59);
      expect(isMealLocked('Breakfast', '2026-07-11', now)).toBe(false);
    });

    it('is locked the instant it becomes the target date (00:00:00)', () => {
      const now = istMs('2026-07-11', 0, 0);
      expect(isMealLocked('Breakfast', '2026-07-11', now)).toBe(true);
    });

    it('is locked one minute after midnight on the target date', () => {
      const now = istMs('2026-07-11', 0, 1);
      expect(isMealLocked('Breakfast', '2026-07-11', now)).toBe(true);
    });

    it('is locked all day once the date has arrived (e.g. 6 PM same day)', () => {
      const now = istMs('2026-07-11', 18, 0);
      expect(isMealLocked('Breakfast', '2026-07-11', now)).toBe(true);
    });
  });

  describe('Lunch — cutoff 05:00 IST, same day', () => {
    it('is NOT locked before 5 AM on the meal day', () => {
      const now = istMs('2026-07-11', 4, 59);
      expect(isMealLocked('Lunch', '2026-07-11', now)).toBe(false);
    });

    it('is locked exactly at 5:00 AM', () => {
      const now = istMs('2026-07-11', 5, 0);
      expect(isMealLocked('Lunch', '2026-07-11', now)).toBe(true);
    });

    it('is locked one minute after 5 AM', () => {
      const now = istMs('2026-07-11', 5, 1);
      expect(isMealLocked('Lunch', '2026-07-11', now)).toBe(true);
    });
  });

  describe('Dinner — cutoff 12:30 PM IST, same day', () => {
    it('is NOT locked before 12:30 PM on the meal day', () => {
      const now = istMs('2026-07-11', 12, 29);
      expect(isMealLocked('Dinner', '2026-07-11', now)).toBe(false);
    });

    it('is locked exactly at 12:30 PM', () => {
      const now = istMs('2026-07-11', 12, 30);
      expect(isMealLocked('Dinner', '2026-07-11', now)).toBe(true);
    });

    it('is locked one minute after 12:30 PM', () => {
      const now = istMs('2026-07-11', 12, 31);
      expect(isMealLocked('Dinner', '2026-07-11', now)).toBe(true);
    });
  });

  describe('past and future dates', () => {
    it('a date before today is always locked, regardless of meal block', () => {
      const now = istMs('2026-07-11', 6, 0);
      expect(isMealLocked('Breakfast', '2026-07-10', now)).toBe(true);
      expect(isMealLocked('Lunch', '2026-07-10', now)).toBe(true);
      expect(isMealLocked('Dinner', '2026-07-10', now)).toBe(true);
    });

    it('a date more than one day in the future is never locked', () => {
      const now = istMs('2026-07-11', 23, 0); // late tonight
      expect(isMealLocked('Dinner', '2026-07-13', now)).toBe(false);
      expect(isMealLocked('Lunch', '2026-07-13', now)).toBe(false);
    });

    it("today's date itself uses the same-day cutoff for all three blocks", () => {
      const now = istMs('2026-07-11', 0, 0); // midnight
      expect(isMealLocked('Breakfast', '2026-07-11', now)).toBe(true);  // cutoff 00:00 -> locked
      expect(isMealLocked('Lunch', '2026-07-11', now)).toBe(false);     // cutoff 05:00 -> not yet
      expect(isMealLocked('Dinner', '2026-07-11', now)).toBe(false);    // cutoff 12:30 -> not yet
    });
  });
});

describe('cutoffLabel', () => {
  it('formats each block\'s cutoff time correctly', () => {
    expect(cutoffLabel('Breakfast')).toBe('12:00 AM');
    expect(cutoffLabel('Lunch')).toBe('5:00 AM');
    expect(cutoffLabel('Dinner')).toBe('12:30 PM');
  });
});
