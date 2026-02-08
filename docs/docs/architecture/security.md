---
title: Security
sidebar_position: 11
---

# Security Architecture

## Overview

RAGler implements a layered security model focused on **role-based access control (RBAC)**, **input validation**, and **audit trail** without requiring a full IAM system in MVP.

## Authentication

### MVP: Trusted Header Authentication

**Approach:** Authentication is deferred to upstream proxy or API gateway

**Headers:**
```
X-User-ID: user@company.com
X-User-Role: DEV|ML|L2
```

**Rationale:**
- ✅ Simple MVP implementation
- ✅ Delegates auth to existing infrastructure (OAuth proxy, API gateway)
- ✅ Focuses on authorization (the hard part)
- ❌ Trusts upstream headers (requires secure network)

**Example Request:**
```http
POST /api/ingest
Content-Type: application/json
X-User-ID: dev@company.com
X-User-Role: DEV

{
  "sourceType": "confluence",
  "sourceUrl": "https://..."
}
```

### Post-MVP: Full IAM Integration

**Future Approach:** JWT-based authentication with session management

**Flow:**
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Auth as Auth Service
    participant Backend

    User->>Frontend: Login (username/password)
    Frontend->>Auth: POST /auth/login
    Auth->>Auth: Verify credentials
    Auth-->>Frontend: JWT token (expires 1h)
    Frontend->>Backend: API request + Authorization: Bearer <JWT>
    Backend->>Backend: Validate JWT signature
    Backend->>Backend: Extract user_id, role from token
    Backend-->>Frontend: Response
```

**JWT Structure:**
```json
{
  "sub": "user@company.com",
  "role": "DEV",
  "permissions": ["read", "write", "publish"],
  "exp": 1738426800
}
```

## Authorization (Role-Based Access Control)

### Role Definitions

| Role | Description | Target Users |
|------|-------------|--------------|
| **L2** | L2 Support, Simple Mode only | Non-technical content editors |
| **DEV** | Developer, Advanced Mode | Backend/platform engineers |
| **ML** | ML Specialist, Advanced Mode + Bulk Ops | RAG experts |
| **service** | Service accounts (MCP server) | AI agents, automation |

### Permission Matrix

**Action-based permissions:**

| Action | L2 | DEV | ML | service |
|--------|----|----|----|----|
| Create source | ✅ | ✅ | ✅ | ❌ |
| Import Confluence | ✅ | ✅ | ✅ | ❌ |
| View source | ✅ | ✅ | ✅ | ✅ |
| Re-process source | ❌ | ✅ | ✅ | ❌ |
| View chunks | ✅ | ✅ | ✅ | ✅ |
| Edit chunk text | ✅ | ✅ | ✅ | ❌ |
| Split/merge chunks | ❌ | ✅ | ✅ | ❌ |
| Use LLM assistant | ✅ | ✅ | ✅ | ❌ |
| Select collection | ✅ | ✅ | ✅ | ❌ |
| Create collection | ❌ | ✅ | ✅ | ❌ |
| Manage collection | ❌ | ✅ | ✅ | ❌ |
| Publish chunks | ✅ | ✅ | ✅ | ❌ |
| Bulk operations | ❌ | ❌ | ✅ | ❌ |
| Search knowledge | ✅ | ✅ | ✅ | ✅ |

### Authorization Enforcement

**Middleware (NestJS Guard):**
```typescript
@Injectable()
export class RoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    if (!requiredRoles) {
      return true; // No role restriction
    }

    const userRole = request.headers['x-user-role'];

    if (!userRole) {
      throw new UnauthorizedException('Missing X-User-Role header');
    }

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(`Role ${userRole} not allowed for this action`);
    }

    return true;
  }
}
```

**Controller Usage:**
```typescript
@Controller('collections')
export class CollectionController {
  @Post()
  @Roles('DEV', 'ML')  // Only DEV and ML can create collections
  async createCollection(@Body() dto: CreateCollectionDto) {
    // ...
  }

  @Get()
  // No @Roles decorator - all roles can list collections
  async listCollections() {
    // ...
  }
}
```

**Session Operations:**
```typescript
@Controller('sessions/:id/chunks/:chunkId')
export class SessionController {
  @Post('split')
  @Roles('DEV', 'ML')  // Split restricted to Advanced Mode
  async splitChunk() {
    // ...
  }

  @Patch()
  // All roles can edit chunk text
  async editChunk() {
    // ...
  }
}
```

### UI-Level Enforcement

**Simple Mode (L2 Role):**
- UI hides split/merge buttons
- Backend blocks API calls to `/chunks/{id}/split` and `/chunks/merge`
- Collection management UI hidden

**Advanced Mode (DEV/ML Roles):**
- Full UI access to split/merge operations
- Collection management UI visible
- Bulk operations visible only for ML role

**Enforcement Strategy:**
- **Defense in Depth:** Both UI and API enforce restrictions
- UI enforcement improves UX (don't show disabled features)
- API enforcement prevents bypassing UI restrictions

## Input Validation

### DTO Validation (class-validator)

**All API inputs validated using Zod or class-validator:**

```typescript
import { IsString, IsEnum, IsUrl, Length, IsOptional } from 'class-validator';

