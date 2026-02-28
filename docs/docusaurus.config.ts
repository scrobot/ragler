import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'RAGler',
  tagline: 'The human-in-the-loop RAG knowledge platform',
  favicon: 'img/favicon.ico',

  url: 'https://scrobot.github.io',
  baseUrl: '/ragler/',

  organizationName: 'scrobot',
  projectName: 'ragler',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

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
          editUrl: 'https://github.com/scrobot/ragler/tree/main/docs/',
        },
        blog: false,
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
      title: 'RAGler Docs',
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
          type: 'docSidebar',
          sidebarId: 'aiSidebar',
          position: 'left',
          label: 'AI Context',
        },
        {
          type: 'docSidebar',
          sidebarId: 'changelogSidebar',
          position: 'left',
          label: 'Changelog',
        },
        {
          type: 'docSidebar',
          sidebarId: 'developmentSidebar',
          position: 'left',
          label: 'Development',
        },
        {
          href: 'https://github.com/scrobot/ragler',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Getting Started',
          items: [
            { label: 'Installation', to: '/docs/getting-started/installation' },
            { label: 'Configuration', to: '/docs/getting-started/configuration' },
            { label: 'First Collection', to: '/docs/getting-started/first-collection' },
          ],
        },
        {
          title: 'Product',
          items: [
            { label: 'Ingestion', to: '/docs/product/ingestion' },
            { label: 'Workflows', to: '/docs/product/flows/workflow' },
            { label: 'Chat Playground', to: '/docs/product/chat-playground' },
          ],
        },
        {
          title: 'Architecture',
          items: [
            { label: 'Overview', to: '/docs/architecture/overview' },
            { label: 'Data Model', to: '/docs/architecture/data-model' },
            { label: 'ADRs', to: '/docs/architecture/adr/' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/scrobot/ragler' },
            { label: 'Issues', href: 'https://github.com/scrobot/ragler/issues' },
            { label: 'Changelog', to: '/docs/changelog/overview' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} RAGler`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
