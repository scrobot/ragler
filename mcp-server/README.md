# RAGler MCP Server

MCP adapter that exposes RAGler search and collection tools to MCP clients.

## TL;DR

```bash
pnpm install
pnpm build
pnpm start
```

## What This Is For

Use this server when an MCP client (for example Claude Desktop) needs read access to published RAGler knowledge.

## Prerequisites

- Node.js 20+
- pnpm
- RAGler backend running (`http://localhost:3000` by default)

## Configuration

Create `.env`:

```env
KMS_API_URL=http://localhost:3000
MCP_USER_ID=mcp-server
```

## Run

### Development

```bash
pnpm dev
```

### Production

```bash
pnpm build
pnpm start
```

## Verify

- MCP process starts without config errors.
- Backend responds:

```bash
curl http://localhost:3000/api/health/liveness
```

## Tools Exposed

- `search_knowledge`
- `list_collections`
- `get_collection_info`

## Claude Desktop Example

```json
{
  "mcpServers": {
    "ragler": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"],
      "env": {
        "KMS_API_URL": "http://localhost:3000",
        "MCP_USER_ID": "claude-desktop"
      }
    }
  }
}
```

## Troubleshooting

- Connection errors: confirm `KMS_API_URL` and backend health.
- Validation errors: check `collection_id` UUID and required params.
