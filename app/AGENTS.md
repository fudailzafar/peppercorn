# The app

Expo SDK 58, React Native 0.88, TypeScript, for Android first. The browser version is for trying it out. Read
`../AGENTS.md` too, and `docs/architecture.md` before changing how anything is put together.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Node 22.13 or later (`.nvmrc`), and pnpm.

```bash
pnpm install
npx expo start --port 8082   # add `--tunnel ngrok` when the phone can't reach this computer
pnpm check                   # lint, types, tests: must pass before anything is called done
npx expo install <package>   # never `pnpm add`: this picks the version that fits the SDK
npx expo-doctor              # after changing packages or app.json
pnpm build:web               # the browser version, into ../website/public/app
```

## Where things go

| Folder         | What                                                                                  | May use              |
| -------------- | ------------------------------------------------------------------------------------- | -------------------- |
| `src/domain`   | What the app knows about money, days, budgets and assets. Plain functions, no React   | nothing else         |
| `src/data`     | Saving to the phone, daily prices, messages                                           | domain               |
| `src/account`  | Google sign-in and saving to Drive                                                    | those before it      |
| `src/state`    | The app's one store, prices, account and clock, and the hooks that read them          | those before it      |
| `src/theme`    | Colours, type, shapes, motion, fonts                                                  | those before it      |
| `src/lib`      | Haptics, navigation, names of choices                                                 | those before it      |
| `src/ui`       | What any screen is made of. `ui/material` has Material 3's components                 | those before it      |
| `src/features` | The screens and their parts, one folder for each part of the app                      | those before it      |
| `src/app`      | Routes only: each file names the screen it shows                                      | all                  |

The linter refuses an import that goes the other way, and one that goes round in a circle.

## How to write it

- A new screen: `src/features/<feature>/<Name>Screen.tsx` with a named export, a route of one line in `src/app`, and its
  name in the list in `src/app/_layout.tsx` (one that isn't there can be opened before the welcome screen is done).
- Pages are told apart by query (`/asset?id=gold`), not by path: the website is plain files, so every address must be one.
- Open pages with `openPage` and leave them with `goBack` (`src/lib/navigation`).
- Import with `@/`, or `./` within a folder. Types with `type`. No default exports but in routes, no index files but
  `ui/material`.
- What is worked out goes into `domain`, with a test. A component shows; it doesn't calculate.
- What is saved changes only through `store` (`src/state/app`). Never change a value in place: everything on screen tells
  by identity whether it changed.
- Read as little as it needs: `useSettings`, `useAppState(selector)`; `useData` only where most of it is used. `useNow`
  draws again each minute.
- The React Compiler remembers values and functions for you. `useMemo`, `useCallback` and `memo` are for long lists, or
  when something outside React needs the same one.
- Animate with Reanimated, with `.get()` and `.set()`. Nothing that moves may set React state on each frame.
- Long lists are `FlatList` or `SectionList`, with their `renderItem` and `keyExtractor` kept the same between draws.
- Words are `AppText`, icons are `Icon`. Colours and shapes come from `src/theme`, never written in place. Styles that
  don't change go in `StyleSheet.create`.
- Fonts and icon fonts are imported by their own path: their packages' indexes put all of them into the app (it was 14 MB).
- Everything that can be pressed has a role and a name, and is at least 48 by 48.
- What differs on the web goes in a `.web.ts` file beside it.

## Rules

- `android` and `ios` folders are generated. Never make or edit them: use `app.json` and config plugins.
- Expo Go has only the native modules it comes with. Google sign-in isn't one: it is loaded only when it's there
  (`src/account/google.android.ts`). Prefer Expo's own modules; ask before adding any package.
- Never change the saved format without reading `docs/data.md`.
- Design rules are the owner's, in `docs/design.md`. Don't restyle what wasn't asked about.
