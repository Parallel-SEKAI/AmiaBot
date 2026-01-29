import { describe, it, expect } from 'vitest';
import {
  getDayStart,
  getAdjustedHour,
  calculateDuration,
} from '../src/service/sleep.js';

describe('Sleep Service - Boundary Condition Tests', () => {
  describe('getDayStart', () => {
    it('should handle time before 4 AM correctly', () => {
      // Test 03:59 AM - should return previous day's 4 AM
      const dateBefore = new Date(2023, 0, 15, 3, 59, 0); // Jan 15, 2023 03:59:00
      const resultBefore = getDayStart(dateBefore);
      expect(resultBefore.getFullYear()).toBe(2023);
      expect(resultBefore.getMonth()).toBe(0);
      expect(resultBefore.getDate()).toBe(14); // Previous day
      expect(resultBefore.getHours()).toBe(4);
      expect(resultBefore.getMinutes()).toBe(0);
      expect(resultBefore.getSeconds()).toBe(0);
    });

    it('should handle time after 4 AM correctly', () => {
      // Test 04:01 AM - should return current day's 4 AM
      const dateAfter = new Date(2023, 0, 15, 4, 1, 0); // Jan 15, 2023 04:01:00
      const resultAfter = getDayStart(dateAfter);
      expect(resultAfter.getFullYear()).toBe(2023);
      expect(resultAfter.getMonth()).toBe(0);
      expect(resultAfter.getDate()).toBe(15); // Same day
      expect(resultAfter.getHours()).toBe(4);
      expect(resultAfter.getMinutes()).toBe(0);
      expect(resultAfter.getSeconds()).toBe(0);
    });

    it('should handle exactly 4 AM correctly', () => {
      // Test exactly 04:00 AM - should return current day's 4 AM
      const dateAt = new Date(2023, 0, 15, 4, 0, 0); // Jan 15, 2023 04:00:00
      const resultAt = getDayStart(dateAt);
      expect(resultAt.getFullYear()).toBe(2023);
      expect(resultAt.getMonth()).toBe(0);
      expect(resultAt.getDate()).toBe(15); // Same day
      expect(resultAt.getHours()).toBe(4);
      expect(resultAt.getMinutes()).toBe(0);
      expect(resultAt.getSeconds()).toBe(0);
    });
  });

  describe('getAdjustedHour', () => {
    it('should adjust hours before 4 AM', () => {
      // Test 03:00 AM -> should return 27 (3+24)
      const dateBefore = new Date(2023, 0, 15, 3, 0, 0);
      const result = getAdjustedHour(dateBefore);
      expect(result).toBe(27);
    });

    it('should not adjust hours after 4 AM', () => {
      // Test 05:00 AM -> should return 5
      const dateAfter = new Date(2023, 0, 15, 5, 0, 0);
      const result = getAdjustedHour(dateAfter);
      expect(result).toBe(5);
    });

    it('should handle exactly 4 AM', () => {
      // Test 04:00 AM -> should return 4
      const dateAt = new Date(2023, 0, 15, 4, 0, 0);
      const result = getAdjustedHour(dateAt);
      expect(result).toBe(4);
    });

    it('should handle exactly 3 AM', () => {
      // Test 03:00 AM -> should return 27 (3+24)
      const dateAt = new Date(2023, 0, 15, 3, 0, 0);
      const result = getAdjustedHour(dateAt);
      expect(result).toBe(27);
    });
  });

  describe('calculateDuration', () => {
    it('should return undefined for invalid lastSleepTime', () => {
      const result = calculateDuration(new Date(), null);
      expect(result).toBeUndefined();
    });

    it('should return undefined for duration less than minimum threshold (2 hours)', () => {
      const wakeTime = new Date(2023, 0, 15, 10, 0, 0);
      const sleepTime = new Date(2023, 0, 15, 9, 0, 0); // 1 hour sleep
      const result = calculateDuration(wakeTime, sleepTime);
      expect(result).toBeUndefined();
    });

    it('should return valid duration for sleep within acceptable range', () => {
      const wakeTime = new Date(2023, 0, 15, 10, 0, 0);
      const sleepTime = new Date(2023, 0, 15, 6, 0, 0); // 4 hours sleep
      const result = calculateDuration(wakeTime, sleepTime);
      expect(result).toBe(4.0);
    });

    it('should return undefined for sleep time more than 18 hours before day start', () => {
      const wakeTime = new Date(2023, 0, 16, 8, 0, 0); // Next day 8 AM
      const sleepTime = new Date(2023, 0, 15, 2, 0, 0); // Previous day 2 AM (22 hours before wake)
      const dayStart = new Date(2023, 0, 16, 4, 0, 0); // Current day start

      // From dayStart (4 AM) to sleepTime (2 AM previous day) is 26 hours difference
      // sleepTime - dayStart = 2AM Jan 15 - 4AM Jan 16 = -26 hours (26 hours before)
      const result = calculateDuration(wakeTime, sleepTime, dayStart);
      expect(result).toBeUndefined();
    });

    it('should return valid duration for sleep time not exceeding 18 hours before day start', () => {
      const wakeTime = new Date(2023, 0, 16, 8, 0, 0); // Next day 8 AM
      const sleepTime = new Date(2023, 0, 16, 2, 0, 0); // Same day 2 AM (2 hours before day start)
      const dayStart = new Date(2023, 0, 16, 4, 0, 0); // Current day start

      const result = calculateDuration(wakeTime, sleepTime, dayStart);
      expect(result).toBe(6.0); // 6 hours from 2 AM to 8 AM
    });
  });
});
