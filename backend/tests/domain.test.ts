import { describe, expect, it } from 'vitest';
import { defaultParticipantName } from '@/domain';

describe('defaultParticipantName', () => {
  it('returns English format', () => {
    expect(defaultParticipantName(1, 'en')).toBe('Participant 1');
    expect(defaultParticipantName(5, 'en')).toBe('Participant 5');
  });

  it('returns French inclusive format', () => {
    expect(defaultParticipantName(1, 'fr')).toBe('Participant·e 1');
    expect(defaultParticipantName(3, 'fr')).toBe('Participant·e 3');
  });

  it('defaults to English for unknown language', () => {
    expect(defaultParticipantName(1, 'de')).toBe('Participant 1');
    expect(defaultParticipantName(1, '')).toBe('Participant 1');
  });
});
