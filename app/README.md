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

## How it is put together

`AGENTS.md` has the folders and how to write code for them. The rest is in `docs`:

- `architecture.md`: the layers, and how data moves through them
- `data.md`: what is saved, where, and how it is kept safe
- `design.md`: how it looks and behaves
- `testing.md`: what is tested, and what to check by hand
- `releasing.md`: builds for Google Play, and the website
- `decisions.md`: why things are as they are
