# Peppercorn's website

The page about Peppercorn (Next.js), with the browser version of the app under `/app`.

```bash
pnpm install
pnpm dev
```

Its words and pictures are in `src/lib/config.tsx` and `public`. The app comes from `../app`: `sh scripts/build-web.sh`
there puts it in `public/app`, which isn't kept in git. `../deploy.sh` does that and deploys.
