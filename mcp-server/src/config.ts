export type TransportType = 'stdio' | 'streamable-http' | 'sse';

function parseTransport(value: string | undefined): TransportType {
  const normalized = (value ?? 'stdio').toLowerCase().trim();
  const VALID_TRANSPORTS: TransportType[] = ['stdio', 'streamable-http', 'sse'];

  if (!VALID_TRANSPORTS.includes(normalized as TransportType)) {
    throw new Error(
      `Invalid TRANSPORT="${value}". Allowed values: ${VALID_TRANSPORTS.join(', ')}`,
    );
  }

  return normalized as TransportType;
}

export const config = {
  kmsApiUrl: process.env.KMS_API_URL || 'http://localhost:3000',
  kmsApiKey: process.env.KMS_API_KEY || '', // Placeholder for future use
  userId: process.env.MCP_USER_ID || 'mcp-server',
  transport: parseTransport(process.env.TRANSPORT),
  port: parseInt(process.env.PORT || '3100', 10),
};
