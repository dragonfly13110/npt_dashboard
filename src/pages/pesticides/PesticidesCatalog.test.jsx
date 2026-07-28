import { expect, it } from 'vitest';
import { sortThaiLabels } from './PesticidesCatalog';

it('sorts plant labels in Thai alphabetical order', () => {
  expect(sortThaiLabels(['พริก', 'กล้วย', 'ข้าว', 'มะม่วง'])).toEqual([
    'กล้วย',
    'ข้าว',
    'พริก',
    'มะม่วง',
  ]);
});
