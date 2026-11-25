/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["geist"],
  // The app to download. Phones open it by its type.
  async headers() {
    return [
      {
        source: "/download/:file*",
        headers: [
          { key: "Content-Type", value: "application/vnd.android.package-archive" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  // The browser version (public/app, built from ../app) has one page file for each of its addresses.
  async rewrites() {
    return {
      afterFiles: [{ source: "/app", destination: "/app/index.html" }],
      fallback: [{ source: "/app/:page", destination: "/app/:page.html" }],
    };
  },
};

export default nextConfig;
