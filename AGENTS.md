# GPFA Mobile — working agreements

## Expo version

This project is on **Expo SDK 54** (`expo@54.x`, React Native 0.81, React 19.1).

Read the exact versioned docs at <https://docs.expo.dev/versions/v54.0.0/>
before writing any code. Expo's APIs change between SDKs — do not rely on
memory, and do not read a different SDK's docs.

Confirm the installed version rather than assuming:

```bash
node -e "console.log(require('expo/package.json').version)"
npx expo-doctor          # should report all checks passing
```

## Before adding or changing a screen

**Read [`docs/ADDING_A_SCREEN.md`](docs/ADDING_A_SCREEN.md) first.** It is the
house style: how data reaches a screen, the design-system rules, the icon
barrel, and the verification steps.

**Read [`CONTRACT.md`](CONTRACT.md)** for anything that touches data. It
documents the API the app expects and how to plug a backend in.

## Non-negotiables

- Screens are presentational — props in, JSX out. No fetching, no fixture
  imports. `grep -rn "data/fixtures" src App.tsx` must return exactly one hit
  (`src/api/portal.ts`).
- Colours come from `useTheme()` tokens, never raw hex — dark mode depends on it.
- Fonts come from `sans()` / `mono()`, never `fontWeight`.
- Icons go through `src/ds/icons.ts`. Importing from the `phosphor-react-native`
  root adds ~7MB to the bundle.
- New endpoints get documented in `CONTRACT.md` in the same change.

## Verify before reporting done

```bash
npm run typecheck                 # strict; must be 0 errors
npx expo export --platform ios    # must bundle without error
```
