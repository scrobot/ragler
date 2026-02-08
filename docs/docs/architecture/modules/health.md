---
title: Health Module
sidebar_position: 6
---

# Module: Health

## Purpose

The **Health module** provides health check endpoints for monitoring RAGler's operational status and dependency health, essential for production deployments, container orchestration, and observability.

## Architecture

### Components

**Key Classes:**
- `HealthController` - HTTP endpoints for health checks
- **Health Indicators:**
  - `RedisHealthIndicator` - Redis connection and operation health
  - `QdrantHealthIndicator` - Qdrant connection and collection health

**Design Pattern:**
- **Health Check Pattern** - Probes for liveness and readiness
- **Dependency Checks** - Validates external service availability
- **Circuit Breaker** - Prevents cascading failures

### Dependencies

**Internal:**
- `@infrastructure/RedisService` - Redis connection pool
- `@vector/VectorService` - Qdrant client

**External:**
- **Redis** - Draft session storage (critical dependency)
- **Qdrant** - Vector database (critical dependency)

### Integration Points

**Used By:**
- Kubernetes/Docker - Liveness and readiness probes
- Load balancers - Backend health monitoring
- Monitoring systems - Prometheus, Grafana, Datadog
- CI/CD pipelines - Deployment health verification

**Exposes:**
- `GET /health/live` - Liveness probe (process alive?)
- `GET /health/ready` - Readiness probe (ready to serve traffic?)
- `GET /health/deps` - Dependency status (detailed breakdown)

## Key Concepts

### Liveness vs Readiness

**Liveness Probe (`/health/live`):**
- **Question:** "Is the process alive?"
- **Purpose:** Detect deadlocks, hung processes
- **Action on failure:** Restart container/process
- **Checks:**
  - ✅ Process is running
  - ✅ Event loop is responsive
  - ✅ No fatal errors

**Response:**
```json
{
  "status": "ok",
  "info": {
    "process": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "process": {
      "status": "up"
    }
  }
}
```

**Readiness Probe (`/health/ready`):**
- **Question:** "Can this instance serve traffic?"
- **Purpose:** Determine if backend can handle requests
- **Action on failure:** Remove from load balancer, do NOT restart
- **Checks:**
  - ✅ Process is alive (liveness)
  - ✅ Redis is reachable and responsive
  - ✅ Qdrant is reachable and responsive
  - ✅ Critical collections exist

**Response (Healthy):**
```json
{
  "status": "ok",
  "info": {
    "redis": {
      "status": "up"
    },
    "qdrant": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "redis": {
      "status": "up",
      "responseTime": "2ms"
    },
    "qdrant": {
      "status": "up",
      "collections": 5,
      "responseTime": "15ms"
    }
  }
}
```

**Response (Unhealthy):**
```json
{
  "status": "error",
  "info": {
    "redis": {
      "status": "up"
    }
  },
  "error": {
    "qdrant": {
      "status": "down",
      "message": "Connection timeout after 5000ms"
    }
  },
  "details": {
    "redis": {
      "status": "up",
      "responseTime": "3ms"
    },
    "qdrant": {
      "status": "down",
      "message": "Connection timeout after 5000ms",
      "lastSuccessfulCheck": "2026-02-08T10:25:00Z"
    }
  }
}
```

### Health Indicators

#### Redis Health Indicator

**Checks:**
1. **Connection:** Can connect to Redis server?
2. **Ping:** PING command responds?
3. **Read/Write:** Can perform GET/SET operations?

**Implementation:**
```typescript
async isHealthy(): Promise<HealthIndicatorResult> {
  try {
    const start = Date.now();

    // Test connection with PING
    const pong = await redis.ping();

    if (pong !== 'PONG') {
      return {
        status: 'down',
        message: 'Redis PING failed'
      };
    }

    // Test read/write
    const testKey = `health:check:${Date.now()}`;
    await redis.set(testKey, 'ok', 'EX', 10);
    const value = await redis.get(testKey);

    if (value !== 'ok') {
      return {
        status: 'down',
        message: 'Redis read/write test failed'
      };
    }

    const responseTime = Date.now() - start;

    return {
      status: 'up',
      responseTime: `${responseTime}ms`
    };
  } catch (error) {
    return {
      status: 'down',
      message: error.message
    };
  }
}
```

