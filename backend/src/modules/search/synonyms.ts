export interface SynonymEntry {
  canonical: string;
  variants: string[];
}

const BASE_SYNONYMS: Record<string, SynonymEntry[]> = {
  es: [
    { canonical: 'tornillo', variants: ['perno', 'tirafondo'] },
    { canonical: 'rodamiento', variants: ['balinera', 'cojinete', 'bearing'] },
    { canonical: 'sensor', variants: ['detector', 'transductor'] },
    { canonical: 'motor', variants: ['accionamiento', 'drive'] },
    { canonical: 'valvula', variants: ['válvula', 'llave de paso'] },
    { canonical: 'rele', variants: ['relé', 'relay'] },
    { canonical: 'breaker', variants: ['interruptor', 'disyuntor'] },
    { canonical: 'manguera', variants: ['hose'] },
    { canonical: 'bomba', variants: ['pump'] },
  ],
  en: [
    { canonical: 'bearing', variants: ['ball bearing', 'cojinete', 'rodamiento'] },
    { canonical: 'sensor', variants: ['detector', 'transducer'] },
    { canonical: 'valve', variants: ['flow valve', 'llave de paso'] },
    { canonical: 'relay', variants: ['rele', 'relé'] },
    { canonical: 'hose', variants: ['manguera'] },
  ],
  pt: [
    { canonical: 'rolamento', variants: ['bearing', 'rodamiento'] },
    { canonical: 'sensor', variants: ['detector'] },
  ],
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSearchQuery(query: string): string[] {
  return normalizeText(query)
    .split(' ')
    .map((term) => term.trim())
    .filter(Boolean);
}

export function expandSearchTerms(query: string, languageCode = 'es'): string[] {
  const normalizedQuery = normalizeText(query);
  const tokens = tokenizeSearchQuery(query);
  const set = new Set<string>([normalizedQuery, ...tokens]);

  const dictionary = BASE_SYNONYMS[languageCode] ?? BASE_SYNONYMS['es'] ?? [];

  for (const entry of dictionary) {
    const canonical = normalizeText(entry.canonical);
    const variants = entry.variants.map(normalizeText);

    if (normalizedQuery.includes(canonical) || tokens.includes(canonical)) {
      set.add(canonical);
      variants.forEach((variant) => set.add(variant));
      continue;
    }

    if (
      variants.some(
        (variant) => normalizedQuery.includes(variant) || tokens.includes(variant),
      )
    ) {
      set.add(canonical);
      variants.forEach((variant) => set.add(variant));
    }
  }

  return Array.from(set).filter(Boolean);
}

export function normalizeSearchQuery(query: string): string {
  return normalizeText(query);
}
