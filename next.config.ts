import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["maplibre-gl", "react-map-gl", "@vis.gl/react-maplibre"],
};

export default nextConfig;