**Health Criteria:**
- ✅ Status: `up` if all checks pass
- ❌ Status: `down` if any check fails
- ⚠️ Status: `degraded` if slow (>100ms response time)

#### Qdrant Health Indicator

**Checks:**
1. **Connection:** Can connect to Qdrant?
2. **Cluster:** Qdrant cluster is healthy?
3. **Collections:** Critical collections exist (`sys_registry`)?

**Implementation:**
```typescript
async isHealthy(): Promise<HealthIndicatorResult> {
  try {
    const start = Date.now();

    // Check cluster health
    const health = await qdrant.getClusterStatus();

    if (health.status !== 'green') {
      return {
        status: 'down',
        message: `Qdrant cluster status: ${health.status}`
      };
    }

    // Verify sys_registry exists
    const registryExists = await qdrant.collectionExists('sys_registry');

    if (!registryExists) {
      return {
        status: 'down',
        message: 'sys_registry collection missing'
      };
    }

    // Count collections
    const collections = await qdrant.getCollections();
    const responseTime = Date.now() - start;

    return {
      status: 'up',
      collections: collections.collections.length,
      responseTime: `${responseTime}ms`
    };
  } catch (error) {
    return {
      status: 'down',
      message: error.message
    };
  }
}
```

**Health Criteria:**
- ✅ Status: `up` if cluster green, sys_registry exists
- ❌ Status: `down` if cluster not green or sys_registry missing
- ⚠️ Status: `degraded` if slow (>500ms response time)

### Dependency Status (`/health/deps`)

**Purpose:** Detailed breakdown of all dependencies

**Response:**
```json
{
  "status": "partial",
  "dependencies": {
    "redis": {
      "status": "up",
      "responseTime": "2ms",
      "info": {
        "host": "localhost",
        "port": 6379,
        "db": 0,
        "connectedClients": 5,
        "usedMemory": "1.2MB"
      }
    },
    "qdrant": {
      "status": "up",
      "responseTime": "15ms",
      "info": {
        "host": "localhost",
        "port": 6333,
        "version": "1.7.0",
        "collections": 5,
        "totalPoints": 1200
      }
    },
    "openai": {
      "status": "unknown",
      "message": "Not actively checked (API key validated on first use)"
    }
  }
}
```

**Status Codes:**
- `healthy` - All dependencies up
- `partial` - Some dependencies down, service degraded
- `unhealthy` - Critical dependencies down, service unavailable

## Health Check Workflow

### Kubernetes Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ragler-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: backend
        image: ragler-backend:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

**Configuration Explained:**
- **Liveness:**
  - Initial delay: 30s (allow app startup)
  - Period: 10s (check every 10s)
  - Timeout: 5s (mark unhealthy if no response)
  - Failure threshold: 3 (restart after 3 failures)
- **Readiness:**
  - Initial delay: 10s (faster than liveness)
  - Period: 5s (check more frequently)
  - Timeout: 3s (stricter timeout)
  - Failure threshold: 2 (remove from LB faster)

### Monitoring Integration

#### Prometheus Metrics

Health module exposes metrics for Prometheus scraping:

```
# HELP ragler_health_check_status Health check status (1 = up, 0 = down)
# TYPE ragler_health_check_status gauge
ragler_health_check_status{check="redis"} 1
ragler_health_check_status{check="qdrant"} 1

# HELP ragler_health_check_response_time_ms Health check response time in milliseconds
# TYPE ragler_health_check_response_time_ms gauge
ragler_health_check_response_time_ms{check="redis"} 2
ragler_health_check_response_time_ms{check="qdrant"} 15

# HELP ragler_health_check_failures_total Total number of health check failures
# TYPE ragler_health_check_failures_total counter
ragler_health_check_failures_total{check="redis"} 0
ragler_health_check_failures_total{check="qdrant"} 2
```

#### Alerting Rules (Prometheus)

