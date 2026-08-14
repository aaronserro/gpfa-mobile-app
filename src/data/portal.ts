/** Content transcribed verbatim from the design's DCLogic constructor. */
import type { WgRuleClass } from '../ds/tokens';

export interface Reply {
  a: string;
  org: string;
  time: string;
  initials?: string;
  /** Rendered as a highlighted @-mention prefix before the body text. */
  mention?: string;
  text: string;
}

export interface PollOption {
  label: string;
  votes: number;
}

export interface Poll {
  q: string;
  closes: string;
  options: PollOption[];
}

export interface Thread {
  id: string;
  title: string;
  author: string;
  org: string;
  time: string;
  body: string;
  file?: string;
  fileMeta?: string;
  poll?: Poll;
  replies: Reply[];
}

export interface Group {
  id: string;
  n: string;
  short: string;
  cls: WgRuleClass;
  unread: number;
  meta: string;
  threads: Thread[];
}

export interface Answer {
  /** Lowercased substrings matched against the question. */
  k: string[];
  text: string;
  sources: string[];
}

export type Relevance = 'high' | 'medium' | 'low';

export interface NewsItem {
  rel: Relevance;
  tag: string;
  t: string;
  src: string;
}

export const GROUPS: Group[] = [
  {
    id: 'cl',
    n: 'Collateral & Liquidity',
    short: 'Collateral & Liq',
    cls: 'wg-rule-collateral-liquidity',
    unread: 12,
    meta: '12 new posts this week',
    threads: [
      {
        id: 'cl1',
        title: 'Indemnification comparison matrix — draft v3 open for comment',
        author: 'Elena Rossi',
        org: 'APG',
        time: '2h ago',
        body: 'Draft v3 of the comparison matrix is attached. Changes since v2: split the indemnification column into agent-provided vs third-party wrap, added the two SWF respondents, and normalized collateral haircut bands. Please comment by Friday — we want to close this out before the October roundtable.',
        file: 'Indemnification-Matrix-v3.xlsx',
        fileMeta: 'XLSX · 214 KB · UPLOADED TODAY',
        replies: [
          { a: 'Marcus Chen', org: 'CPP Investments', time: '1h ago', initials: 'MC', mention: '@Elena Rossi', text: 'row 14 — our program moved to a split structure in June, so the v2 entry is stale. I will send corrected figures directly.' },
          { a: 'Priya Nair', org: 'GIC', time: '48m ago', initials: 'PN', text: 'The haircut bands are much easier to compare now. Suggest we freeze the taxonomy after this round so the roundtable pre-read is stable.' },
          { a: 'Jonas Weber', org: 'Allianz IM', time: '20m ago', initials: 'JW', text: 'Can we add a column flagging which programs changed indemnification terms after the Basel recalibration draft? That is the question our board keeps asking.' },
        ],
      },
      {
        id: 'cl2',
        title: 'Preferred settlement window for the Q4 tri-party pilot',
        author: 'Marcus Chen',
        org: 'CPP Investments',
        time: '6h ago',
        body: 'Before the custodians lock the pilot spec we should agree a preferred settlement window. Vote below — one response per organization, closes Monday.',
        poll: {
          q: 'Which settlement window should the pilot target?',
          closes: 'Closes Mon · one vote per org',
          options: [
            { label: 'T+0 same-day', votes: 14 },
            { label: 'T+1 overnight', votes: 8 },
            { label: 'Split by currency', votes: 5 },
          ],
        },
        replies: [
          { a: 'Sofia Lindqvist', org: 'AP4', time: '3h ago', initials: 'SL', text: 'Voted T+0. If the pilot cannot prove same-day we will not get internal sign-off to scale it.' },
          { a: 'Elena Rossi', org: 'APG', time: '2h ago', initials: 'ER', mention: '@Marcus Chen', text: 'the currency split matters for us — EUR legs settle differently under our custody setup. Happy to write up the edge cases.' },
        ],
      },
      {
        id: 'cl3',
        title: 'Cash vs non-cash collateral mix — what peers are seeing',
        author: 'Priya Nair',
        org: 'GIC',
        time: '1d ago',
        body: 'Our non-cash share crossed 60% this quarter, driven by equity collateral acceptance in two lending programs. Curious where other members sit and whether anyone has repriced their cash reinvestment guidelines as a result.',
        replies: [
          { a: 'Robert Goobie', org: 'HOOPP', time: '22h ago', initials: 'RG', text: 'We are near 70/30 non-cash. Reinvestment guidelines unchanged, but we tightened eligible-collateral schedules instead.' },
          { a: 'Jonas Weber', org: 'Allianz IM', time: '18h ago', initials: 'JW', text: 'Similar picture. The interesting shift is custodians quoting differentiated fees by collateral type — worth a thread of its own.' },
        ],
      },
    ],
  },
  {
    id: 'ld',
    n: 'Legal & Documentation',
    short: 'Legal & Docs',
    cls: 'wg-rule-legal',
    unread: 3,
    meta: '3 new posts this week',
    threads: [
      {
        id: 'ld1',
        title: 'GMSLA 2018 annex — jurisdiction carve-outs thread',
        author: 'Amara Okafor',
        org: 'OTPP',
        time: '5h ago',
        body: 'Consolidating the jurisdiction carve-out language members have negotiated into the 2018 annex. Netherlands and Singapore versions are in. If your counsel has agreed language for other jurisdictions, post it here and we will fold it into the library template.',
        replies: [
          { a: 'Elena Rossi', org: 'APG', time: '3h ago', initials: 'ER', text: 'Dutch language attached to the library entry — note it predates the 2025 securities law amendment, flagging for review.' },
          { a: 'David Park', org: 'NPS', time: '1h ago', initials: 'DP', mention: '@Amara Okafor', text: 'Korean carve-out is with our external counsel now, expect to share next week.' },
        ],
      },
      {
        id: 'ld2',
        title: 'Basel endgame: indemnification language your counsel is proposing',
        author: 'David Park',
        org: 'NPS',
        time: '2d ago',
        body: 'Following the recalibration draft, our agent lender proposed revised indemnification language that shifts capital-driven costs to the lender. Has anyone accepted, rejected, or countered similar language? Redacted excerpts welcome.',
        replies: [
          { a: 'Amara Okafor', org: 'OTPP', time: '1d ago', initials: 'AO', text: 'We countered with a fee-adjustment mechanism instead of accepting the shifted language. Counsel memo is in the library under Basel/Indemnification.' },
        ],
      },
    ],
  },
  {
    id: 'te',
    n: 'Technology',
    short: 'Technology',
    cls: 'wg-rule-technology',
    unread: 5,
    meta: '5 new posts this week',
    threads: [
      {
        id: 'te1',
        title: 'Connectivity survey open until Aug 22 — please respond',
        author: 'Sofia Lindqvist',
        org: 'AP4',
        time: '8h ago',
        body: 'The annual connectivity survey is open: platforms, messaging standards, and post-trade integrations. Fifteen minutes, one response per organization. Results presented at the September call and feed the vendor scorecard.',
        replies: [
          { a: 'Marcus Chen', org: 'CPP Investments', time: '5h ago', initials: 'MC', text: 'Submitted. One suggestion: add a question on API access to tri-party data — it came up in three threads this quarter.' },
        ],
      },
      {
        id: 'te2',
        title: 'Anyone piloting DLT collateral records in production?',
        author: 'Jonas Weber',
        org: 'Allianz IM',
        time: '3d ago',
        body: 'We have a proof of concept moving collateral records to a shared ledger with one custodian. Before we commit to a production pilot: has any member run this in production, and what broke first?',
        replies: [
          { a: 'Priya Nair', org: 'GIC', time: '2d ago', initials: 'PN', text: 'Production since March, limited to one counterparty pair. What broke first was reconciliation with the custodian legacy feed, not the ledger itself.' },
          { a: 'Sofia Lindqvist', org: 'AP4', time: '2d ago', initials: 'SL', mention: '@Priya Nair', text: 'would love a 30-minute walkthrough of that reconciliation fix at the next call.' },
        ],
      },
    ],
  },
  {
    id: 'ri',
    n: 'Risk',
    short: 'Risk',
    cls: 'wg-rule-risk',
    unread: 2,
    meta: '2 new posts this week',
    threads: [
      {
        id: 'ri1',
        title: 'Counterparty scoring methodology — v2 feedback window',
        author: 'Robert Goobie',
        org: 'HOOPP',
        time: '1d ago',
        body: 'V2 of the shared counterparty scoring methodology incorporates the feedback from June: separate liquidity and wrong-way risk factors, and a quarterly refresh cadence. Feedback window closes end of month, then we publish to the library as the reference version.',
        replies: [
          { a: 'David Park', org: 'NPS', time: '20h ago', initials: 'DP', text: 'The wrong-way risk factor split is the right call. One request: publish the scoring worksheet alongside the methodology PDF.' },
        ],
      },
      {
        id: 'ri2',
        title: 'Stress scenarios for indemnification withdrawal',
        author: 'Amara Okafor',
        org: 'OTPP',
        time: '4d ago',
        body: 'If agents withdraw or reprice indemnification post-Basel, what does the stress scenario look like for your lending revenue and collateral posture? Sketching a common scenario set the group can run internally.',
        replies: [
          { a: 'Robert Goobie', org: 'HOOPP', time: '3d ago', initials: 'RG', text: 'We ran a version of this in Q2 — happy to contribute our scenario parameters as a starting point.' },
        ],
      },
    ],
  },
];

