# How it is put together

```
app        routes: one line each, and the layouts
features   screens and their parts: home, entries, budgets, insights, assets, categories, settings, account,
           onboarding, shell (the tab bar, the add button, and the screens for when something is wrong)
ui         shared components and their hooks; ui/material is Material 3
lib        haptics, navigation, names of choices
theme      colours, type, shapes, motion, fonts
state      the app's one store, prices, account and clock, put together; hooks to read them
account    Google sign-in, saving to Drive
data       the file on the phone, daily prices, messages
domain     money, days, entries, budgets, assets, insights: plain functions
```

Each layer uses only those below it (`eslint.config.js`, `import/no-restricted-paths`). A feature may use another's parts
(Home shows `entries/EntryRow`), but never in a circle (`import/no-cycle`).

## From a tap to the file

1. A screen calls a method of `store` (`data/store.ts`), such as `store.add(draft)`.
2. The store makes a new `AppData` with a function from `domain`, and sets it. Nothing is changed in place.
3. Hooks in `state/hooks.ts` draw again whatever reads what changed. `state/clock.ts` hears first, so "now" is never older
   than the newest entry.
4. A quarter of a second after the last change, the store writes the whole file through a `Disk`. It also does when the app
   is left. One write at a time; one that fails is tried again, and the person is told.
5. When someone is signed in, `account` saves to Drive a few seconds later.

## What makes it testable

`Store`, `Prices` and `Account` are given everything they need from outside: the disk, the clock, new ids, the network,
Google. `state/app.ts` is the only place that gives them the real ones. Tests give them others (`src/__tests__/fakes.ts`).

## Starting up

`app/_layout.tsx` keeps the splash screen until the fonts are there and the file has been read. Then:

- the file couldn't be opened: `LockedScreen`, and nothing is written until it can be
- the welcome screen isn't done: only that (`Stack.Protected`)
- otherwise the tabs

A page that fails shows `ErrorScreen`. The data isn't touched by that.

## Performance

- The React Compiler is on (`app.json`). `eslint-plugin-react-hooks` says when a component can't be compiled.
- Progress bars, swipes, sheets and charts move on the UI thread. The budget ring doesn't: there is one on a screen.
- Pressed states on Android are the system's ripple alone.
- Only the fonts in use are in the app. Each weight of Google Sans is 2 MB, as it has every script.
- With 5,000 entries everything is still worked out from the whole list each time. That is fine at that size; if it ever
  isn't, make an index in `domain` before reaching for a database.
