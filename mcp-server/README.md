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
TRANSPORT=stdio           # stdio | streamable-http | sse
PORT=3100                 # HTTP listen port (streamable-http / sse only)
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KMS_API_URL` | `http://localhost:3000` | RAGler backend base URL |
| `MCP_USER_ID` | `mcp-server` | Identity sent in request headers |
| `TRANSPORT` | `stdio` | Transport mode: `stdio`, `streamable-http`, or `sse` |
| `PORT` | `3100` | HTTP listen port (ignored in stdio mode) |

## Run

### Development

```bash
pnpm dev
```

### Production (stdio — default)

```bash
pnpm build
pnpm start
```

### Production (HTTP — for Docker / network access)

```bash
TRANSPORT=streamable-http PORT=3100 pnpm start
```

The server will listen on `http://0.0.0.0:3100/mcp`.

## Verify

- **stdio mode**: MCP process starts, blocks on stdin.
- **streamable-http mode**:

```bash
curl -s -X POST http://localhost:3100/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}'
```

- **Health check** (HTTP modes only):

```bash
curl http://localhost:3100/health
```

## Tools Exposed

- `search_knowledge`
- `list_collections`
- `get_collection_info`

## Docker Compose

The `docker-compose.yml` runs the MCP server with `streamable-http` by default:

```yaml
mcp-server:
  image: ghcr.io/scrobot/ragler/mcp-server:latest
  ports:
    - "3100:3100"
  environment:
    - RAGLER_API_URL=http://api:3000
    - TRANSPORT=streamable-http
    - PORT=3100
```

Other containers can connect to `http://mcp-server:3100/mcp`.

## Claude Desktop Example (stdio)

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
- Port in use: change `PORT` or kill the conflicting process.
- Invalid transport: `TRANSPORT` must be one of `stdio`, `streamable-http`, `sse`.
