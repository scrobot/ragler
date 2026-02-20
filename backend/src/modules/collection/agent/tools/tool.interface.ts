import { z } from 'zod';

export interface AgentTool<TInput = unknown> {
  name: string;
  description: string;
  /**
   * JSON schema for OpenAI function calling.
   */
  parameters: Record<string, unknown>;
  parse(input: unknown): TInput;
  execute(input: TInput): Promise<string>;
}

interface BuildAgentToolOptions<TInput> {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  schema: z.ZodType<TInput>;
  execute: (input: TInput) => Promise<string>;
}

export function buildAgentTool<TInput>(
  options: BuildAgentToolOptions<TInput>,
): AgentTool<TInput> {
  return {
    name: options.name,
    description: options.description,
    parameters: options.parameters,
    parse: (input: unknown) => options.schema.parse(input),
    execute: options.execute,
  };
}

