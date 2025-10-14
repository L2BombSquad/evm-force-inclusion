import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'EVM Force Inclusion',
  description: 'TypeScript SDK for L1 force inclusion to Arbitrum/OP Stack rollups',
  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Wagmi', link: '/wagmi' },
      { text: 'Examples', link: '/examples' },
      { text: 'GitHub', link: 'https://github.com/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Wagmi Integration', link: '/wagmi' },
          { text: 'Examples', link: '/examples' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/' },
    ],
  },
});


