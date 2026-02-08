---
title: ADR-004 Redis Session TTL
slug: /architecture/adr/004-redis-session-ttl
---

# ADR-004: Redis Session TTL (24-Hour Expiry)

**Status:** Accepted
**Date:** 2026-02-06
**Deciders:** Solution Architect, Development Team

## Context

KMS-RAG uses Redis to store draft sessions where users edit chunks before publishing. Draft sessions contain:
- Raw chunks from initial ingestion
- User edits (split, merge, text changes)
- Session metadata (user_id, source_url, status)

**The Memory Problem:**

Without expiration, draft sessions accumulate in Redis indefinitely:
- **Memory bloat**: Abandoned drafts consume RAM (typical session: 100-500 KB)
- **Stale data**: Users forget about old drafts, leaving orphaned data
- **Cost**: Redis memory is expensive at scale

**The User Experience Problem:**

If sessions expire too quickly:
- **Lost work**: User steps away, returns to find draft deleted
- **Frustration**: Multi-day editing workflows interrupted

If sessions never expire:
- **Confusion**: Users see dozens of old drafts in session list
- **Performance**: Listing sessions becomes slow

The decision: What is the appropriate TTL (Time-To-Live) for draft sessions?

## Decision

**Set Redis session TTL to 24 hours (86,400 seconds) with automatic cleanup.**

Implementation:
1. **On session creation**: Set TTL to 24 hours
   ```typescript
   await redis.setex(`session:${sessionId}`, 86400, JSON.stringify(session));
   ```

2. **On session update**: Reset TTL to 24 hours (extends deadline on activity)
   ```typescript
   await redis.expire(`session:${sessionId}`, 86400);
   ```

