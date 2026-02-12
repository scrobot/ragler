export const config = {
  kmsApiUrl: process.env.KMS_API_URL || 'http://localhost:3000',
  kmsApiKey: process.env.KMS_API_KEY || '', // Placeholder for future use
  userId: process.env.MCP_USER_ID || 'mcp-server',
};
