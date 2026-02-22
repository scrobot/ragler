import type { ReactNode } from 'react';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
  tag?: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Multi-Source Ingestion',
    emoji: '🔗',
    tag: 'Core',
    description: (
      <>Pull from Confluence, web URLs, manual text, or upload PDF, DOCX, Markdown, and CSV files directly.</>
    ),
  },
  {
    title: 'Session-Based Curation',
    emoji: '✏️',
    tag: 'Workflow',
    description: (
      <>Draft sessions let you review, edit, split, merge, and reorder chunks before publishing. Human in the loop.</>
    ),
  },
  {
    title: 'AI Quality Scoring',
    emoji: '🤖',
    tag: 'AI',
    description: (
      <>AI assistant analyzes chunk quality, suggests operations, and scores with an approval flow.</>
    ),
  },
  {
    title: 'Configurable Chunking',
    emoji: '⚙️',
    tag: 'Config',
    description: (
      <>Choose between LLM semantic chunking or fast character-based splitting with size and overlap control.</>
    ),
  },
  {
    title: 'Chat Playground',
    emoji: '💬',
    tag: 'RAG',
    description: (
      <>Ask questions against your knowledge base. RAG-powered answers grounded in your chunks with cited sources.</>
    ),
  },
  {
    title: 'Atomic Publish',
    emoji: '🚀',
    tag: 'Infra',
    description: (
      <>Preview, validate, then atomically replace collection contents. Zero-downtime knowledge updates.</>
    ),
  },
];

function Feature({ title, emoji, description, tag }: FeatureItem) {
  return (
    <div className={styles.featureCol}>
      <div className={styles.featureCard}>
        <div className={styles.featureHeader}>
          <span className={styles.featureEmoji}>{emoji}</span>
          {tag && <span className={styles.featureTag}>{tag}</span>}
        </div>
        <Heading as="h3" className={styles.featureTitle}>{title}</Heading>
        <p className={styles.featureDescription}>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Everything you need for production RAG
          </Heading>
          <p className={styles.sectionSubtitle}>
            From ingestion to retrieval — a complete platform for building and maintaining knowledge bases.
          </p>
        </div>
        <div className={styles.featureGrid}>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
