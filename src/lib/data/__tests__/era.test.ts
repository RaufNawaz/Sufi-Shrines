// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseEra, ERA_MIN, ERA_MAX } from '../era';

describe('parseEra', () => {
  it('returns null for empty/null input', () => {
    expect(parseEra(null)).toBeNull();
    expect(parseEra(undefined)).toBeNull();
    expect(parseEra('')).toBeNull();
    expect(parseEra('   ')).toBeNull();
  });

  it('parses a single 4-digit year as exact', () => {
    expect(parseEra('1167')).toEqual({ minCentury: 12, maxCentury: 12, confidence: 'exact' });
    expect(parseEra('1235')).toEqual({ minCentury: 13, maxCentury: 13, confidence: 'exact' });
    expect(parseEra('1966')).toEqual({ minCentury: 20, maxCentury: 20, confidence: 'exact' });
    expect(parseEra('681')).toEqual({ minCentury: 7, maxCentury: 7, confidence: 'exact' });
    expect(parseEra('773')).toEqual({ minCentury: 8, maxCentury: 8, confidence: 'exact' });
    expect(parseEra('2011')).toEqual({ minCentury: 21, maxCentury: 21, confidence: 'exact' });
  });

  it('parses ordinal century texts', () => {
    expect(parseEra('11th Century')).toEqual({ minCentury: 11, maxCentury: 11, confidence: 'approx' });
    expect(parseEra('13th century')).toEqual({ minCentury: 13, maxCentury: 13, confidence: 'approx' });
    expect(parseEra('17th Century')).toEqual({ minCentury: 17, maxCentury: 17, confidence: 'approx' });
    expect(parseEra('7th century CE onwards')).toEqual({ minCentury: 7, maxCentury: 7, confidence: 'approx' });
    expect(parseEra('15th century')).toEqual({ minCentury: 15, maxCentury: 15, confidence: 'approx' });
    expect(parseEra('18th century')).toEqual({ minCentury: 18, maxCentury: 18, confidence: 'approx' });
    expect(parseEra('9th century CE onwards')).toEqual({ minCentury: 9, maxCentury: 9, confidence: 'approx' });
  });

  it('parses century ranges from dash notation', () => {
    expect(parseEra('Buildings date 12th–15th century CE')).toMatchObject({ minCentury: 12, maxCentury: 15 });
    expect(parseEra('Built 9th–10th century CE')).toMatchObject({ minCentury: 9, maxCentury: 10 });
    expect(parseEra('Active c. 6th–12th c. CE')).toMatchObject({ minCentury: 6, maxCentury: 12 });
  });

  it('parses multiple years as approx range', () => {
    const result = parseEra('1823 (site); 1899 (temple built)');
    expect(result).toMatchObject({ minCentury: 19, maxCentury: 19, confidence: 'approx' });

    // 1900 = century 19 (ceil(1900/100)=19); 1901 would be century 20
    const result2 = parseEra('1823 (site); 1900 (temple built)');
    expect(result2).toMatchObject({ minCentury: 19, maxCentury: 19 });
  });

  it('parses "around N AD" as a year', () => {
    const result = parseEra('around 500 AD');
    expect(result).toMatchObject({ minCentury: 5, maxCentury: 5 });
  });

  it('parses "Approx. N years old"', () => {
    const result = parseEra('Approx. 300 years old');
    expect(result?.minCentury).toBeGreaterThanOrEqual(17);
    expect(result?.maxCentury).toBeLessThanOrEqual(19);
    expect(result?.confidence).toBe('approx');
  });

  it('parses complex strings with embedded years', () => {
    expect(parseEra('Completed 1684 CE')).toMatchObject({ minCentury: 17, maxCentury: 17 });
    expect(parseEra('Completed/consecrated 1640')).toMatchObject({ minCentury: 17, maxCentury: 17 });
    expect(parseEra('Founded 9th century CE; abandoned 1947')).toMatchObject({ minCentury: 9, maxCentury: 20 });
    expect(parseEra('Established 1861 (British Raj)')).toMatchObject({ minCentury: 19, maxCentury: 19 });
    expect(parseEra('Associated with Shah Hussain (1538–1599)')).toMatchObject({ minCentury: 16, maxCentury: 16 });
    expect(parseEra('early 18th century (burial c. 1718)')).toMatchObject({ minCentury: 18, maxCentury: 18 });
  });

  it('ERA_MIN and ERA_MAX bound the full data range', () => {
    expect(ERA_MIN).toBeLessThanOrEqual(5);
    expect(ERA_MAX).toBeGreaterThanOrEqual(21);
  });
});
