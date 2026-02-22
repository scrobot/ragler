import type { ReactNode } from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={styles.hero}>
      <div className={styles.heroGlow} />
      <div className="container">
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>Open Source · RAG Platform</span>
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
          <p className={styles.heroDescription}>
            Ingest from Confluence, files, and web. Curate chunks with AI-powered
            quality scoring. Publish atomically and chat with your knowledge base.
          </p>
          <div className={styles.heroCta}>
            <Link className={styles.ctaPrimary} to="/docs/getting-started/installation">
              Get Started
            </Link>
            <Link className={styles.ctaSecondary} to="/docs/architecture/overview">
              Architecture →
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title={`${siteConfig.title} — ${siteConfig.tagline}`}
      description="RAGler: ingest, curate, and publish knowledge for RAG with human-in-the-loop quality control."
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
