# Releasing

Peppercorn isn't on Google Play: its closed test needs 12 people for 14 days. People download an APK from the website.

## A new version

1. Raise `version` in `app.json` (people see it, and it names the file). Commit and push.
2. Build it on GitHub: `gh workflow run apk.yml --ref rewrite`. It takes about half an hour, signs the APK, and tries it on an
   emulator (`scripts/try-apk.py`): an entry has to survive the app being stopped. Look at its pictures (`try`).
3. `gh run download -n peppercorn-apk`, install it over the old one on a real phone, and check what `testing.md` says.
4. `sh scripts/publish-apk.sh <file.apk>`, commit `website/src/lib/release.json`, and deploy with `sh ../deploy.sh`.

The APK is for real phones (arm64 and armv7). It is kept out of git, in `website/public/download`. The version code is the
number of the build, so never replace `apk.yml` by a workflow of another name: its count would begin again, and phones
refuse a lower one.

## The signing key

Every version has to be signed with the same key, or phones refuse it as an update and people would have to uninstall,
which deletes their entries. It is in the repository's secrets (`ANDROID_KEYSTORE`, base64, and
`ANDROID_KEYSTORE_PASSWORD`), which can't be read back, and the owner has the file. Never in git.

`package` (`app.peppercorn.money`) can never change either, for the same reason.

## Google's rules for apps outside the Play Store

From 2027, certified Android phones ask for the developer to be verified and the app registered (package name and
key). Elsewhere people can still install it after a longer setup of their own. Registering can be done in the Play Console,
also for apps that aren't on Play. https://developer.android.com/developer-verification

## Signing in with Google

Google Cloud project `peppercorn-515903` (owner's account): the `drive.appdata` scope, an Android client for
`app.peppercorn.money` with the release key's SHA-1, and a web client whose ID is in `app.json`
(`extra.googleWebClientId`; it isn't a secret). The consent screen is in testing: only the test users listed under
Audience can sign in, up to 100, until it is published. A new signing key needs its SHA-1 added to the Android client.

## The website and browser version

```bash
sh ../deploy.sh
```

This builds both and deploys them, with the APK, to the Vercel project `peppercorn-website`. `WEB_BASE=/app` is set for that build only
(`scripts/build-web.sh`, `app.config.js`), so phone builds know nothing of it. Vercel's free plan
takes 100 MB in one upload and is for things that don't earn money: move the download elsewhere before either changes. Afterwards open `/`, `/app`, and a page inside
it by its address.