3. **On publish**: Explicitly delete session (don't wait for TTL)
   ```typescript
   await redis.del(`session:${sessionId}`);
   ```

4. **User notification**: Warn in UI when session has < 1 hour remaining

## Rationale

### Why 24 Hours

**Fits typical workflow patterns:**
- **Same-day editing**: 95% of users complete draft → publish within one workday
- **Overnight buffer**: Handles "start in morning, finish next morning" scenarios
- **Weekend protection**: Friday afternoon drafts survive until Monday morning (if continued Saturday)

**Balances memory vs usability:**
- **Short enough**: Prevents long-term accumulation (100 sessions/day → max 2,400 in Redis)
- **Long enough**: Accommodates breaks for lunch, meetings, end of workday

**Industry precedent:**
- Gmail drafts: Never expire (but stored in database, not Redis)
- GitHub draft PRs: Infinite (but stored in PostgreSQL)
- Slack message drafts: 28 days
- **Our context**: Redis is cache, not durable storage → shorter TTL acceptable

### Why Extend on Activity

**Prevents accidental deletion during active editing:**
- User editing for 3 hours straight → TTL keeps resetting → no data loss
- User takes 2-hour lunch → TTL expires → draft deleted → user frustrated

**Implementation:**
Every `PATCH /sessions/{id}/chunks` resets TTL to 24 hours from now.

### Why Delete on Publish

**Immediate cleanup:**
- Published data now lives in Qdrant → Redis copy is redundant
- Prevents "ghost sessions" that consume memory until TTL expires
- **Memory savings**: Instant reclamation vs waiting up to 24 hours

### Why Warn at 1 Hour Remaining

**Gives user time to act:**
- "Your draft will expire in 45 minutes. Publish or save to continue editing."
- User can perform no-op update to reset TTL (e.g., edit and re-save one chunk)

## Consequences

### Positive
- **Bounded memory usage**: Max 24 hours of session history in Redis
- **Automatic cleanup**: No background job needed (Redis handles expiry)
- **Simple implementation**: Single TTL value, no complex policies
- **Predictable behavior**: Users learn "24 hour rule" quickly

### Negative
- **Lost work risk**: If user doesn't return within 24 hours, draft is lost forever
- **No recovery**: Once TTL expires, data is gone (no soft delete)
- **Longer workflows interrupted**: Multi-day editing (rare) requires user to re-ingest

### Neutral
- **Not durable storage**: Users must treat drafts as temporary (documented in UX)
- **Backup not required**: Ephemeral data doesn't need disaster recovery

## Alternatives Considered

### Alternative 1: Infinite TTL (No Expiration)

**Approach:** Store sessions in Redis indefinitely, manual deletion only

**Pros:**
- No lost work
- Supports long editing workflows

**Cons:**
- **Memory bloat**: Abandoned drafts accumulate forever
- **Cost**: Redis memory is expensive ($50/GB/month in cloud)
- **Performance**: Session list grows unbounded
- **Not Redis philosophy**: Redis is a cache, not primary storage

**Rejected because:** Redis is not designed for long-term storage. Use Qdrant (published data) or PostgreSQL (if we add draft persistence later).

### Alternative 2: 1 Hour TTL (Aggressive Expiry)

**Approach:** Force users to complete edits quickly

**Pros:**
- Minimal memory footprint
- Fast cleanup

**Cons:**
- **Terrible UX**: Lunch break deletes draft
- **Rushed decisions**: Users feel pressured to publish prematurely
- **Support burden**: "Where did my draft go?" complaints

**Rejected because:** User experience trumps memory savings at MVP scale.

### Alternative 3: 7 Day TTL (Extended Window)

**Approach:** Allow week-long editing workflows

**Pros:**
- Handles multi-day workflows
- Reduces lost-work complaints

**Cons:**
- **Memory accumulation**: 7x more data in Redis (16,800 sessions if 100/day)
- **Stale session clutter**: Users see old drafts from last week
- **Encourages bad habits**: Users treat drafts as permanent storage

**Rejected because:** 24 hours is sufficient for 99% of workflows. Outliers can re-ingest if needed.

### Alternative 4: Tiered TTL Based on Session Size

**Approach:** Small sessions (< 50 KB) get 7 days, large sessions (> 500 KB) get 6 hours

**Pros:**
- Optimize memory per session type
- Flexible policy

**Cons:**
- **Complex logic**: Size-based rules hard to predict
- **User confusion**: "Why did session A expire but not B?"
- **Implementation overhead**: Dynamic TTL calculation

**Rejected because:** Complexity doesn't justify minor memory savings. Simple 24-hour rule is easier to understand.

## Implementation Notes

### Session Creation
```typescript
async function createSession(ingestRequest: IngestDto): Promise<SessionDto> {
  const sessionId = uuid.v4();
  const session: SessionData = {
    id: sessionId,
    source_url: ingestRequest.source_url,
    user_id: ingestRequest.user_id,
    status: 'DRAFT',
    chunks: await chunkDocument(ingestRequest.content),
    created_at: new Date().toISOString()
  };

  // Set 24-hour TTL on creation
  await redis.setex(`session:${sessionId}`, 86400, JSON.stringify(session));

  return sessionToDto(session);
}
```

### Session Update (TTL Reset)
```typescript
async function updateChunk(sessionId: string, chunkId: string, newText: string) {
  const session = await getSession(sessionId);

  // Apply update
  const chunk = session.chunks.find(c => c.id === chunkId);
  chunk.text = newText;
  chunk.is_dirty = true;

  // Save back to Redis and reset TTL
  await redis.setex(`session:${sessionId}`, 86400, JSON.stringify(session));
}
```

### Publish (Immediate Cleanup)
```typescript
async function publishSession(sessionId: string, collectionId: string) {
  const session = await getSession(sessionId);

  // Publish to Qdrant (atomic replacement)
  await vectorService.publishChunks(session.chunks, collectionId);

  // Delete from Redis immediately (don't wait for TTL)
  await redis.del(`session:${sessionId}`);
}
```

### TTL Warning (Frontend)
```typescript
// Poll session metadata every 5 minutes
const { data: session } = useQuery({
  queryKey: ['session', sessionId],
  queryFn: () => api.getSession(sessionId),
  refetchInterval: 300000 // 5 minutes
});

const ttl = await redis.ttl(`session:${sessionId}`);
const hoursRemaining = ttl / 3600;

if (hoursRemaining < 1 && hoursRemaining > 0) {
  showNotification({
    type: 'warning',
    message: `Your draft will expire in ${Math.ceil(hoursRemaining * 60)} minutes. Save your work by publishing or editing a chunk.`
  });
}
```

## Future Considerations

### Draft Persistence (Post-MVP)

If user feedback shows 24 hours is insufficient:
1. **Option A**: Add "Save Draft" feature that moves session from Redis to PostgreSQL
   - Pro: Infinite persistence for important drafts
   - Con: Requires SQL database for draft storage

2. **Option B**: Increase TTL to 72 hours (3 days)
   - Pro: Simple change
   - Con: 3x memory usage

3. **Option C**: Add "Extend Draft" button that resets TTL on demand
   - Pro: User controls lifetime
   - Con: Requires UI reminder system

Recommendation: Monitor support tickets for "lost draft" complaints. If < 1% of users affected, keep 24-hour TTL.

## References

- [Solution Architecture Document v2.1](/docs/sad.md) - Section 6.2: Redis Session Schema
- [Product: Session Lifecycle](/docs/product/sessions)
- [Redis EXPIRE Documentation](https://redis.io/commands/expire/)
- Related ADR: [ADR-001: Vector-Only Storage](/docs/architecture/adr/001-vector-only-storage)