export class IngestDto {
  @IsEnum(['confluence', 'web', 'manual'])
  sourceType: 'confluence' | 'web' | 'manual';

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30000)
  content?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
```

**Validation Errors:**
```json
{
  "statusCode": 400,
  "message": [
    "sourceType must be one of the following values: confluence, web, manual",
    "content must be shorter than or equal to 30000 characters"
  ],
  "error": "Bad Request"
}
```

### Sanitization

**Text Content:**
- Strip control characters
- Normalize whitespace
- Remove null bytes
- Truncate to max length

**URLs:**
- Validate scheme (http/https only)
- Validate domain (no localhost, internal IPs)
- Sanitize path (remove directory traversal)

**Implementation:**
```typescript
function sanitizeContent(content: string): string {
  return content
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control chars
    .replace(/\s+/g, ' ')                 // Normalize whitespace
    .trim()
    .substring(0, MAX_CONTENT_LENGTH);    // Truncate
}

function sanitizeUrl(url: string): string {
  const parsed = new URL(url);

  // Only allow http/https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ValidationError('Invalid URL scheme');
  }

  // Block private IP ranges
  if (isPrivateIP(parsed.hostname)) {
    throw new ValidationError('Private IPs not allowed');
  }

  return url;
}
```

## Data Protection

### Sensitive Data Handling

**What is stored:**
- ✅ Source URLs (may contain Confluence credentials in query params)
- ✅ Chunk content (may contain PII, secrets if user ingests them)
- ✅ User IDs (email addresses)
- ❌ Passwords (never stored)
- ❌ API keys (backend config only, never in database)

**Protection Measures:**
1. **Redact secrets from logs:**
   ```typescript
   function sanitizeLog(obj: any): any {
     if (typeof obj === 'string' && obj.includes('api_key=')) {
       return obj.replace(/api_key=[^&]+/, 'api_key=REDACTED');
     }
     // Recursively sanitize objects
     return obj;
   }
   ```

2. **No sensitive data in error responses:**
   ```typescript
   // Bad:
   throw new Error(`Failed to connect to ${OPENAI_API_KEY}`);

   // Good:
   throw new Error('Failed to connect to LLM service');
   ```

3. **Audit trail without PII:**
   ```json
   {
     "event": "publish_success",
     "user_id": "user@company.com",  // OK: business email
     "session_id": "sess_abc123",
     "source_url": "https://confluence.../page/123",  // OK: metadata
     "chunks_count": 5,
     "timestamp": "2026-02-08T10:30:00Z"
   }
   ```

### Secrets Management

**Environment Variables:**
```bash
# .env (never commit to git)
OPENAI_API_KEY=sk-...           # OpenAI API key
CONFLUENCE_API_TOKEN=...        # Confluence auth token
REDIS_PASSWORD=...              # Redis auth
QDRANT_API_KEY=...              # Qdrant auth (optional)
```

**Kubernetes Secrets:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ragler-secrets
type: Opaque
stringData:
  openai-api-key: sk-...
  confluence-api-token: ...
  redis-password: ...
```

**Access Control:**
- Secrets mounted as environment variables
- Pod-level access only
- Rotate secrets every 90 days

## Error Handling & Information Disclosure

### Error Response Design

**Bad (Information Disclosure):**
```json
{
  "error": "Error: ECONNREFUSED connect to redis://admin:password@localhost:6379"
}
```

**Good (Safe Error):**
```json
{
  "statusCode": 500,
  "message": "Failed to connect to session store",
  "error": "SERVICE_UNAVAILABLE",
  "requestId": "req-abc123"
}
```

### Error Classification

**User Errors (4xx):**
- Return specific error message (safe to disclose)
- Include validation details
- Suggest how to fix

**Server Errors (5xx):**
- Return generic error message
- Log full details server-side
- Include request ID for support

**Implementation:**
```typescript
export class ErrorHandler {
  handle(error: Error, context: ExecutionContext) {
    const isProduction = process.env.NODE_ENV === 'production';

    if (error instanceof ValidationError) {
      // User error - safe to return details
      return {
        statusCode: 400,
        message: error.message,
        errors: error.validationErrors
      };
    }

    if (error instanceof PermissionError) {
      // Authorization error
      return {
        statusCode: 403,
        message: 'Insufficient permissions',
        error: 'FORBIDDEN'
      };
    }

    // Server error - hide details in production
    logger.error('Unhandled error', { error, context });

    return {
      statusCode: 500,
      message: isProduction
        ? 'Internal server error'
        : error.message,  // Show details in dev only
      requestId: context.requestId
    };
  }
}
```

## Audit Trail

### Audit Log Events

**What is logged:**

