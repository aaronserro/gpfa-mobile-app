# Adding a Screen

Read this before writing any new screen. It is the house style for this app —
following it keeps every screen API-ready, themeable, and small.

Read [`CONTRACT.md`](../CONTRACT.md) alongside it for the API shape.

---

## The one rule

**Screens are presentational. They receive data as props and never fetch, never
import fixtures, and never hold server state.**

```
src/api/types.ts     ← 1. define the shape
src/api/config.ts    ← 2. add the route
src/data/fixtures.ts ← 3. add fixture data
src/api/portal.ts    ← 4. add the repository function (fixture + HTTP branches)
src/screens/Foo.tsx  ← 5. build the screen, props only
App.tsx              ← 6. query, gate, pass props down
```

If a screen imports `src/data/fixtures.ts`, the step was skipped. This must
always return exactly one hit:

```bash
grep -rn "data/fixtures" src App.tsx     # → src/api/portal.ts only
```

---

## Step 1 — Define the type

In `src/api/types.ts`. This is the contract, so name fields for what they mean
and document anything non-obvious.

```ts
/** A document in the member library. */
export interface LibraryDoc {
  id: string;
  title: string;
  /** Display string, e.g. "Aug 12". The app never parses it. */
  date: string;
  /** Sort key in minutes — send this or the list won't order correctly. */
  mins?: number;
  kind: 'paper' | 'memo' | 'survey';
}
```

Optional (`?`) means the UI must cope with it missing. If the screen breaks
without it, make it required.

## Step 2 — Add the route

In `src/api/config.ts`, inside `ROUTES`. Never inline a URL at a call site.

```ts
export const ROUTES = {
  // …
  library: '/library',
  libraryDoc: (id: string) => `/library/${id}`,
} as const;
```

## Step 3 — Add fixture data

In `src/data/fixtures.ts`. Enough rows to exercise the design — including the
awkward cases: long titles, empty arrays, missing optional fields.

```ts
export const LIBRARY: LibraryDoc[] = [
  { id: 'd1', title: 'Indemnification comparison matrix v3', date: 'Aug 12', mins: 120, kind: 'paper' },
];
```

## Step 4 — Add the repository function

In `src/api/portal.ts`. **Both branches, always.** Fixture mode must keep
working — it's how the app runs without a backend.

```ts
export function getLibrary(): Promise<LibraryDoc[]> {
  if (!USING_REMOTE_API) return local(LIBRARY);
  return request<LibraryDoc[]>(ROUTES.library);
}
```

If the server's shape differs from your type, map it **here**:

```ts
return request<ApiDoc[]>(ROUTES.library).then((rows) =>
  rows.map((r) => ({ id: r.uuid, title: r.name, date: relativeTime(r.createdAt), kind: r.docType }))
);
```

Never reshape a screen to match a server. The type is the contract.

## Step 5 — Build the screen

`src/screens/LibraryScreen.tsx`. Props in, JSX out.

```tsx
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MastheadMeta, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { sans, trackDisplay } from '../ds/tokens';
import type { LibraryDoc } from '../api/types';

export default function LibraryScreen({
  docs,
  onOpen,
  onBack,
}: {
  docs: LibraryDoc[];
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const { t } = useTheme();

  return (
    <View style={styles.fill}>
      <ScreenHeader title="Library" onBack={onBack} backLabel="Back to resources" />

      <ScrollView contentContainerStyle={styles.scroll}>
        {docs.map((d) => (
          <View key={d.id} style={[styles.card, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
            <Text style={[styles.title, { color: t.inkStrong }]}>{d.title}</Text>
            <MastheadMeta size={10}>{d.date}</MastheadMeta>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingVertical: 24, gap: 12 },
  card: { borderWidth: 1, borderRadius: 8, padding: 14 },
  title: { fontFamily: sans(600), fontSize: 15, letterSpacing: trackDisplay(15) },
});
```

Rules inside a screen:

- **Colours come from `useTheme()`.** Never a raw hex — it breaks dark mode.
  The only literals allowed are `'#fff'` on a known-dark fill.
- **Fonts come from `sans(weight)` / `mono(weight)`.** Never `fontWeight` —
  RN picks a face by family name, and only the loaded weights exist
  (sans 400/500/600/700, mono 400/500/600).
- **The header is always `ScreenHeader`.** It owns the safe-area inset, the
  back caret, the title and the hairline, so every screen's first row lands at
  the same height. Pass a search field or filter strip as its `children`; never
  hand-roll a masthead or call `topPad` in a screen.
- **No eyebrows or kicker text.** No uppercase mono labels above a heading, no
  page standfirsts, no `TITLE · N ITEMS` stat lines in a header. A section
  heading is sentence-case `sans(600)`.
- **Reuse primitives** before writing new markup: `ScreenHeader`,
  `MastheadMeta`, `DisplayHead`, `Badge`, `Card`, `Avatar`, `Input`,
  `RelevanceDot`, `LiveDot`, `FadeUp`, `RadialWash` in `src/ds/primitives.tsx`.
- **Static styles go in `StyleSheet.create`**; only theme-dependent values go
  inline as a second array entry: `style={[styles.card, { borderColor: t.ruleHairline }]}`.

### Icons

Add to the barrel in `src/ds/icons.ts`, then import from there:

