import { describe, expect, it } from 'vitest';
import { extractKeywords, extractKeywordsFromTexts, intersect } from '@/keywords';

describe('extractKeywords', () => {
  it('returns empty set for empty string', () => {
    expect(extractKeywords('')).toEqual(new Set());
  });

  it('returns empty set for undefined', () => {
    expect(extractKeywords(undefined)).toEqual(new Set());
  });

  it('extracts lowercase tokens of length >= 3', () => {
    const result = extractKeywords('Climate Ocean Nature');
    expect(result).toContain('climate');
    expect(result).toContain('ocean');
    expect(result).toContain('nature');
  });

  it('filters tokens shorter than 3 characters', () => {
    expect(extractKeywords('go to it')).toEqual(new Set());
  });

  it('filters EN stop words', () => {
    const result = extractKeywords('the world');
    expect(result.has('the')).toBe(false);
    expect(result.has('world')).toBe(false); // 'world' is in stop words
  });

  it('filters FR stop words', () => {
    const result = extractKeywords('les arbres sont grands');
    expect(result.has('les')).toBe(false);
    expect(result.has('sont')).toBe(false);
    expect(result.has('arbres')).toBe(true);
    expect(result.has('grands')).toBe(true);
  });
});

describe('extractKeywordsFromTexts', () => {
  it('returns union of keywords across all texts', () => {
    const result = extractKeywordsFromTexts(['ocean climate', 'forest biodiversity']);
    expect(result.has('ocean')).toBe(true);
    expect(result.has('climate')).toBe(true);
    expect(result.has('forest')).toBe(true);
    expect(result.has('biodiversity')).toBe(true);
  });

  it('returns empty set for empty input', () => {
    expect(extractKeywordsFromTexts([])).toEqual(new Set());
  });
});

describe('intersect', () => {
  it('returns shared keywords between two sets', () => {
    const a = new Set(['ocean', 'climate', 'forest']);
    const b = new Set(['climate', 'desert', 'ocean']);
    const result = intersect(a, b);
    expect(result).toContain('ocean');
    expect(result).toContain('climate');
    expect(result).not.toContain('forest');
    expect(result).not.toContain('desert');
  });

  it('returns empty array for disjoint sets', () => {
    expect(intersect(new Set(['apple']), new Set(['banana']))).toEqual([]);
  });

  it('returns empty array when either set is empty', () => {
    expect(intersect(new Set(), new Set(['ocean']))).toEqual([]);
    expect(intersect(new Set(['ocean']), new Set())).toEqual([]);
  });
});