| Event | Data Captured |
|-------|---------------|
| `ingest_start` | user_id, source_url, source_type |
| `ingest_success` | user_id, session_id, chunks_count |
| `ingest_failure` | user_id, source_url, error |
| `chunk_edit` | user_id, session_id, chunk_id |
| `chunk_split` | user_id, session_id, chunk_id, split_points |
| `chunk_merge` | user_id, session_id, chunk_ids |
| `preview_lock` | user_id, session_id |
| `publish_start` | user_id, session_id, collection_id |
| `publish_success` | user_id, session_id, collection_id, chunks_published |
| `publish_failure` | user_id, session_id, error |
| `collection_create` | user_id, collection_id, collection_name |
| `collection_delete` | user_id, collection_id |

**Log Format (JSON):**
```json
{
  "timestamp": "2026-02-08T10:30:00.123Z",
  "level": "info",
  "event": "publish_success",
  "correlation_id": "req-abc123",
  "user_id": "dev@company.com",
  "user_role": "DEV",
  "session_id": "sess_xyz789",
  "collection_id": "uuid-api-docs",
  "chunks_published": 8,
  "source_id": "a1b2c3d4e5f6",
  "duration_ms": 450
}
```

### Audit Retention

**Storage:**
- Logs sent to centralized logging (Elasticsearch, Datadog, etc.)
- Retention: 90 days (configurable)
- Searchable by user_id, session_id, collection_id

**Compliance:**
- Track who published what content (attribution)
- Track who deleted collections (accountability)
- Track failed publish attempts (security monitoring)

## Rate Limiting

### API Rate Limits

**Per User:**
```
- Ingest: 10 requests/minute
- Publish: 5 requests/minute
- Search: 100 requests/minute
- LLM refinement: 20 requests/minute
```

**Per Service Account (MCP):**
```
- Search: 100 requests/minute
- List collections: 20 requests/minute
```

**Implementation (express-rate-limit):**
```typescript
import rateLimit from 'express-rate-limit';

const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1 minute
  max: 10,                      // 10 requests per window
  keyGenerator: (req) => req.headers['x-user-id'],
  message: {
    statusCode: 429,
    message: 'Too many requests, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

app.use('/api/ingest', ingestLimiter);
```

### DDoS Protection

**Measures:**
1. **Request size limits:**
   ```typescript
   app.use(express.json({ limit: '1mb' }));
   ```

2. **Timeout enforcement:**
   ```typescript
   app.use(timeout('30s'));
   ```

3. **IP-based blocking (upstream):**
   - Cloudflare, AWS WAF, or API Gateway
   - Block suspicious IPs
   - Challenge requests (CAPTCHA)

## Security Headers

### HTTP Security Headers

**Helmet.js Configuration:**
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Needed for React
      styleSrc: ["'self'", "'unsafe-inline'"],   // Needed for CSS-in-JS
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL]
    }
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'  // Prevent clickjacking
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));
```

**CORS Configuration:**
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-User-Role']
}));
```

## Vulnerability Management

### Dependency Scanning

**Tools:**
- `npm audit` - Scan for known vulnerabilities
- `snyk` - Continuous monitoring
- Dependabot - Automated PR for updates

**Workflow:**
```bash
# Check dependencies
pnpm audit

# Fix vulnerabilities
pnpm audit fix

# Generate report
pnpm audit --json > audit-report.json
```

### Security Testing

**Tools:**
- OWASP ZAP - Dynamic application security testing
- Burp Suite - Manual penetration testing
- SonarQube - Static code analysis

**Key Checks:**
- ✅ SQL Injection (N/A - no SQL database)
- ✅ XSS (Frontend input sanitization)
- ✅ CSRF (Token-based protection)
- ✅ Authentication bypass
- ✅ Authorization bypass (role escalation)
- ✅ Information disclosure (error messages)

## Security Best Practices

### Secure Development Checklist

**Before Merging PR:**
- [ ] Input validation on all API endpoints
- [ ] Authorization checks for protected actions
- [ ] Sensitive data redacted from logs
- [ ] Error handling doesn't leak information
- [ ] Rate limiting configured
- [ ] Secrets stored in environment variables (not code)
- [ ] Dependencies scanned for vulnerabilities
- [ ] Unit tests cover security scenarios

**Before Production Deployment:**
- [ ] Secrets rotated (OpenAI key, Confluence token)
- [ ] HTTPS enabled (TLS 1.2+)
- [ ] Security headers configured
- [ ] Audit logging enabled
- [ ] Rate limits tested
- [ ] Penetration testing completed
- [ ] Incident response plan documented

### Security Monitoring

**Metrics to Track:**
- Failed authentication attempts
- Authorization failures (403 errors)
- Rate limit violations (429 errors)
- Unusual API patterns (rapid requests from single user)
- Sensitive data access (Confluence ingestion)

**Alerts:**
- Spike in 403 errors (potential attack)
- Spike in 500 errors (system compromise?)
- Unusual publish volume (data exfiltration?)
- Failed login attempts > 10 in 1 minute

## Related Documentation

- [Product: Roles and Modes](/docs/product/roles) - User role definitions
- [Architecture: Observability](/docs/architecture/observability) - Audit logging
- [Architecture: MCP Server](/docs/architecture/mcp-server) - Service authentication
- [Getting Started: Configuration](/docs/getting-started/configuration) - Security setup
