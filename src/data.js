export const initialGroups = [
  { id: 'ot', name: 'Operations & Technology', desc: 'Operations, technology, data, and systems discussion', subscribed: true, trending: true },
  { id: 'risk', name: 'Risk', desc: 'Risk, liquidity, counterparty, collateral, and financing controls discussion', subscribed: true, trending: true },
  { id: 'cash', name: 'Cash Management', desc: 'Cash management, treasury, collateral, liquidity, and balance-sheet discussion', subscribed: false, trending: true },
  { id: 'cyber', name: 'Cybersecurity', desc: 'Cybersecurity, information security, technology risk, and member resilience discussion', subscribed: false, trending: false },
  { id: 'legal', name: 'Legal and Regulatory', desc: 'Legal, regulatory, documentation, and cross-border policy discussion', subscribed: false, trending: false },
  { id: 'credit', name: 'Private Credit', desc: 'Private credit, private debt, capital formation, liquidity, and owner governance discussion', subscribed: false, trending: false },
  { id: 'regional', name: 'Regional', desc: 'Canada, U.S., Europe, and APAC meeting preparation and follow-through', subscribed: false, trending: false },
];

export const initialThreads = [
  {
    id: 't1', group: 'ot', title: 'Tokenization pilots and operational readiness', author: 'Aaron Serro', time: '2d',
    tags: ['#tokenization', '#operations'],
    posts: [
      { author: 'Aaron Serro', time: '2d', text: 'We are scoping a tokenized collateral pilot for Q4. Before replying: our custodian supports it, but our internal booking model does not. Who has mapped tokenized positions into an existing books-and-records system without a parallel ledger?' },
      { author: 'Robert Goobie', time: '2d', text: 'We ran a parallel ledger for six months and regretted it. Reconciliation overhead ate the efficiency gains. Happy to share our post-mortem deck at the next call.' },
      { author: 'Jane Doe', time: '1d', text: 'Same experience here. The break was in corporate actions, not settlement. Would join a small session on this.' },
      { author: 'Aaron Serro', time: '1d', text: 'Adding this to the O&T agenda for September. Robert, send the deck to the library when you can.' },
    ],
  },
  {
    id: 't2', group: 'ot', title: 'T+1 settlement fails: what is working', author: 'Aaron Serro', time: '16h',
    tags: ['#settlement', '#operations'],
    posts: [
      { author: 'Aaron Serro', time: '16h', text: 'Fail rates crept up again this quarter. We tightened cutoffs with two agent lenders and it helped. What controls moved the needle for others?' },
      { author: 'Robert Goobie', time: '14h', text: 'Pre-matching by noon T+0 cut our fails roughly in half. The discipline matters more than the tooling.' },
    ],
  },
  {
    id: 't3', group: 'ot', title: 'Vendor consolidation for post-trade systems', author: 'Robert Goobie', time: '1d',
    tags: ['#vendors'],
    posts: [
      { author: 'Robert Goobie', time: '1d', text: 'We are down to two candidate platforms for post-trade consolidation. Anyone completed a migration in under a year with a lean ops team?' },
    ],
  },
  {
    id: 't4', group: 'ot', title: 'Collateral schedule automation', author: 'Aaron Serro', time: '3d',
    tags: ['#collateral'],
    posts: [
      { author: 'Aaron Serro', time: '3d', text: 'Manual schedule updates are our biggest operational bottleneck. Looking for peers who automated eligibility checks against triparty feeds.' },
    ],
  },
  {
    id: 't5', group: 'risk', title: 'Counterparty limits for non-bank FMIs', author: 'Jane Doe', time: '1d',
    tags: ['#counterparty-risk'],
    posts: [
      { author: 'Jane Doe', time: '1d', text: 'How are peers sizing exposure limits for non-bank financial market infrastructures? Our framework was written for bank counterparties and does not translate cleanly.' },
    ],
  },
  {
    id: 't6', group: 'risk', title: 'Stress-testing liquidity under rate shocks', author: 'Aaron Serro', time: '2d',
    tags: ['#liquidity', '#stress-testing'],
    posts: [
      { author: 'Aaron Serro', time: '2d', text: 'Sharing our latest stress scenarios: parallel +300bp and an inverted-curve shock. Interested in how others set haircut assumptions under stress.' },
      { author: 'Robert Goobie', time: '2d', text: 'We anchor stressed haircuts to 2022 gilt-crisis observed levels plus a buffer. Crude but defensible to the board.' },
    ],
  },
  {
    id: 't7', group: 'risk', title: 'Repo haircut benchmarks', author: 'Robert Goobie', time: '4d',
    tags: ['#repo', '#collateral'],
    posts: [
      { author: 'Robert Goobie', time: '4d', text: 'Annual benchmark refresh: posting the anonymized haircut survey. Please submit your ranges by end of month.' },
    ],
  },
];

