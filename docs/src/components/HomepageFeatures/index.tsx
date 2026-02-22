import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Confluence Ingestor',
    emoji: '🔗',
    description: <>Pull pages directly from Confluence, web URLs, or manual text. Your knowledge, any source.</>,
  },
  {
    title: 'Multi-Format File Upload',
    emoji: '📄',
    description: <>Upload PDF, DOCX, Markdown, TXT, and CSV files. Automatic text extraction and chunking.</>,
  },
  {
    title: 'Session-Based Quality Control',
    emoji: '✏️',
    description: <>Draft, review, split, merge, and reorder chunks before publishing. Human in the loop.</>,
  },
  {
    title: 'AI-Powered Chunk Scoring',
    emoji: '🤖',
    description: <>AI assistant analyzes quality, suggests operations, and scores chunks with approval flow.</>,
  },
  {
    title: 'Chat Playground',
    emoji: '💬',
    description: <>Ask questions against your knowledge base. RAG-powered responses with cited sources.</>,
  },
  {
    title: 'Atomic Publish',
    emoji: '🚀',
    description: <>Preview, validate, then atomically replace collections. Zero-downtime knowledge updates.</>,
  },
];

function Feature({ title, emoji, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureCard}>
        <div className={styles.featureEmoji}>{emoji}</div>
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
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
