import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Ingest',
    description: 'Pull content from Confluence, web URLs, file uploads, or paste text directly.',
    icon: '↓',
  },
  {
    step: '02',
    title: 'Curate',
    description: 'AI chunks your content, then you review, edit, split, and merge with full control.',
    icon: '✎',
  },
  {
    step: '03',
    title: 'Publish',
    description: 'Preview, validate, then atomically publish to your vector collection.',
    icon: '⬡',
  },
  {
    step: '04',
    title: 'Retrieve',
    description: 'Search your knowledge base or chat with it using RAG-powered answers and citations.',
    icon: '◇',
  },
];

const ARCH_COMPONENTS = [
  { label: 'Next.js', sublabel: 'Frontend', position: 'left' as const },
  { label: 'NestJS', sublabel: 'Backend API', position: 'center' as const },
  { label: 'Qdrant', sublabel: 'Vectors', position: 'right' as const },
  { label: 'Redis', sublabel: 'Sessions', position: 'right' as const },
  { label: 'OpenAI', sublabel: 'LLM', position: 'center' as const },
  { label: 'MCP', sublabel: 'Claude', position: 'left' as const },
];

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();

  return (
    <header className={styles.hero}>
      <div className={styles.heroGlow} />
      <div className={styles.heroGlowSecondary} />
      <div className="container">
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>Open Source · Human-in-the-Loop · RAG Platform</span>
          <Heading as="h1" className={styles.heroTitle}>
            Knowledge ops for{' '}
            <span className={styles.heroAccent}>production RAG</span>
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
          <div className={styles.heroMeta}>
            <span className={styles.heroMetaItem}>TypeScript</span>
            <span className={styles.heroMetaDot}>·</span>
            <span className={styles.heroMetaItem}>NestJS + Next.js</span>
            <span className={styles.heroMetaDot}>·</span>
            <span className={styles.heroMetaItem}>Qdrant + Redis</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function DemoSection() {
  const demoImgSrc = useBaseUrl('/img/demo.webp');

  return (
    <section className={styles.demo}>
      <div className="container">
        <div className={styles.demoWrapper}>
          <img
            src={demoImgSrc}
            alt="RAGler application demo"
            className={styles.demoImage}
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className={styles.howItWorks}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            How it works
          </Heading>
          <p className={styles.sectionSubtitle}>
            Four steps from raw content to production-ready knowledge base.
          </p>
        </div>
        <div className={styles.workflowGrid}>
          {WORKFLOW_STEPS.map((item) => (
            <div key={item.step} className={styles.workflowCard}>
              <div className={styles.workflowStep}>
                <span className={styles.workflowIcon}>{item.icon}</span>
                <span className={styles.workflowNumber}>{item.step}</span>
              </div>
              <Heading as="h3" className={styles.workflowTitle}>{item.title}</Heading>
              <p className={styles.workflowDescription}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArchitectureSection() {
  return (
    <section className={styles.architecture}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Built for production
          </Heading>
          <p className={styles.sectionSubtitle}>
            A composable architecture with battle-tested infrastructure.
          </p>
        </div>
        <div className={styles.archGrid}>
          {ARCH_COMPONENTS.map((comp) => (
            <div key={comp.label} className={styles.archCard}>
              <span className={styles.archLabel}>{comp.label}</span>
              <span className={styles.archSublabel}>{comp.sublabel}</span>
            </div>
          ))}
        </div>
        <div className={styles.archCta}>
          <Link className={styles.ctaSecondary} to="/docs/architecture/overview">
            View full architecture →
          </Link>
        </div>
      </div>
    </section>
  );
}

function OpenSourceCta() {
  return (
    <section className={styles.openSource}>
      <div className="container">
        <div className={styles.openSourceInner}>
          <Heading as="h2" className={styles.openSourceTitle}>
            Open source. Self-hosted. Yours.
          </Heading>
          <p className={styles.openSourceDescription}>
            RAGler runs on your infrastructure. No vendor lock-in, no data leaving your network.
            Deploy with Docker Compose in minutes.
          </p>
          <div className={styles.heroCta}>
            <Link className={styles.ctaPrimary} to="/docs/getting-started/installation">
              Deploy now
            </Link>
            <Link
              className={styles.ctaSecondary}
              href="https://github.com/scrobot/ragler"
            >
              Star on GitHub
            </Link>
          </div>
        </div>
      </div>
    </section>
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
        <DemoSection />
        <HowItWorks />
        <HomepageFeatures />
        <ArchitectureSection />
        <OpenSourceCta />
      </main>
    </Layout>
  );
}
