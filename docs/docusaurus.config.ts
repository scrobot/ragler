import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'RAGler',
  tagline: 'Operational docs for ingestion, curation, and publishing in RAG',
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
          editUrl: 'https://github.com/ragler-oss/ragler/tree/main/docs/',
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
            { label: 'Quick Start', to: '/docs/getting-started/installation' },
            { label: 'Workflow', to: '/docs/product/flows/workflow' },
            { label: 'Architecture', to: '/docs/architecture/overview' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'Repository', href: 'https://github.com/ragler-oss/ragler' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} RAGler OSS`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
