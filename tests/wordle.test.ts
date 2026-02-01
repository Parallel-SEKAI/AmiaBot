import { describe, it, expect } from 'vitest';
import { checkGuess } from '../src/features/wordle/feature.js';

describe('Wordle Feature', () => {
  describe('checkGuess', () => {
    it('should mark all correct when guess matches target', () => {
      const result = checkGuess('apple', 'apple');
      expect(result).toEqual([
        'correct',
        'correct',
        'correct',
        'correct',
        'correct',
      ]);
    });

    it('should mark absent letters correctly', () => {
      // target: apple
      // guess:  zzzzz
      const result = checkGuess('zzzzz', 'apple');
      expect(result).toEqual([
        'absent',
        'absent',
        'absent',
        'absent',
        'absent',
      ]);
    });

    it('should mark present letters correctly', () => {
      // target: apple
      // guess:  elppa (reverse)
      // 0: e (in apple at 4) -> present
      // 1: l (in apple at 3) -> present
      // 2: p (matches p at 2) -> correct
      // 3: p (in apple at 1) -> present
      // 4: a (in apple at 0) -> present

      const result = checkGuess('elppa', 'apple');
      expect(result).toEqual([
        'present',
        'present',
        'correct',
        'present',
        'present',
      ]);
    });

    it('should handle correct position mixing with present/absent', () => {
      // target: slate
      // guess:  stare
      // s: correct (0)
      // t: present (in target at 3)
      // a: correct (2)
      // r: absent
      // e: correct (4)

      const result = checkGuess('stare', 'slate');
      expect(result).toEqual([
        'correct',
        'present',
        'correct',
        'absent',
        'correct',
      ]);
    });

    it('should handle duplicate letters correctly', () => {
      // Case 1: Guess has duplicates, target has one
      // target: abbcd
      // guess:  bxbxb

      // target: a b b c d
      // guess:  b x b x b

      // 0: b (present in target at 1 or 2) -> present. Mark target[1] used.
      // 1: x -> absent
      // 2: b (correct matches target[2]) -> correct. Mark target[2] used.
      // 3: x -> absent
      // 4: b (target[1] used, target[2] used) -> absent?

      // Wait, the algorithm usually prioritizes exact matches (Greens) first.
      // Let's check implementation in feature.ts:
      // Pass 1: find correct letters (Greens) and mark used in target.
      // Pass 2: find present letters (Yellows) from remaining target letters.

      // So for: target=abbcd, guess=bxbxb
      // Pass 1:
      // i=0: b!=a
      // i=1: x!=b
      // i=2: b==b -> Green. target[2] used.
      // i=3: x!=c
      // i=4: b!=d

      // Pass 2:
      // i=0: b. target has a,b,c,d (target[2] is used). target[1] is 'b'. Match! Yellow. target[1] used.
      // i=1: x. absent.
      // i=2: (already Green)
      // i=3: x. absent.
      // i=4: b. target has a,c,d remaining. No 'b'. Absent.

      // Result: [present, absent, correct, absent, absent]

      const result = checkGuess('bxbxb', 'abbcd');
      expect(result).toEqual([
        'present',
        'absent',
        'correct',
        'absent',
        'absent',
      ]);
    });

    it('should handle multiple instances in target correctly', () => {
      // target: apple (p, p)
      // guess:  puppy

      // Pass 1:
      // p (0) != a
      // u (1) != p
      // p (2) == p -> Green. target[2] used.
      // p (3) != l
      // y (4) != e

      // Pass 2:
      // p (0). target remaining: a, p(1), l, e. target[1] is p. Yellow. target[1] used.
      // u (1). absent.
      // p (2). done.
      // p (3). target remaining: a, l, e. No p. Absent.
      // y (4). absent.

      // Result: [present, absent, correct, absent, absent]

      const result = checkGuess('puppy', 'apple');
      expect(result).toEqual([
        'present',
        'absent',
        'correct',
        'absent',
        'absent',
      ]);
    });
  });
});
