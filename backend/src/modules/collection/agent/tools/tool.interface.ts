import { z } from 'zod';

export interface AgentTool<TInput = unknown> {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
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
  schema: z.ZodType<TInput>;
  parameters: Record<string, unknown>;
  execute: (input: TInput) => Promise<string>;
}

export function buildAgentTool<TInput>(
  options: BuildAgentToolOptions<TInput>,
): AgentTool<TInput> {
  return {
    name: options.name,
    description: options.description,
    schema: options.schema,
    parameters: options.parameters,
    parse: (input: unknown) => options.schema.parse(input),
    execute: options.execute,
  };
}