export const avatarColors = {
  'Aaron Serro': '#A9D9A4',
  'Robert Goobie': '#9BC4E0',
  'Jane Doe': '#E0C79B',
};

export const orgs = [
  { abbr: 'ADIA', name: 'Abu Dhabi Investment Authority', country: 'United Arab Emirates', type: 'Sovereign', blurb: 'Established in 1976, ADIA is a globally diversified investment institution.', members: '2 members', accent: '#C9A9D9' },
  { abbr: 'CALP', name: "California Public Employees' Retirement System", country: 'United States', type: 'Pension', blurb: "CalPERS is the nation's largest public pension fund, serving more than 2 million members.", members: '3 members', accent: '#9BC4E0' },
  { abbr: 'CIBC', name: 'Canadian Imperial Bank of Commerce', country: 'Canada', type: 'Asset Mgr', blurb: 'Global Asset Management for CIBC.', members: '1 member', accent: '#9BC4E0' },
  { abbr: 'ESEC', name: 'eSecLending', country: 'United States', type: 'Asset Mgr', blurb: 'An independent, third-party securities financing agent.', members: '3 members', accent: '#9BC4E0' },
  { abbr: 'HOOP', name: 'Healthcare of Ontario Pension Plan', country: 'Canada', type: 'Pension', blurb: 'Founded in 1960 by the Ontario Hospital Association.', members: '16 members', accent: '#A9D9A4' },
  { abbr: 'NBIM', name: 'Norges Bank Investment Management', country: 'Norway', type: 'Sovereign', blurb: 'Manages the Government Pension Fund Global.', members: '1 member', accent: '#C9A9D9' },
  { abbr: 'OMER', name: 'Ontario Municipal Employees Retirement System', country: 'Canada', type: 'Pension', blurb: "One of Canada's largest defined benefit pension plans.", members: '1 member', accent: '#A9D9A4' },
  { abbr: 'OTPP', name: "Ontario Teachers' Pension Plan", country: 'Canada', type: 'Pension', blurb: 'One of the largest pension plans in the world.', members: '1 member', accent: '#A9D9A4' },
  { abbr: 'SWIB', name: 'State of Wisconsin Investment Board', country: 'United States', type: 'Pension', blurb: 'An independent state agency investing the Wisconsin Retirement System.', members: '3 members', accent: '#9BC4E0' },
];

export const events = [
  { month: 'SEP', day: '21', title: 'GPFA Annual Member Meeting 2026', place: 'Columbus, Ohio · 4 attending' },
  { month: 'OCT', day: '13', title: "ISLA Americas' Beneficial Owner Briefing", place: 'Ritz-Carlton, Miami, Florida' },
];

export const homeNews = [
  { title: 'Cerebras Raises Forecasts on AI Demand, but Shares Sink Nearly 14%', tag: 'ENTERPRISE TECH & AI', date: 'AUG 13' },
  { title: 'Standard Bank Group 2026 Interim Results', tag: 'BANKING & FUNDING', date: 'AUG 13' },
  { title: 'Automation Leaves Financial Institutions Exposed to Fraud', tag: 'CYBERSECURITY', date: 'AUG 12' },
];

