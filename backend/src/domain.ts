export function defaultParticipantName(n: number, language: string): string {
  return language === 'fr' ? `Participant·e ${n}` : `Participant ${n}`;
}
