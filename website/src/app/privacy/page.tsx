import { siteConfig } from "@/lib/config";
import { constructMetadata } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = constructMetadata({
  title: `Privacy | ${siteConfig.name}`,
  description: "What Peppercorn keeps, and where.",
});

// Google's sign-in needs this page to exist. Keep it true to app/docs/data.md.
export default function Privacy() {
  return (
    <main className="container mx-auto max-w-2xl px-7 py-16 md:px-10">
      <a href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4">
        {siteConfig.name}
      </a>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground">Privacy</h1>
      <div className="mt-8 flex flex-col gap-6 text-[17px]/relaxed text-muted-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground">
        <p>Peppercorn has no server and no accounts of its own. We never see your money, your entries or who you are.</p>

        <h2>On your phone</h2>
        <p>
          Your entries, categories, budgets and assets are kept on your phone, or in your browser if you use the browser
          version. Deleting the app deletes them.
        </p>

        <h2>If you sign in with Google</h2>
        <p>
          Peppercorn keeps a copy of your entries in a hidden folder of your own Google Drive that only Peppercorn can use.
          It can&apos;t see or change any of your other files. It reads your name and email address only to show you which
          account is signed in. Signing out stops the copying; you can delete the copy from the app, or in Google Drive under
          Settings, Manage apps.
        </p>
        <p>
          Peppercorn&apos;s use of information received from Google APIs adheres to the{" "}
          <a
            className="text-foreground underline underline-offset-4"
            href="https://developers.google.com/terms/api-services-user-data-policy"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Nothing is sold, shared or used for advertising.
        </p>

        <h2>Prices</h2>
        <p>
          To value gold, silver and mutual funds, the app asks LiveChennai and mfapi.in for today&apos;s prices. These
          requests carry nothing about you or what you own.
        </p>

        <h2>Nothing else</h2>
        <p>No analytics, no advertising and no crash reports.</p>

        <p className="text-sm">Last changed 26 November 2026.</p>
      </div>
    </main>
  );
}
