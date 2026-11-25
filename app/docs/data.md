# What is saved

## On the phone

One file, `peppercorn.json`, in the app's own folder (in a browser: `localStorage`, same name):

```json
{ "version": 1, "data": { "categories": [], "entries": [], "budgets": [], "owned": [], "settings": {}, "prices": {}, "priceError": false } }
```

`src/domain/model.ts` is the format, and `src/domain/saved.ts` reads and writes it. `account.json` beside it remembers who
is signed in. Nothing in it is a password or a token.

## Never losing it

- Written to a new file, read back, then moved over the old one. A write that is cut short leaves the old one.
- Couldn't be opened: the app stops (`status: 'locked'`) instead of starting empty, as that would write over it.
- Damaged: set aside as `peppercorn.json.unreadable-<time>`, the person is told, and a new one is begun.
- No room: what is in memory stays, it is tried again, and the person is told until it works.
- Deleting an entry can be undone. What can't be undone is asked about first.

## Changing the format

- A new **setting**: add it to `Settings`, with its default in `defaultSettings`. Older files get the default.
- A new **optional** field: fine as it is.
- Anything else (a renamed field, another meaning): a new `VERSION` in `saved.ts` that still reads the old one, the same in
  `src/account/backup.ts`, and a test that reads a file of each version. People have files with the old one.
- Money is in whole units with two decimals, kept exact by `exact()`. Days are text (`2026-11-24`), moments are
  milliseconds.

## In Google Drive

For people who sign in: one file in the hidden app folder of their own Drive (scope `drive.appdata`), everything but prices.
There is no server of ours. Phones are not kept in step: when another one saved in between, the person is asked which to
keep. `src/account/account.ts` has every case, and `account.test.ts` tests them.

## What leaves the phone

Without an account, only requests for prices: LiveChennai (gold and silver) and mfapi.in (funds). No analytics, no ads, no
crash reports. The browser version asks the website's `/metals`, which asks LiveChennai.
