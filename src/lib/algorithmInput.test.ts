import { describe, expect, it } from 'vitest';
import { parseAlgorithmInteger, parseAlgorithmValues } from './algorithmInput';

describe('educational integer input', () => {
  it('accepts signs, limits and pasted comma/space separated values', () => {
    expect(parseAlgorithmInteger(' -2147483648 ')).toBe(-2147483648);
    expect(parseAlgorithmInteger('+2147483647')).toBe(2147483647);
    expect(parseAlgorithmValues('8, 3\n5, -1, +3', 32)).toEqual([8, 3, 5, -1, 3]);
  });
  it('rejects truncation, non-finite values, notation and overflow', () => {
    for (const value of ['', ' ', '1.5', 'NaN', 'Infinity', '1e3', '0x10', '2147483648', '-2147483649']) expect(parseAlgorithmInteger(value)).toBeNull();
    expect(parseAlgorithmValues('2, Infinity, 1', 32)).toBeNull();
    expect(parseAlgorithmValues('2, 1.5', 32)).toBeNull();
  });
  it('enforces the catalog limit before requesting a trace', () => {
    expect(parseAlgorithmValues('', 32)).toBeNull();
    expect(parseAlgorithmValues(Array(32).fill('1').join(','), 32)).toHaveLength(32);
    expect(parseAlgorithmValues(Array(33).fill('1').join(','), 32)).toBeNull();
  });
});
