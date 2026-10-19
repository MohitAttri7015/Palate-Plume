// The picture host for the menu photos (from IMAGEKIT_URL_ENDPOINT in .env)
const imageKitHost = (() => {
  try {
    return new URL(process.env.IMAGEKIT_URL_ENDPOINT).hostname;
  } catch {
    return 'ik.imagekit.io';
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: imageKitHost,
      },
    ],
  },
  allowedDevOrigins: ['192.168.1.4'],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;