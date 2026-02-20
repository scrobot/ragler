import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Task-First Docs',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: <>Follow operational guides with prerequisites, steps, verification, and troubleshooting.</>,
  },
  {
    title: 'Product Workflows',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: <>Execute ingest, session editing, publish, and search flows with copy-paste API examples.</>,
  },
  {
    title: 'Architecture Clarity',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: <>Map each runtime module, data boundary, and decision record to real backend interfaces.</>,
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
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
