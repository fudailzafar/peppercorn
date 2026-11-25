# Why things are as they are

Newest first. Add to it when a choice would surprise someone later.

- **Layers, features and one-line routes** (Nov 2026). Screens were in `src/app` and everything else in one flat folder.
- **React Compiler on** (Nov 2026). Switching spans in Insights with 5,000 entries took about half the script time with it
  and the clock below, measured in a throttled browser.
- **One clock** (Nov 2026). Each screen had its own timer, and they could disagree for a moment.
- **One codebase and one address for app and website** (Nov 2026). The app is under `/app`, with query addresses, as it is
  plain files there.
- **Swift and Kotlin versions dropped** (Nov 2026). One stack, tested by QR code in Expo Go and built on Expo's servers.
  The Kotlin one is the `kotlin` branch, for reference.
- **One file instead of a database.** A family's entries for years fit in memory, every change is whole or not at all, and
  the same text is what goes to Drive.
- **No server of ours.** Nothing to run, pay for or leak. The price is that two phones aren't kept in step.
- **zustand, outside React.** The store works without screens, so it can be tested without them.
- **No fonts in the native build** (`expo-font`'s plugin). They load from the app itself in a moment, behind the splash
  screen, and the plugin would put each in twice.
- **`FlatList`, not FlashList.** No package to keep up with, and lists of 5,000 scroll well enough.
- **pnpm's `overrides`** keep one copy of Reanimated and Worklets, at the versions in Expo Go.
