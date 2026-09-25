import { cleanNamePart, formatPersonName } from '../src/shared/personName';

describe('person-name formatting', () => {
  it('removes leading, trailing, and repeated whitespace', () => {
    expect(cleanNamePart('  Lance   Jefferson  ')).toBe('Lance Jefferson');
  });

  it('omits empty optional name components without adding double spaces', () => {
    expect(formatPersonName('Lance Jefferson ', '   ', ' Ramos Uy', null)).toBe('Lance Jefferson Ramos Uy');
  });
});
