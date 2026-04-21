import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: {
  unoptimized: true,
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'sbkazipthuxeiauuahmq.supabase.co',
    },
  ],
},
};

export default nextConfig;