export const newsItems = [
  { tag: 'ENTERPRISE TECH & AI', title: 'Cerebras Raises Forecasts on AI Demand, but Shares Sink Nearly 14%', source: 'IN.MARKETSCREENER.COM', date: 'AUG 13', excerpt: 'Cerebras raised its forecasts as demand for AI computing remained strong. Investors reacted negatively to the earnings update.' },
  { tag: 'ENTERPRISE TECH & AI', title: 'Cerebras Systems Swings to Q2 Loss, Revenue Increases; 2026 Revenue Outlook Raised', source: 'IN.MARKETSCREENER.COM', date: 'AUG 13', excerpt: 'Cerebras reported a second-quarter 2026 loss while revenue increased year over year, citing continued AI demand.' },
  { tag: 'BANKING & FUNDING', title: 'Standard Bank Group 2026 Interim Results', source: 'STANDARDBANK.COM', date: 'AUG 13', excerpt: 'Standard Bank Group reported 10% growth in first-half 2026 headline earnings. Return on equity increased to 19.8%.' },
  { tag: 'CYBERSECURITY', title: 'Automation Leaves Financial Institutions Exposed to Fraud', source: 'RESISTANT.AI', date: 'AUG 12', excerpt: 'Fraud risks created when financial institutions automate document handling and decision-making.' },
  { tag: 'ENTERPRISE TECH & AI', title: 'AI in Finance Summit Chicago 2026: Everything You Need to Know', source: 'AIEXPERTMAGAZINE.COM', date: 'AUG 12', excerpt: 'A preview of the August 12, 2026 event on AI across banking, payments, and fintech.' },
];

export const announcements = [
  { isSurvey: true, status: 'Closed Aug 10', title: '2026 Member Priorities Survey', date: '3 statements across 1 question', body: 'Help shape working-group agendas for the second half of the year.', edge: '#A9D9A4' },
  { isSurvey: true, status: 'Closed Aug 8', title: 'Annual Meeting Session Feedback', date: '6 statements across 2 questions', body: 'Tell us which sessions to bring back for Columbus.', edge: '#A9D9A4' },
  { isSurvey: false, title: 'Annual Meeting registration is open', date: 'Wed, Aug 5, 2026', body: 'Register for GPFA Annual Meeting, September 21–23 in Columbus, Ohio. Member sessions announced next week.', edge: 'rgba(255,255,255,0.12)' },
  { isSurvey: false, title: 'New working group: Private Credit', date: 'Sun, Jul 26, 2026', body: 'Private credit, private debt, capital formation, liquidity, and owner governance discussion is now open to all members.', edge: 'rgba(255,255,255,0.12)' },
  { isSurvey: false, title: 'Podcast: Celebrating Five Years of Peer Collaboration', date: 'Wed, Jun 24, 2026', body: 'A 36-minute conversation marking five years of the association.', edge: 'rgba(255,255,255,0.12)' },
];

export const profileRows = [
  { label: 'Organization', detail: 'HOOPP' },
  { label: 'Admin Console', detail: '' },
  { label: 'Notifications', detail: 'On' },
  { label: 'Your RSVPs', detail: '2 pending' },
  { label: 'Help & support', detail: '' },
];

export const tagList = ['#collateral', '#counterparty-risk', '#liquidity', '#governance', '#repo', '#stress-testing'];

export const askSuggestions = [
  "What are GPFA's current priorities?",
  'How is GPFA covering tokenization?',
  'Risks in direct peer financing?',
  "Who are GPFA's public leaders?",
];

export const askAnswerText =
  'Members are actively discussing tokenization pilots, T+1 settlement fails, and stressed haircut benchmarks. The Operations & Technology group has the most recent activity [1], and the 2026 Annual Meeting agenda covers tokenized collateral readiness in the September session [2].';

export const initials = (name) => name.split(' ').map((w) => w[0]).join('').toUpperCase();

// Matches the design's stagger: 0.05s + index * 0.06s, expressed in ms.
export const delay = (i) => 50 + i * 60;