export const ANSWERS: Answer[] = [
  {
    k: ['indemn'],
    text: 'Across responding members, agent-provided indemnification remains the default: 28 of 41 organizations in the 2026 practices survey retain it for securities lending, 9 run split structures, and 4 lend unindemnified in at least one program. The live question is pricing — three working groups currently have threads on how Basel recalibration shifts indemnification capital costs, and the draft comparison matrix in Collateral & Liquidity normalizes terms across 24 member programs.',
    sources: ['Indemnification comparison matrix v3 — Collateral & Liquidity', '2026 Member Practices Survey — Library', 'Basel endgame thread — Legal & Documentation'],
  },
  {
    k: ['collateral', 'summar', 'week'],
    text: 'Collateral & Liquidity had 12 new posts this week across three threads: draft v3 of the indemnification comparison matrix opened for comment (closes Friday), the Q4 tri-party pilot settlement-window poll is running until Monday with T+0 currently leading, and a discussion on cash vs non-cash collateral mix where members report non-cash shares of 60–70%.',
    sources: ['Indemnification comparison matrix v3 — thread', 'Q4 tri-party pilot poll — thread', 'Cash vs non-cash mix — thread'],
  },
  {
    k: ['roundtable', 'event', 'meeting'],
    text: 'Two events are open for registration: the GPFA Annual Meeting 2026 in Toronto on September 17–18 (you are registered), and a members-only roundtable on agency-lending indemnification under Basel recalibration on October 8, held virtually. The roundtable pre-read will be the finalized comparison matrix from Collateral & Liquidity.',
    sources: ['Events calendar — Member portal', 'October roundtable announcement'],
  },
];

