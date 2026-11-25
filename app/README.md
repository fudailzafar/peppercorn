# Peppercorn

A simple tracker for a person's or a family's money: spending, income, budgets, and the value of gold, silver and two
ethical funds. Everything stays on the phone, unless someone signs in with Google; then it is also saved in their own
Drive.

Built with Expo (React Native) for Android, with a web build for trying it out.

## Running it

Needs Node 22.13 or later (`.nvmrc`) and pnpm.

```bash
pnpm install
npx expo start --port 8082
```

Scan the QR code with Expo Go, or press `w` for the browser. If the phone can't reach this computer over Wi-Fi, use
`npx expo start --port 8082 --tunnel ngrok`.

Expo Go has no Google sign-in: that needs a development build, and a client ID in `app.json` (`extra.googleWebClientId`).

## Checking it

```bash
pnpm check
```

That runs the linter, the type checker and the tests.

## Where things are

| Folder           | What's in it                                                                        |
| ---------------- | ----------------------------------------------------------------------------------- |
| `src/domain`     | What the app knows about money, days, budgets and assets. Plain functions, no React |
| `src/data`       | Saving to the phone, daily prices, messages, and the hooks screens read them with   |
| `src/account`    | Google sign-in and saving to Drive                                                  |
| `src/app`        | The screens, one file each (Expo Router)                                            |
| `src/components` | What screens are made of. `material` has the Material 3 ones                        |
| `src/hooks`      | What screens share that isn't drawn                                                 |
| `src/theme`      | Colours, type, shapes and motion                                                    |
| `src/__tests__`  | The tests                                                                           |

Everything saved is one file, `peppercorn.json` (`src/domain/model.ts` is its format). It is never written over while it
can't be opened, and a damaged one is kept aside.

## The website

`pnpm build:web` makes `dist`, ready for Vercel.
