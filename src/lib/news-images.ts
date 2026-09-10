const TOPIC_THUMBNAILS: Record<string, string> = {
  'securities finance': 'securities-finance.png',
  'regulation and policy': 'regulation-policy.png',
  'central bank liquidity': 'central-bank-liquidity.png',
  'bank capital and liquidity': 'bank-capital-liquidity.png',
  'market infrastructure': 'market-infrastructure.png',
  'institutional owners': 'institutional-owners.png',
  derivatives: 'derivatives.png',
  'capital markets': 'capital-markets.png',
  'banking and funding': 'banking-funding.png',
  'business strategy': 'business-strategy.png',
  'enterprise technology and ai': 'enterprise-technology-ai.png',
  cybersecurity: 'cybersecurity.png',
  payments: 'payments.png',
  'digital assets': 'digital-assets.png',
};

const TOPIC_ALIASES: Record<string, string> = {
  markets: 'securities finance',
  market: 'securities finance',
  investing: 'securities finance',
  'securities lending': 'securities finance',
  repo: 'securities finance',
  collateral: 'securities finance',
  sofr: 'securities finance',
  specials: 'securities finance',
  tokenization: 'securities finance',
  blockchain: 'securities finance',
  cryptocurrency: 'securities finance',
  regulation: 'regulation and policy',
  policy: 'regulation and policy',
  legal: 'regulation and policy',
  compliance: 'regulation and policy',
  umr: 'regulation and policy',
  't 1': 'regulation and policy',
  banking: 'central bank liquidity',
  funding: 'central bank liquidity',
  liquidity: 'central bank liquidity',
  'funding markets': 'central bank liquidity',
  'central bank': 'central bank liquidity',
  basel: 'bank capital and liquidity',
  lcr: 'bank capital and liquidity',
  nsfr: 'bank capital and liquidity',
  'market structure': 'market infrastructure',
  clearing: 'market infrastructure',
  counterparties: 'market infrastructure',
  technology: 'market infrastructure',
  ai: 'market infrastructure',
  semiconductors: 'market infrastructure',
  cyber: 'market infrastructure',
  'institutional investors': 'institutional owners',
  'asset owners': 'institutional owners',
  'beneficial owners': 'institutional owners',
  pensions: 'institutional owners',
  'pension funds': 'institutional owners',
  strategy: 'institutional owners',
  risk: 'derivatives',
};

function normalizeTopic(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Matches the web News Radar's publisher-image-first, topic-art-second rule. */
export function newsCardImageUrl(
  imageUrl: string | undefined,
  topic: string | undefined,
  webOrigin: string
): string | undefined {
  if (imageUrl?.trim()) return imageUrl.trim();
  if (!webOrigin) return undefined;

  const normalized = normalizeTopic(topic);
  const canonical = TOPIC_ALIASES[normalized] ?? normalized;
  const fileName = TOPIC_THUMBNAILS[canonical] ?? 'generic-fallback.png';
  return `${webOrigin.replace(/\/+$/, '')}/assets/${fileName}`;
}
