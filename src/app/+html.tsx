import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const LIGHT = '#FFFFFF';
const DARK = '#131314';

/** The web page around the app. Its background is the app's own, so nothing flashes before the app is there. */
export default function Html({ children }: PropsWithChildren) {
  const page = useServerDocumentContext();
  return (
    <html {...page.htmlAttributes} lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Peppercorn</title>
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={LIGHT} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={DARK} />
        <meta name="apple-mobile-web-app-title" content="Peppercorn" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <style>{`html, body { background: ${LIGHT} } @media (prefers-color-scheme: dark) { html, body { background: ${DARK} } }`}</style>
        <ScrollViewStyleReset />
        {page.headNodes}
      </head>
      <body {...page.bodyAttributes}>
        {children}
        {page.bodyNodes}
      </body>
    </html>
  );
}