```ts
export { BookOpenIcon as BookOpen } from 'phosphor-react-native/lib/commonjs/icons/BookOpen';
```

**Never `import { X } from 'phosphor-react-native'`** — the package barrel
re-exports ~1500 icons and adds ~7MB to the bundle. Check the name exists first:

```bash
ls node_modules/phosphor-react-native/lib/commonjs/icons/BookOpen.js
```

## Step 6 — Wire it in `App.tsx`

Query, gate, pass down.

```tsx
const libraryQuery = useQuery(getLibrary, []);

{tab === 'library' && (
  <DataGate
    loading={libraryQuery.loading}
    error={libraryQuery.error}
    onRetry={libraryQuery.refetch}
  >
    <LibraryScreen docs={libraryQuery.data ?? []} onOpen={setDocId} />
  </DataGate>
)}
```

`DataGate` renders the spinner and the retry screen. Never hand-roll those.

If the screen needs the signed-in member, pass `member` — it comes from
`meQuery` and is already gated.

### Adding a tab

Tabs live in `TABS` in `src/components/PortalTabBar.tsx`; extend `TabId` there.
Screens reached from another screen (like the post detail) are a branch inside
their parent, not a tab.

## Step 7 — Mutations

Optimistic with rollback, handled in `App.tsx` — not in the screen. The screen
takes a callback prop.

```tsx
const archiveDoc = useCallback((id: string) => {
  setArchived((prev) => ({ ...prev, [id]: true }));
  void archiveRequest(id).catch(() => {
    setArchived((prev) => ({ ...prev, [id]: false }));   // roll back
  });
}, []);
```

## Step 8 — Verify

All three must be clean before you're done:

```bash
npm run typecheck                      # 0 errors, strict mode
npx expo export --platform ios         # bundles without error
grep -rn "data/fixtures" src App.tsx   # exactly 1 hit
```

Then scan for dead code — new screens routinely leave orphaned styles behind:

```bash
node -e "
const fs=require('fs'),path=require('path');
const files=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const q=path.join(d,e.name);e.isDirectory()?w(q):/\.tsx?$/.test(e.name)&&files.push(q);}})('src');files.push('App.tsx');
let n=0;
for(const f of files){const src=fs.readFileSync(f,'utf8');const body=src.replace(/^import[\s\S]*?from\s+'[^']+';?$/gm,'');
for(const m of src.matchAll(/import\s*(?:type\s*)?\{([^}]+)\}\s*from/g))for(let x of m[1].split(',')){x=x.trim().replace(/^type\s+/,'').split(/\s+as\s+/).pop().trim();
if(x&&!(body.match(new RegExp('\\\\b'+x+'\\\\b','g'))||[]).length){console.log('UNUSED import '+x+' in '+f);n++;}}
const i=src.indexOf('StyleSheet.create(');if(i<0)continue;
for(const k of [...src.slice(i).matchAll(/^  ([a-zA-Z_][\w]*):/gm)].map(m=>m[1]))if(!src.slice(0,i).includes('styles.'+k)){console.log('UNUSED style '+k+' in '+f);n++;}}
console.log(n?n+' issues':'clean');"
```

## Step 9 — Update the contract

Add the endpoint to the table in [`CONTRACT.md`](../CONTRACT.md) §4 and the type
to §5. A screen whose endpoint isn't documented is not finished — the backend
author has no way to know it exists.

---

## Implementing from a Claude Design file

Most screens here come from `claude.ai/design` docs. What that involves:

1. Read the `.dc.html` **and** its `<script data-dc-script>` block — the markup
   is only half the design; `renderVals()` holds the real behaviour.
2. A file in `design_doc_mode: canvas` with `.dv-opt` blocks contains **multiple
   variants**. Identify which one is live before building — usually the latest
   turn's first option, and the one the component state actually drives. Say
   which you picked.
3. Translate, don't transcribe:
   - CSS keyframes → `Animated` (see `FadeUp` in primitives)
   - `backdrop-filter` → `expo-blur`, `linear-gradient` → `expo-linear-gradient`,
     `radial-gradient` → `RadialWash` (SVG)
   - Design hexes → the nearest **token**, so dark mode follows. Only fall back
     to a literal if no token matches.
4. Skip `ios-frame.jsx`. It's a mock bezel and status bar for browser preview;
   the real device supplies both.
5. Designs disagree with each other over time. When a new one conflicts with
   what's built, the newer wins — but **say so explicitly**, because the change
   usually reaches further than the screen in hand.

---

## Anti-patterns

| Don't | Do |
| --- | --- |
| `import { GROUPS } from '../data/fixtures'` in a screen | Take it as a prop |
| `fetch()` in a screen | Repository function + `useQuery` in `App.tsx` |
| `color: '#33565f'` | `color: t.surfaceAnchor` |
| `fontWeight: '600'` | `fontFamily: sans(600)` |
| `import { House } from 'phosphor-react-native'` | Add to `src/ds/icons.ts`, import from there |
| `paddingTop: 66` | `ScreenHeader` (owns it; `topPad(insets.top, N)` only outside a header) |
| Custom spinner / error view | `DataGate` |
| `any`, `as unknown as` | Type it; strict mode is on |
| A new endpoint left out of `CONTRACT.md` | Document it in the same change |
