# Testing

```bash
pnpm check                         # lint, types, all tests
npx jest src/__tests__/store.test.ts
```

Tests are in `src/__tests__`. They run in Indian time (`jest.global-setup.js`); `pnpm test:zones` covers others.

| File                          | What                                                        |
| ----------------------------- | ----------------------------------------------------------- |
| `domain`, `draft`, `history`  | Every rule about money, days, entries, budgets and insights |
| `store`, `disk`, `clock`      | Saving, failing to save, prices, messages, time             |
| `account`                     | Signing in, saving, conflicts, leaving                      |
| `screens`                     | What only a screen can get wrong, such as two quick taps    |

A bug gets a test that fails first. Test through what people or callers see, not how it is done inside. `fakes.ts` has a
disk that can be missing, locked or full, sample data, and a fixed "now".

## By hand

In a browser: `pnpm build:web`, then `npx next build && npx next start` in `../website`, and open `/app`. Restart it after
building again.

On a phone, before each release, as tests can't: add an entry and close the app at once, then open it; swipe to delete and
undo; the back gesture on every page; a large font; dark mode; airplane mode; and signing in with Google (needs a build,
not Expo Go).
