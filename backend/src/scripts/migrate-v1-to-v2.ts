#!/usr/bin/env node
/**
 * Migration script: Qdrant v1 → v2 schema
 *
 * Converts collections from simple v1 payload (7 fields) to rich v2 payload
 * with doc/chunk/tags/acl structure.
 *
 * Features:
 * - Dual collection pattern ({collection}_v2)
 * - Deduplication by content_hash
 * - Heuristic chunk type classification
 * - Tag extraction (keyword-based for migration)
 * - Dry-run mode
 * - Progress tracking and statistics
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-v1-to-v2.ts --collection <uuid> [--dry-run] [--batch-size 100]
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import {
  QdrantPayloadV2,
  DocMetadata,
  ChunkType,
  generateChunkId,
  formatSection,
  createDefaultAcl,
} from '@modules/vector/dto/payload-v2.dto';
import {
  computeContentHash,
  detectLanguage,
  normalizeTag,
} from '@modules/llm/utils/text-normalizer';

// V1 Payload structure (existing)
interface QdrantPayloadV1 {
  content: string;
  source_id: string;
  source_url: string;
  source_type: 'confluence' | 'web' | 'manual';
  last_modified_by: string;
  last_modified_at: string;
  revision: number;
}

// Migration statistics
interface MigrationStats {
  originalCount: number;
  deduplicatedCount: number;
  migratedCount: number;
  typeDistribution: Record<ChunkType, number>;
  languageDistribution: Record<string, number>;
  errorCount: number;
  durationMs: number;
}

const logger = new Logger('MigrationScript');

/**
 * Classify chunk type based on content heuristics
 */
function classifyChunkType(text: string): ChunkType {
  const lower = text.toLowerCase();

  // Navigation markers (Russian + English)
  const navKeywords = [
    'контакты',
    'контактные данные',
    'slack',
    'репозиторий',
    'как проходить',
    'быстрая навигация',
    'ссылки:',
    'полезные ссылки',
    'где найти',
    'канал в slack',
    'github',
    'confluence',
    'contact',
    'repository',
    'quick navigation',
    'useful links',
  ];

  if (navKeywords.some((kw) => lower.includes(kw))) {
    return 'navigation';
  }

  // Table row pattern (cell1 / cell2 / cell3)
  if (/^[^/]+\s*\/\s*[^/]+\s*\/\s*[^/]+/.test(text)) {
    return 'table_row';
  }

  // Code block markers
  if (text.startsWith('```') || /^\s{4,}/.test(text)) {
    return 'code';
  }

  // FAQ pattern
  if (/^(q:|вопрос:|question:)/i.test(text) || /^(a:|ответ:|answer:)/i.test(text)) {
    return 'faq';
  }

  // Glossary pattern (Term - definition)
  if (/^[А-Яа-яA-Za-z\s]+\s*[-–—]\s*/.test(text)) {
    return 'glossary';
  }

  // Default to knowledge
  return 'knowledge';
}

/**
 * Extract tags using keyword matching (simple version for migration)
 */
function extractKeywordTags(text: string): string[] {
  const TAG_PATTERNS: Record<string, RegExp> = {
    'rag': /\bRAG\b|\bretrieval.?augmented\b/i,
    'agents': /\bagent[s]?\b|\bagentic\b/i,
    'langchain': /\blangchain\b|\blanggraph\b/i,
    'n8n': /\bn8n\b/i,
    'claude': /\bclaude\b|\bclaude.?code\b/i,
    'openai': /\bopenai\b|\bgpt-?[0-9]\b/i,
    'confluence': /\bconfluence\b/i,
    'qdrant': /\bqdrant\b/i,
    'vector-search': /\bvector\b.*\bsearch\b/i,
    'embeddings': /\bembedding[s]?\b/i,
    'llm': /\bLLM[s]?\b|\blarge.?language.?model/i,
    'api': /\bAPI\b/i,
    'authentication': /\bauth\b|\bauthentication\b/i,
    'typescript': /\btypescript\b|\bts\b/i,
    'python': /\bpython\b/i,
    'nodejs': /\bnode\.?js\b/i,
    'nestjs': /\bnest\.?js\b/i,
    'redis': /\bredis\b/i,
    'docker': /\bdocker\b/i,
  };

  const tags: string[] = [];
  for (const [tag, pattern] of Object.entries(TAG_PATTERNS)) {
    if (pattern.test(text)) {
      tags.push(normalizeTag(tag));
    }
  }

  return tags.slice(0, 12); // Cap at 12 tags
}

