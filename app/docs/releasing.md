# Releasing

## Google Play

Builds are made on Expo's servers (`eas.json`), from `app`:

```bash
npx eas-cli@latest build --platform android --profile preview      # an APK to try
npx eas-cli@latest build --platform android --profile production   # for Google Play
npx eas-cli@latest submit --platform android --profile production  # to the internal track
```

Nothing has been built yet. Before the first one, by the owner: an Expo account, and `eas init` (it adds the project's id
to `app.json`). Before Google Play:

1. Google sign-in: a Google Cloud project with the `drive.appdata` scope, an Android and a web client, and the web client's
   ID in `app.json` (`extra.googleWebClientId`). Until then signing in says it isn't available.
2. A privacy policy with its own address, and the Data safety form: `data.md` has the facts.
3. A closed test with 12 people for 14 days, as it is a personal account.
4. The listing. Its pictures are in `store/play`.

`package` (`app.peppercorn.money`) can never change after the first upload. `version` in `app.json` is what people see;
Expo counts the version code.

## The website and browser version

```bash
sh ../deploy.sh
```

This builds both and deploys them to the Vercel project `peppercorn-website`. `WEB_BASE=/app` is set for that build only
(`scripts/build-web.sh`, `app.config.js`), so phone builds know nothing of it. Afterwards open `/`, `/app`, and a page inside
it by its address.
