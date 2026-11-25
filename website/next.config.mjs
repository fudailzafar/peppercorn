/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["geist"],
  // The app (public/app, built from ../app) has one page file for each of its addresses.
  async rewrites() {
    return {
      afterFiles: [{ source: "/app", destination: "/app/index.html" }],
      fallback: [{ source: "/app/:page", destination: "/app/:page.html" }],
    };
  },
};

export default nextConfig;
