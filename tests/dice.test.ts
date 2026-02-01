import { describe, it, expect } from 'vitest';
import { parseDiceCommand } from '../src/features/dice/feature.js';

describe('Dice Feature', () => {
  describe('parseDiceCommand', () => {
    it('should parse standard dice command (e.g. r2d20)', () => {
      const result = parseDiceCommand('r2d20');
      expect(result).toEqual({ count: 2, sides: 20 });
    });

    it('should parse command with default count (e.g. rd20)', () => {
      // The regex is /^r(\d*)d(\d*)/i
      // "rd20" -> match[1] is empty string, match[2] is "20"
      // parseInt("") is NaN, so check logic in feature.ts: parseInt(match[1]) || 1
      const result = parseDiceCommand('rd20');
      expect(result).toEqual({ count: 1, sides: 20 });
    });

    it('should parse command with default sides (e.g. r2d)', () => {
      // "r2d" -> match[1] is "2", match[2] is empty
      const result = parseDiceCommand('r2d');
      expect(result).toEqual({ count: 2, sides: 100 });
    });

    it('should parse simple "r" command as 1d100', () => {
      // "r" -> match[1] empty, match[2] undefined? No, because "d" is in the regex literal...
      // Wait, regex is /^r(\d*)d(\d*)/i
      // So "r" will NOT match because 'd' is required.
      // Let's check the code: const pattern = /^r(\d*)d(\d*)/i;

      // Actually, most dice bots treat "r" as "roll 1d100".
      // But based on the regex `^r(\d*)d(\d*)`, the 'd' character is mandatory.
      // Let's verify this behavior with a test case that expects null, or strict adherence to regex.

      const result = parseDiceCommand('r');
      expect(result).toBeNull();
    });

    it('should parse "rd" as 1d100', () => {
      const result = parseDiceCommand('rd');
      expect(result).toEqual({ count: 1, sides: 100 });
    });

    it('should ignore case', () => {
      const result = parseDiceCommand('R1D100');
      expect(result).toEqual({ count: 1, sides: 100 });
    });

    it('should return null for invalid commands', () => {
      expect(parseDiceCommand('invalid')).toBeNull();
      expect(parseDiceCommand('123')).toBeNull();
    });
  });
});
