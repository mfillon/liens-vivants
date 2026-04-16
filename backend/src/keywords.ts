const STOP_WORDS = new Set([
  // English
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
  'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
  'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
  'did', 'she', 'use', 'that', 'this', 'with', 'have', 'from', 'they',
  'will', 'been', 'more', 'when', 'what', 'your', 'said', 'each', 'which',
  'there', 'their', 'were', 'would', 'about', 'than', 'into', 'them',
  'then', 'some', 'these', 'also', 'just', 'like', 'very', 'such', 'over',
  'after', 'first', 'well', 'even', 'most', 'only', 'both', 'much',
  'being', 'made', 'make', 'where', 'while', 'other', 'could', 'those',
  'here', 'does', 'should', 'because', 'between', 'through', 'before',
  'still', 'without', 'during', 'against', 'think', 'know', 'want',
  'need', 'feel', 'come', 'back', 'give', 'take', 'look', 'find',
  'same', 'long', 'down', 'work', 'part', 'place', 'case', 'week',
  'hand', 'high', 'life', 'move', 'live', 'hold', 'side', 'again',
  'along', 'never', 'every', 'large', 'often', 'point', 'right',
  'things', 'group', 'small', 'great', 'since', 'under', 'always',
  'world', 'think', 'going', 'might', 'shall', 'above', 'below',
  // French — articles, pronouns, prepositions
  'les', 'des', 'une', 'est', 'pas', 'que', 'qui', 'son', 'ses',
  'sur', 'par', 'pour', 'dans', 'avec', 'lors', 'aux', 'ces',
  'cet', 'ceux', 'elle', 'elles', 'eux', 'ils', 'lui', 'moi',
  'toi', 'soi', 'vous', 'nous', 'mon', 'ton', 'nos', 'vos',
  'leur', 'leurs', 'tout', 'tous', 'toute', 'toutes', 'quel',
  'quelle', 'quels', 'quelles', 'dont', 'lequel', 'laquelle',
  'lesquels', 'lesquelles', 'auquel', 'duquel', 'cette', 'celui',
  // French — conjunctions, adverbs, common verbs
  'mais', 'plus', 'bien', 'aussi', 'comme', 'encore', 'toujours',
  'avoir', 'faire', 'tres', 'trop', 'alors', 'ainsi', 'donc',
  'soit', 'tant', 'peu', 'car', 'nul', 'aucun', 'aucune',
  'jamais', 'souvent', 'parfois', 'ici', 'cela', 'ceci',
  'quand', 'comment', 'pourquoi', 'parce', 'avant', 'apres',
  'entre', 'depuis', 'pendant', 'selon', 'vers', 'sans',
  'sous', 'chez', 'tres', 'non', 'oui', 'voila', 'voici',
  'plus', 'moins', 'autant', 'assez', 'tellement', 'vraiment',
  'peut', 'faut', 'doit', 'font', 'sont', 'etait', 'sera',
  'serait', 'avait', 'aurait', 'avons', 'avez', 'avaient',
  'etaient', 'furent', 'suis', 'sommes', 'etes', 'etais',
  'faire', 'faite', 'faits', 'faites', 'fait', 'fais',
]);

/** Extract meaningful keywords from a text string. Returns a Set of lowercase tokens. */
function extractKeywords(text: string | undefined): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  );
}

/** Given an array of text strings, return the union of all keywords. */
function extractKeywordsFromTexts(texts: string[]): Set<string> {
  const result = new Set<string>();
  for (const text of texts) {
    for (const kw of extractKeywords(text)) {
      result.add(kw);
    }
  }
  return result;
}

/** Return the intersection of two Sets as an array. */
function intersect(setA: Set<string>, setB: Set<string>): string[] {
  return [...setA].filter((k) => setB.has(k));
}

export { extractKeywords, extractKeywordsFromTexts, intersect };
