// Numbers in this file are HAND-TYPED for the test, not the app's sample data.
import { describe, expect, it } from 'vitest';
import { count } from '../../format';
import { tipFormat } from './common';

describe('tipFormat', () => {
  it('tipAbs series (sign flipped only for drawing) shows the absolute value; other series keep their sign (U+2212)', () => {
    const f = tipFormat([{ key: 'new_users' }, { key: 'deactivated_out', tipAbs: true }, { key: 'churned_mrr' }], (v) => count(v, 'ja'));
    expect(f('deactivated_out', -12)).toBe('12');
    expect(f('new_users', 7)).toBe('7');
    expect(f('churned_mrr', -12)).toBe('−12');
  });
});