export const FALLBACK_ANSWER: Omit<Answer, 'k'> = {
  text: 'I could not find a direct match in the member library for that. The closest material is in the working-group threads — try narrowing to a topic like indemnification, collateral mix, or the tri-party pilot, or post the question to the relevant working group.',
  sources: ['Member library — search index'],
};

export const NEWS: NewsItem[] = [
  { rel: 'high', tag: 'Sec Finance', t: 'CDCC expands cleared repo access for beneficial owners', src: 'SECURITIES FINANCE TIMES · 2H' },
  { rel: 'high', tag: 'Regulation', t: 'Basel endgame recalibration: what changes for agency lending indemnification', src: 'RISK.NET · 5H' },
  { rel: 'medium', tag: 'Collateral', t: 'Tri-party interoperability pilot adds two more custodians', src: 'GLOBAL INVESTOR · 9H' },
  { rel: 'low', tag: 'Markets', t: 'Sovereign funds lift allocations to private credit', src: 'FT · 1D' },
];

export const SUGGESTIONS: string[] = [
  'How do peers structure agency-lending indemnification?',
  "Summarize this week's Collateral & Liquidity activity",
  'When is the next members-only roundtable?',
];

export const initials = (n: string): string =>
  n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export const findAnswer = (q: string): Omit<Answer, 'k'> => {
  const lq = q.toLowerCase();
  return ANSWERS.find((a) => a.k.some((k) => lq.includes(k))) ?? FALLBACK_ANSWER;
};