/**
 * Infer heading path from text content (best effort)
 */
function inferHeadingPath(text: string, title: string | null): string[] {
  // Try to find heading-like patterns at the start
  const headingMatch = text.match(/^#+\s+(.+)/m) || text.match(/^(.+)\n[=-]{3,}/m);

  if (headingMatch) {
    return title ? [title, headingMatch[1].trim()] : [headingMatch[1].trim()];
  }

  // Fallback to title or empty
  return title ? [title] : [];
}

/**
 * Map v1 payload to v2 payload
 */
function mapV1ToV2(
  v1: QdrantPayloadV1,
  index: number,
  sourceChunkCounts: Map<string, number>
): QdrantPayloadV2 {
  const contentHash = computeContentHash(v1.content);
  const lang = detectLanguage(v1.content);
  const chunkType = classifyChunkType(v1.content);
  const tags = extractKeywordTags(v1.content);
  const headingPath = inferHeadingPath(v1.content, null);
  const section = formatSection(headingPath);

  // Generate stable chunk ID
  const chunkId = generateChunkId(v1.source_id, contentHash);

  // Count chunks per source for index assignment
  const currentIndex = sourceChunkCounts.get(v1.source_id) || 0;
  sourceChunkCounts.set(v1.source_id, currentIndex + 1);

  // Build doc metadata
  const doc: DocMetadata = {
    source_type: v1.source_type,
    source_id: v1.source_id,
    url: v1.source_url,
    space_key: null, // Not available in v1
    title: null, // Not available in v1
    revision: v1.revision,
    last_modified_at: v1.last_modified_at,
    last_modified_by: v1.last_modified_by,
  };

  return {
    doc,
    chunk: {
      id: chunkId,
      index: currentIndex,
      type: chunkType,
      heading_path: headingPath,
      section,
      text: v1.content,
      content_hash: contentHash,
      lang,
    },
    tags,
    acl: createDefaultAcl(),
  };
}

/**
 * Deduplicate points by content_hash within each {source_id:revision} group
 */
function deduplicatePoints(
  points: Array<{ id: string; vector: number[]; payload: QdrantPayloadV2 }>
): Array<{ id: string; vector: number[]; payload: QdrantPayloadV2 }> {
  // Group by source_id:revision
  const groups = new Map<string, typeof points>();

  for (const point of points) {
    const key = `${point.payload.doc.source_id}:${point.payload.doc.revision}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(point);
  }

  const deduplicated: typeof points = [];

  // Deduplicate within each group by content_hash
  for (const [_key, groupPoints] of groups) {
    const byHash = new Map<string, typeof points>();

    for (const point of groupPoints) {
      const hash = point.payload.chunk.content_hash;
      if (!byHash.has(hash)) {
        byHash.set(hash, []);
      }
      byHash.get(hash)!.push(point);
    }

    // For each hash, keep the one with latest last_modified_at
    for (const [_hash, duplicates] of byHash) {
      if (duplicates.length === 1) {
        deduplicated.push(duplicates[0]);
      } else {
        // Keep latest by timestamp
        const latest = duplicates.reduce((prev, curr) =>
          new Date(curr.payload.doc.last_modified_at) >
          new Date(prev.payload.doc.last_modified_at)
            ? curr
            : prev
        );
        deduplicated.push(latest);
      }
    }
  }

  return deduplicated;
}

/**
 * Migrate a single collection from v1 to v2
 */
async function migrateCollection(
  client: QdrantClient,
  collectionName: string,
  options: {
    dryRun: boolean;
    batchSize: number;
  }
): Promise<MigrationStats> {
  const startTime = Date.now();
  const stats: MigrationStats = {
    originalCount: 0,
    deduplicatedCount: 0,
    migratedCount: 0,
    typeDistribution: {} as Record<ChunkType, number>,
    languageDistribution: {},
    errorCount: 0,
    durationMs: 0,
  };

  logger.log({
    event: 'migration_start',
    collection: collectionName,
    dryRun: options.dryRun,
  });

  try {
    // Step 1: Verify source collection exists
    const collections = await client.getCollections();
    const sourceExists = collections.collections.some(
      (c: { name: string }) => c.name === collectionName
    );

    if (!sourceExists) {
      throw new Error(`Source collection ${collectionName} does not exist`);
    }

    // Step 2: Get collection info
    const collectionInfo = await client.getCollection(collectionName);
    stats.originalCount = collectionInfo.points_count || 0;

    logger.log({
      event: 'migration_collection_info',
      collection: collectionName,
      pointsCount: stats.originalCount,
      vectorSize: collectionInfo.config.params.vectors,
    });

    if (stats.originalCount === 0) {
      logger.warn({
        event: 'migration_empty_collection',
        collection: collectionName,
      });
      stats.durationMs = Date.now() - startTime;
      return stats;
    }

    // Step 3: Create v2 collection (if not dry-run)
    const v2CollectionName = `${collectionName}_v2`;

    if (!options.dryRun) {
      // Check if v2 collection already exists
      const v2Exists = collections.collections.some(
        (c: { name: string }) => c.name === v2CollectionName
      );

      if (v2Exists) {
        logger.warn({
          event: 'migration_v2_exists',
          collection: v2CollectionName,
        });
        throw new Error(
          `V2 collection ${v2CollectionName} already exists. Delete it first or use a different collection.`
        );
      }

      // Create v2 collection with same vector config
      await client.createCollection(v2CollectionName, {
        vectors: collectionInfo.config.params.vectors,
      });

      // Create payload indexes for filtering
      await client.createPayloadIndex(v2CollectionName, {
        field_name: 'doc.source_type',
        field_schema: 'keyword',
      });

      await client.createPayloadIndex(v2CollectionName, {
        field_name: 'chunk.type',
        field_schema: 'keyword',
      });

      await client.createPayloadIndex(v2CollectionName, {
        field_name: 'tags',
        field_schema: 'keyword',
      });

      logger.log({
        event: 'migration_v2_created',
        collection: v2CollectionName,
      });
    }

    // Step 4: Scroll through all points in source collection
    const allPoints: Array<{
      id: string;
      vector: number[];
      payload: QdrantPayloadV2;
    }> = [];
    const sourceChunkCounts = new Map<string, number>();

    let offset: string | number | Record<string, unknown> | null | undefined = null;
    let scrollCount = 0;

    while (true) {
      const scrollResult = await client.scroll(collectionName, {
        limit: options.batchSize,
        offset: offset ?? undefined,
        with_payload: true,
        with_vector: true,
      });

      if (scrollResult.points.length === 0) {
        break;
      }

      // Map v1 points to v2 structure
      for (const point of scrollResult.points) {
        try {
          const v1Payload = point.payload as unknown as QdrantPayloadV1;
          const v2Payload = mapV1ToV2(
            v1Payload,
            allPoints.length,
            sourceChunkCounts
          );

          allPoints.push({
            id: v2Payload.chunk.id, // Use stable v2 ID
            vector: point.vector as number[],
            payload: v2Payload,
          });
        } catch (error) {
          logger.error({
            event: 'migration_point_error',
            pointId: point.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          stats.errorCount++;
        }
      }

      offset = scrollResult.next_page_offset;
      scrollCount++;

      logger.log({
        event: 'migration_scroll_progress',
        scrollBatch: scrollCount,
        pointsProcessed: allPoints.length,
      });

      if (!offset) {
        break;
      }
    }

    // Step 5: Deduplicate by content_hash
    const deduplicatedPoints = deduplicatePoints(allPoints);
    stats.deduplicatedCount = allPoints.length - deduplicatedPoints.length;

    logger.log({
      event: 'migration_deduplication',
      original: allPoints.length,
      duplicates: stats.deduplicatedCount,
      unique: deduplicatedPoints.length,
    });

    // Step 6: Compute statistics
    for (const point of deduplicatedPoints) {
      const type = point.payload.chunk.type;
      const lang = point.payload.chunk.lang;

      stats.typeDistribution[type] = (stats.typeDistribution[type] || 0) + 1;
      stats.languageDistribution[lang] =
        (stats.languageDistribution[lang] || 0) + 1;
    }

    // Step 7: Upsert to v2 collection (if not dry-run)
    if (!options.dryRun) {
      // Batch upsert
      for (let i = 0; i < deduplicatedPoints.length; i += options.batchSize) {
        const batch = deduplicatedPoints.slice(i, i + options.batchSize);

        await client.upsert(v2CollectionName, {
          wait: true,
          points: batch.map((p) => ({
            id: p.id,
            vector: p.vector,
            payload: p.payload as Record<string, unknown>,
          })),
        });

        logger.log({
          event: 'migration_upsert_progress',
          batch: Math.floor(i / options.batchSize) + 1,
          pointsUpserted: Math.min(i + options.batchSize, deduplicatedPoints.length),
          total: deduplicatedPoints.length,
        });
      }

      stats.migratedCount = deduplicatedPoints.length;

      logger.log({
        event: 'migration_upsert_complete',
        collection: v2CollectionName,
        pointsUpserted: stats.migratedCount,
      });
    } else {
      stats.migratedCount = deduplicatedPoints.length;
      logger.log({
        event: 'migration_dry_run_complete',
        wouldMigrate: stats.migratedCount,
      });
    }

    stats.durationMs = Date.now() - startTime;

    logger.log({
      event: 'migration_success',
      collection: collectionName,
      v2Collection: v2CollectionName,
      stats,
    });

    return stats;
  } catch (error) {
    stats.durationMs = Date.now() - startTime;

    logger.error({
      event: 'migration_failure',
      collection: collectionName,
      error: error instanceof Error ? error.message : 'Unknown error',
      stats,
    });

    throw error;
  }
}

/**
 * Main CLI entry point
 */
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('collection', {
      type: 'string',
      description: 'Collection UUID to migrate',
      demandOption: true,
    })
    .option('dry-run', {
      type: 'boolean',
      description: 'Preview migration without writing',
      default: false,
    })
    .option('batch-size', {
      type: 'number',
      description: 'Batch size for scrolling and upserting',
      default: 100,
    })
    .option('qdrant-url', {
      type: 'string',
      description: 'Qdrant URL',
      default: process.env.QDRANT_URL || 'http://localhost:6333',
    })
    .help()
    .alias('help', 'h').argv;

  // Initialize Qdrant client
  const client = new QdrantClient({ url: argv['qdrant-url'] });

  logger.log({
    event: 'migration_cli_start',
    collection: argv.collection,
    dryRun: argv['dry-run'],
    batchSize: argv['batch-size'],
  });

  try {
    const stats = await migrateCollection(client, argv.collection, {
      dryRun: argv['dry-run'],
      batchSize: argv['batch-size'],
    });

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Collection: ${argv.collection}`);
    console.log(`Dry Run: ${argv['dry-run'] ? 'YES' : 'NO'}`);
    console.log(`Original Points: ${stats.originalCount}`);
    console.log(`Duplicates Removed: ${stats.deduplicatedCount}`);
    console.log(`Migrated Points: ${stats.migratedCount}`);
    console.log(`Errors: ${stats.errorCount}`);
    console.log(`Duration: ${(stats.durationMs / 1000).toFixed(2)}s`);
    console.log('\nType Distribution:');
    for (const [type, count] of Object.entries(stats.typeDistribution)) {
      console.log(`  ${type}: ${count}`);
    }
    console.log('\nLanguage Distribution:');
    for (const [lang, count] of Object.entries(stats.languageDistribution)) {
      console.log(`  ${lang}: ${count}`);
    }
    console.log('========================\n');

    process.exit(0);
  } catch (error) {
    logger.error({
      event: 'migration_cli_failure',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    console.error('\nMigration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { migrateCollection, mapV1ToV2, deduplicatePoints, classifyChunkType };
