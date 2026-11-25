# Peppercorn's website

Next.js (App Router), Tailwind 4 and framer-motion, from a template.

- All words, links and pictures are in `src/lib/config.tsx`. Sections are in `src/components/sections`, in the order
  `src/app/page.tsx` gives.
- Say only what the app really does. No made-up reviews, numbers or logos. The download badge follows
  `src/lib/release.json`, which `../app/scripts/publish-apk.sh` writes: without one it says "Coming soon" and leads nowhere.
- Screenshots (`public/Device-*.png`) show sample data, never anyone's own.
- Links to the APK are plain `<a>`: Next's `Link` would fetch the whole file in advance.
- `public/app` is the browser version of the app, made by `../app/scripts/build-web.sh`. It isn't in git: never edit it.
- `next.config.mjs` gives each of its pages an address. `src/app/metals` passes on the page with gold and silver rates, as
  plain text and with headers that keep it from running anything here. Keep those: people's entries are stored under the
  same address.
- `pnpm build` must pass. Check at phone and desktop widths, and in dark mode.
