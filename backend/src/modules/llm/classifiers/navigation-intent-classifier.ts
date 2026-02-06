import OpenAI from 'openai';
import { z } from 'zod';

/**
 * Navigation intent classifier using GPT-4o-mini
 *
 * Determines if a search query is looking for:
 * - Navigation information (contacts, links, repos, channels)
 * - Knowledge/content (explanations, how-tos, concepts)
 *
 * Used to decide whether to include navigation-type chunks in search results
 */

// Zod schema for intent classification response
const IntentClassificationSchema = z.object({
  intent: z
    .enum(['navigation', 'knowledge'])
    .describe('Primary intent of the query'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score 0-1'),
  reasoning: z
    .string()
    .optional()
    .describe('Brief explanation of classification'),
});

export type IntentClassification = z.infer<typeof IntentClassificationSchema>;

export class NavigationIntentClassifier {
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
    this.model = options.model ?? 'gpt-4o-mini';
    this.timeout = options.timeout ?? 5000; // 5s timeout (fast classification)
    this.maxRetries = options.maxRetries ?? 2;
  }

  /**
   * Classify query intent
   *
   * @param query - Search query
   * @returns Intent classification with confidence
   */
  async classify(query: string): Promise<IntentClassification> {
    if (!query || query.trim().length === 0) {
      return { intent: 'knowledge', confidence: 0.5 };
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(query);

    try {
      const completion = await this.openai.chat.completions.create(
        {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'intent_classification',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  intent: {
                    type: 'string',
                    enum: ['navigation', 'knowledge'],
                    description: 'Primary intent of the query',
                  },
                  confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                    description: 'Confidence score 0-1',
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Brief explanation of classification',
                  },
                },
                required: ['intent', 'confidence'],
                additionalProperties: false,
              },
            },
          },
          temperature: 0.1, // Very low temperature for consistent classification
          max_tokens: 100,
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

      const parsed = JSON.parse(responseText) as IntentClassification;
      return IntentClassificationSchema.parse(parsed);
    } catch (error) {
      // Fallback to knowledge intent on error
      console.error('Intent classification failed:', error);
      return { intent: 'knowledge', confidence: 0.3 };
    }
  }

  /**
   * Check if query has navigation intent (convenience method)
   *
   * @param query - Search query
   * @param confidenceThreshold - Minimum confidence (default: 0.6)
   * @returns True if navigation intent with sufficient confidence
   */
  async hasNavigationIntent(
    query: string,
    confidenceThreshold: number = 0.6
  ): Promise<boolean> {
    const classification = await this.classify(query);
    return (
      classification.intent === 'navigation' &&
      classification.confidence >= confidenceThreshold
    );
  }

  /**
   * Build system prompt for intent classification
   */
  private buildSystemPrompt(): string {
    return `You are a search query intent classifier. Your task is to determine if a user's search query is looking for:

1. **Navigation** - Finding contacts, links, repositories, channels, where to find things
   Examples:
   - "контакты команды" (team contacts)
   - "где slack канал" (where is slack channel)
   - "репозиторий проекта" (project repository)
   - "как проходить курс" (how to access course)
   - "ссылка на документацию" (link to documentation)
   - "канал в slack для вопросов" (slack channel for questions)

2. **Knowledge** - Understanding concepts, learning, explanations, how-tos
   Examples:
   - "что такое RAG" (what is RAG)
   - "как работает langchain" (how langchain works)
   - "объясни архитектуру" (explain architecture)
   - "как реализовать аутентификацию" (how to implement authentication)
   - "разница между agents и tools" (difference between agents and tools)

Classify the query and provide:
- intent: "navigation" or "knowledge"
- confidence: 0.0 to 1.0 (how confident you are)
- reasoning: brief explanation (optional)

Be conservative: if uncertain, default to "knowledge" with lower confidence.`;
  }

  /**
   * Build user prompt with query
   */
  private buildUserPrompt(query: string): string {
    return `Classify the intent of this search query:\n\nQuery: "${query}"\n\nReturn the classification as JSON.`;
  }
}
