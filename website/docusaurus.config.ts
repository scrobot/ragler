import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'RAGler',
  tagline: 'Open Source RAG Platform with Human-in-the-Loop',
  favicon: 'img/favicon.ico',

  url: 'https://ragler.ai',
  baseUrl: '/',

  organizationName: 'ragler-oss',
  projectName: 'ragler',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/ragler-oss/ragler/tree/main/website/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/ragler-oss/ragler/tree/main/website/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'RAGler',
      logo: {
        alt: 'RAGler Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'gettingStartedSidebar',
          position: 'left',
          label: 'Getting Started',
        },
        {
          type: 'docSidebar',
          sidebarId: 'productSidebar',
          position: 'left',
          label: 'Product',
        },
        {
          type: 'docSidebar',
          sidebarId: 'architectureSidebar',
          position: 'left',
          label: 'Architecture',
        },
        {
          to: '/docs/ai-context/core-concepts',
          position: 'left',
          label: 'AI Context',
          className: 'ai-context-link', // We can style this distinctly
        },
        {
          type: 'docSidebar',
          sidebarId: 'changelogSidebar',
          position: 'left',
          label: 'Changelog',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/ragler-oss/ragler',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Product Guide', to: '/docs/product/intro' },
            { label: 'Architecture', to: '/docs/architecture/overview' },
            { label: 'AI Context', to: '/docs/ai-context/core-concepts' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/ragler-oss/ragler' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} RAGler OSS. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
