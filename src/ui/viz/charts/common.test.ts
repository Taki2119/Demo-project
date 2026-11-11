// Số trong file này là số TỰ GÕ cho test, không phải dữ liệu mẫu của app.
import { describe, expect, it } from 'vitest';
import { count } from '../../format';
import { tipFormat } from './common';

describe('tipFormat', () => {
  it('chuỗi tipAbs (đổi dấu chỉ để vẽ) hiện số tuyệt đối; chuỗi khác giữ dấu (U+2212)', () => {
    const f = tipFormat([{ key: 'new_users' }, { key: 'deactivated_out', tipAbs: true }, { key: 'churned_mrr' }], (v) => count(v, 'ja'));
    expect(f('deactivated_out', -12)).toBe('12');
    expect(f('new_users', 7)).toBe('7');
    expect(f('churned_mrr', -12)).toBe('−12');
  });
});