```yaml
groups:
  - name: ragler_health
    rules:
      - alert: RedisDown
        expr: ragler_health_check_status{check="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"
          description: "RAGler cannot access Redis for {{ $value }} minutes"

      - alert: QdrantDown
        expr: ragler_health_check_status{check="qdrant"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Qdrant is down"
          description: "RAGler cannot access Qdrant for {{ $value }} minutes"

      - alert: HealthCheckSlow
        expr: ragler_health_check_response_time_ms > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Health check response time high"
          description: "{{ $labels.check }} response time is {{ $value }}ms"
```

## Error Handling

### Common Health Check Failures

| Failure | Cause | Resolution |
|---------|-------|------------|
| `Redis connection refused` | Redis not running | Start Redis: `docker compose up -d redis` |
| `Redis auth failed` | Wrong password | Check `REDIS_PASSWORD` env var |
| `Qdrant connection timeout` | Qdrant not running or slow | Start Qdrant: `docker compose up -d qdrant` |
| `sys_registry missing` | Collection not initialized | Initialize: `POST /collections/init` |
| `Cluster status yellow` | Qdrant degraded performance | Check Qdrant logs, increase resources |

### Graceful Degradation

**Partial Service Availability:**
- If Redis down → Cannot create new sessions, existing Qdrant data still searchable
- If Qdrant down → Cannot publish or search, draft editing still works (Redis only)
- Both down → Service completely unavailable

**Strategy:**
```typescript
if (redisHealth.status === 'down') {
  // Disable session creation, allow read-only operations
  app.setReadOnlyMode(true);
}

if (qdrantHealth.status === 'down') {
  // Disable publish and search, allow draft editing
  app.setPublishingEnabled(false);
  app.setSearchEnabled(false);
}
```

## Configuration

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `HEALTH_CHECK_TIMEOUT` | Max time for health check (ms) | `5000` |
| `HEALTH_CHECK_REDIS_ENABLED` | Enable Redis health check | `true` |
| `HEALTH_CHECK_QDRANT_ENABLED` | Enable Qdrant health check | `true` |
| `HEALTH_CHECK_CACHE_TTL` | Cache health results (ms) | `10000` (10s) |

### Health Check Caching

**Problem:** Health checks on every request are expensive

**Solution:** Cache health status for short period

**Implementation:**
```typescript
const healthCache = new Map();
const CACHE_TTL = 10000; // 10 seconds

async getHealth(): Promise<HealthStatus> {
  const cached = healthCache.get('status');

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.status;
  }

  const status = await this.performHealthChecks();
  healthCache.set('status', { status, timestamp: Date.now() });

  return status;
}
```

**Benefits:**
- ✅ Reduces load on Redis/Qdrant
- ✅ Faster response times
- ✅ Prevents health check storms

## Testing Strategy

### Unit Tests

**Location:** `test/unit/health/health.controller.spec.ts`

**Coverage:**
- Liveness probe always returns 200
- Readiness probe checks dependencies
- Health indicators detect failures
- Cache mechanism works correctly

**Key Test Cases:**
```typescript
describe('HealthController', () => {
  describe('Liveness', () => {
    it('should always return ok if process is alive');
  });

  describe('Readiness', () => {
    it('should return ok if all dependencies are up');
    it('should return error if Redis is down');
    it('should return error if Qdrant is down');
    it('should cache health status for 10 seconds');
  });

  describe('Indicators', () => {
    it('should detect Redis connection failure');
    it('should detect Qdrant cluster degradation');
    it('should detect missing sys_registry collection');
  });
});
```

### Integration Tests

**Location:** `test/app.e2e-spec.ts`

**Coverage:**
- Real Redis and Qdrant health checks
- Health endpoint integration with NestJS
- Kubernetes probe simulation

**Key Test Cases:**
```typescript
describe('Health E2E', () => {
  it('should return 200 for /health/live');
  it('should return 200 for /health/ready when dependencies are up');
  it('should return 503 for /health/ready when Redis is down');
  it('should return 503 for /health/ready when Qdrant is down');
  it('should return dependency details in /health/deps');
});
```

## Related Documentation

- [Product: Configuration Guide](/docs/getting-started/configuration) - Setting up health checks
- [Architecture: Observability](/docs/architecture/observability) - Logging and metrics
- [Architecture: Data Model](/docs/architecture/data-model) - Redis and Qdrant schemas
- [Architecture: System Design](/docs/architecture/system-design) - Infrastructure overview
