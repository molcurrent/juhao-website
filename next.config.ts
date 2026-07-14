import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  async redirects() {
    return [
      { source: "/about/duty", destination: "/sustainability", permanent: true },
      { source: "/brand", destination: "/solutions", permanent: true },
      { source: "/brand/whole_house", destination: "/solutions/residential", permanent: true },
      { source: "/brand/hotel", destination: "/solutions/hospitality", permanent: true },
      { source: "/brand/business", destination: "/solutions/commercial", permanent: true },
      { source: "/brand/public", destination: "/solutions/public", permanent: true },
      { source: "/brand/special", destination: "/solutions/industrial", permanent: true },
      { source: "/healthy", destination: "/healthy-light", permanent: true },
      { source: "/esg", destination: "/sustainability", permanent: true },
      { source: "/investment", destination: "/partners", permanent: true },
      { source: "/download", destination: "/downloads", permanent: true },
      { source: "/law", destination: "/legal", permanent: true },
      { source: "/news/page/1", destination: "/news", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/login.html", destination: "/mall", permanent: false },
      { source: "/register.html", destination: "/mall", permanent: false },
      { source: "/forget.html", destination: "/mall", permanent: false },
    ];
  },
};

export default nextConfig;
