import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { normalizeTag } from '../utils/text-normalizer';

/**
 * LLM-based tag extraction using GPT-4o-mini
 *
 * Extracts 3-12 relevant topic tags from text chunks for better retrieval
 * Uses structured output for reliable JSON parsing
 */

// Zod schema for tag extraction response
const TagExtractionSchema = z.object({
  tags: z
    .array(z.string().min(1).max(50))
    .min(3)
    .max(12)
    .describe('Array of 3-12 relevant topic tags'),
});

type TagExtractionResponse = z.infer<typeof TagExtractionSchema>;

export class LLMTagExtractor {
  private readonly openai: OpenAI;
  private readonly model: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(
    openai: OpenAI,
    options: {
      model?: string;
      timeout?: number;
      maxRetries?: number;
    } = {}
  ) {
    this.openai = openai;
    this.model = options.model ?? 'gpt-4o-mini'; // Cost-effective for tagging
    this.timeout = options.timeout ?? 10000; // 10s timeout
    this.maxRetries = options.maxRetries ?? 2;
  }

  /**
   * Extract tags from text using LLM
   *
   * @param text - Input text (chunk content)
   * @param context - Optional context (document title, section path)
   * @returns Array of normalized tags (lowercase, kebab-case)
   */
  async extractTags(
    text: string,
    context?: { title?: string; headingPath?: string[] }
  ): Promise<string[]> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(text, context);

    try {
      const completion = await this.openai.chat.completions.create(
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: zodResponseFormat(
            TagExtractionSchema,
            'tag_extraction'
          ),
          temperature: 0.3, // Low temperature for consistent tagging
          max_tokens: 150, // Tags are short
        },
        {
          timeout: this.timeout,
          maxRetries: this.maxRetries,
        }
      );

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('Empty response from LLM');
      }

      const parsed = JSON.parse(responseText) as TagExtractionResponse;
      const validated = TagExtractionSchema.parse(parsed);

      // Normalize all tags
      const normalized = validated.tags.map((tag) => normalizeTag(tag));

      // Deduplicate
      const unique = Array.from(new Set(normalized));

      // Ensure 3-12 tags
      return unique.slice(0, 12);
    } catch (error) {
      // Log error but don't fail chunking pipeline
      console.error('Tag extraction failed:', error);
      return []; // Return empty array on failure
    }
  }

  /**
   * Extract tags from multiple texts in batch
   *
   * @param texts - Array of texts to extract tags from
   * @returns Array of tag arrays (parallel to input)
   */
  async extractTagsBatch(
    texts: string[],
    contexts?: Array<{ title?: string; headingPath?: string[] }>
  ): Promise<string[][]> {
    const promises = texts.map((text, i) =>
      this.extractTags(text, contexts?.[i])
    );

    return Promise.all(promises);
  }

  /**
   * Build system prompt for tag extraction
   */
  private buildSystemPrompt(): string {
    return `You are a topic tag extraction expert. Your task is to extract 3-12 relevant topic tags from text chunks.

Guidelines:
- Extract technical terms, concepts, tools, technologies mentioned
- Include domain-specific terminology (e.g., "rag", "llm", "agents", "langchain")
- Use lowercase, concise tags (1-3 words max)
- Focus on searchable keywords that help retrieval
- Avoid generic words like "system", "process", "overview"
- Prefer specific over general (e.g., "gpt-4o" over "ai")

Output format:
- Return 3-12 tags as JSON array
- Tags should be lowercase, use hyphens for multi-word (e.g., "machine-learning")

Examples of good tags:
- "rag", "langchain", "claude-code", "n8n", "confluence", "openai"
- "authentication", "api-integration", "vector-search", "embeddings"
- "python", "typescript", "docker", "kubernetes"`;
  }

  /**
   * Build user prompt with text and optional context
   */
  private buildUserPrompt(
    text: string,
    context?: { title?: string; headingPath?: string[] }
  ): string {
    let prompt = 'Extract relevant topic tags from the following text:\n\n';

    if (context) {
      if (context.title) {
        prompt += `Document title: ${context.title}\n`;
      }
      if (context.headingPath && context.headingPath.length > 0) {
        prompt += `Section: ${context.headingPath.join(' > ')}\n`;
      }
      prompt += '\n';
    }

    // Truncate text if too long (GPT-4o-mini has 128k context but keep it efficient)
    const maxChars = 2000;
    const truncatedText =
      text.length > maxChars ? text.substring(0, maxChars) + '...' : text;

    prompt += `Text:\n${truncatedText}\n\n`;
    prompt += 'Return 3-12 relevant topic tags as a JSON array.';

    return prompt;
  }
}
