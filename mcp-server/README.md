# KMS-RAG MCP Server

Model Context Protocol (MCP) server for KMS-RAG knowledge base. Provides AI agents with structured access to search and collection management operations.

## Features

- **Semantic Search**: Search across knowledge collections with natural language queries
- **Collection Management**: List and inspect knowledge collections
- **Standards-Based**: Built on Anthropic's Model Context Protocol
- **Stateless**: No local state, all operations delegated to KMS Backend API

## Architecture

```
AI Agent (Claude) → MCP Server → KMS Backend API → Qdrant
```

The MCP server acts as a protocol adapter, translating MCP tool calls into HTTP requests to the KMS-RAG backend.

## Prerequisites

- Node.js 20+ installed
- KMS-RAG backend running (default: `http://localhost:3000`)
- pnpm (or npm)

## Installation

```bash
# Install dependencies
pnpm install

# Build the server
pnpm build
```

## Configuration

Create a `.env` file (or set environment variables):

```env
KMS_API_URL=http://localhost:3000
MCP_USER_ID=mcp-server
MCP_USER_ROLE=DEV
```

**Configuration options:**
- `KMS_API_URL`: Backend API base URL (default: `http://localhost:3000`)
- `MCP_USER_ID`: User identifier sent to backend (default: `mcp-server`)
- `MCP_USER_ROLE`: Role for backend authorization (default: `DEV`, options: `ML`, `DEV`, `L2`)

## Usage

### Local Development

Start the MCP server in development mode:

```bash
pnpm dev
```

### Production

Build and run:

```bash
pnpm build
pnpm start
```

### Integration with Claude Desktop

Add to your Claude Desktop MCP configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "kms-rag": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "KMS_API_URL": "http://localhost:3000",
        "MCP_USER_ID": "claude-desktop",
        "MCP_USER_ROLE": "DEV"
      }
    }
  }
}
```

**Important:** Use absolute paths in Claude Desktop config.

### Testing with MCP Inspector

```bash
# Install MCP Inspector (if not already installed)
npm install -g @modelcontextprotocol/inspector

# Run inspector
mcp-inspector node dist/index.js
```

## Available Tools

### 1. `search_knowledge`

Search across knowledge collections with semantic search.

**Parameters:**
- `query` (required): Natural language search query
- `collection_id` (required): UUID of collection to search
- `limit` (optional): Max results (1-100, default 10)

**Example:**
```json
{
  "query": "how to authenticate users",
  "collection_id": "123e4567-e89b-12d3-a456-426614174000",
  "limit": 5
}
```

### 2. `list_collections`

List all available knowledge collections.

**Parameters:** None

**Returns:** Array of collections with metadata (id, name, description, creator, timestamp)

### 3. `get_collection_info`

Get detailed information about a specific collection.

**Parameters:**
- `collection_id` (required): UUID of collection

**Returns:** Collection details with metadata

## Error Handling

The MCP server uses basic error handling:
- Invalid inputs return error responses with Zod validation messages
- HTTP errors from backend are propagated to the AI agent
- Timeouts set to 30 seconds per request

## Logging

Logs are written to `stderr` (stdout is reserved for MCP protocol):
- Startup messages
- Tool execution (via backend API logs)
- Errors

## Limitations (Current MVP)

- **No caching**: Every request hits the backend
- **Collection ID required**: Cannot search across all collections yet
- **No retry logic**: Fail-fast on errors
- **No metrics**: Basic logging only

## Development

### Project Structure

```
mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # MCP server setup
│   ├── config.ts             # Configuration
│   ├── client/
│   │   └── kms-client.ts     # HTTP client for backend
│   └── tools/
│       ├── search.ts         # search_knowledge tool
│       └── collections.ts    # collection tools
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
pnpm build
```

Output: `dist/` directory with compiled JavaScript + source maps

### Running in Development

```bash
pnpm dev  # Uses tsx for hot reload
```

## Troubleshooting

### "Cannot connect to backend"

- Verify backend is running: `curl http://localhost:3000/api/health/live`
- Check `KMS_API_URL` environment variable
- Ensure no firewall blocking localhost:3000

### "Collection not found"

- Use `list_collections` tool first to get valid collection IDs
- Collection IDs must be UUIDs
- Ensure collections exist in backend (check via `/api/collections`)

### "Zod validation error"

- Check tool input parameters match expected schema
- `collection_id` must be valid UUID format
- `query` cannot be empty string

## License

MIT
