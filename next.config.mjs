const repo = "brilworks-app";
const isPagesBuild = process.env.GITHUB_PAGES_BUILD === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  ...(isPagesBuild
    ? { basePath: `/${repo}`, assetPrefix: `/${repo}/` }
    : {}),
};

export default nextConfig;
