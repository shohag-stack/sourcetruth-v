import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

export default {
  // New Post moved from /links to /posts/new — keep old bookmarks working
  async redirects() {
    return [{ source: "/links", destination: "/posts/new", permanent: true }];
  },
  images: {
    remotePatterns: [
      {
        hostname: "api.dicebear.com",
      },
    ],
  },
};

// Lets `next dev` use the Cloudflare bindings locally
initOpenNextCloudflareForDev();
