import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web-only document shell: PWA manifest, mobile viewport, and no body scrolling.
export default function Root({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#131314" media="(prefers-color-scheme: dark)" />
        <meta name="color-scheme" content="light dark" />
        <meta name="apple-mobile-web-app-title" content="Dime" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <style dangerouslySetInnerHTML={{ __html: PAGE_BACKGROUND }} />
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

// Match the app's background before JS loads, so there is no white flash in dark mode.
const PAGE_BACKGROUND = `html,body{background-color:#FFFFFF}@media (prefers-color-scheme: dark){html,body{background-color:#131314}}`;
