/**
 * The page with gold and silver rates, which browsers may not read from another site. It is sent on as plain text, with
 * none of its own headers, so that nothing in it can run here, where people's entries are stored.
 */
const RATES = "https://www.livechennai.com/gold_silverrate.asp";
const HALF_HOUR = 1800;

export async function GET() {
  try {
    const page = await fetch(RATES, { next: { revalidate: HALF_HOUR } });
    if (!page.ok) return new Response(null, { status: 502 });
    return new Response(await page.text(), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
