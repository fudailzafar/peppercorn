# Peppercorn

- `app`: Peppercorn itself, for Android and the browser (Expo, React Native).
- `website`: the page about it (Next.js), with the browser version of the app under `/app`.

Each folder has its own README and dependencies. Both need Node 22.13 or later and pnpm.

## On the phone

```bash
cd app && npx expo start --port 8082
```

## Online

One address: the website at `/`, the app at `/app`. `sh deploy.sh` builds the app, puts it in `website/public/app` and
deploys both to the Vercel project `peppercorn-website`.
