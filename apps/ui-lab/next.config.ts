import type { NextConfig } from 'next';

const config: NextConfig = {
  agentRules: false,
  transpilePackages: ['@duoquest/shared-types', '@duoquest/game-core', '@duoquest/game-quiz'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'self'",
          },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};
export default config;
