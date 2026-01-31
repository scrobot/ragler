import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { RefineScenario } from './dto';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    this.openai = new OpenAI({ apiKey });
  }

  async chunkContent(content: string): Promise<string[]> {
    this.logger.log('Chunking content using GPT-4o');

    // TODO: Implement actual chunking with GPT-4o
    // For now, return a simple paragraph-based split
    const chunks = content
      .split(/\n\n+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    return chunks;
  }

  async refineText(text: string, scenario: RefineScenario, targetAudience?: string): Promise<string> {
    this.logger.log(`Refining text with scenario: ${scenario}`);

    const prompts: Record<RefineScenario, string> = {
      simplify: `Simplify the following text while preserving its meaning:\n\n${text}`,
      clarify_terms: `Clarify technical terms and jargon in the following text:\n\n${text}`,
      add_examples: `Add clarifying examples to the following text:\n\n${text}`,
      rewrite_for_audience: `Rewrite the following text for ${targetAudience || 'general audience'}:\n\n${text}`,
    };

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that improves text clarity and readability. Return only the improved text without explanations.',
          },
          {
            role: 'user',
            content: prompts[scenario],
          },
        ],
        max_tokens: 2000,
      });

      return response.choices[0]?.message?.content || text;
    } catch (error) {
      this.logger.error('Failed to refine text', error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    this.logger.log('Generating embedding');

    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding', error);
      throw error;
    }
  }
}
