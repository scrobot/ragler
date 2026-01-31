---
trigger: always_on
glob: "**/*.ts"
description: Code style and best practices for TypeScript/NestJS
---

# Code Style Guide

## Naming Conventions

### Files & Folders
```
kebab-case.ts           → all file names
user.controller.ts      → controllers
user.service.ts         → services
user.module.ts          → modules
user.dto.ts             → DTOs
user.entity.ts          → entities
user.interface.ts       → interfaces
user.spec.ts            → tests
```

### Code Identifiers
```typescript
PascalCase    → classes, interfaces, types, enums
camelCase     → variables, functions, methods, properties
SCREAMING_CASE → constants, enum values
```

### Booleans
Prefix with `is`, `has`, `can`, `should`:
```typescript
// Good
const isActive = true;
const hasPermission = user.role === 'admin';
const canEdit = mode === 'advanced';

// Bad
const active = true;
const permission = true;
```

---

## TypeScript

### Explicit Types
Always use explicit types. Avoid `any`.
```typescript
// Good
function getUser(id: string): Promise<User> { }
const items: Item[] = [];

// Bad
function getUser(id): any { }
const items = [];
```

### Use Zod for Runtime Validation
```typescript
// DTOs with Zod
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
```

### Prefer `interface` for Object Shapes
```typescript
// Good — use interface for object shapes
interface User {
  id: string;
  email: string;
}

// Use type for unions, intersections, mapped types
type Status = 'draft' | 'published' | 'archived';
type WithTimestamps<T> = T & { createdAt: Date; updatedAt: Date };
```

### Avoid Type Assertions
```typescript
// Bad
const user = data as User;

// Good — validate instead
const user = UserSchema.parse(data);
```

---

## Functions & Methods

### Single Responsibility
One function = one task. If you need "and" to describe it, split it.

### Keep Functions Small
Aim for < 20 lines. Extract helpers for complex logic.

### Early Returns
Reduce nesting with guard clauses:
```typescript
// Good
function processUser(user: User | null): Result {
  if (!user) {
    return { error: 'User not found' };
  }
  if (!user.isActive) {
    return { error: 'User inactive' };
  }
  return { data: transform(user) };
}

// Bad
function processUser(user: User | null): Result {
  if (user) {
    if (user.isActive) {
      return { data: transform(user) };
    } else {
      return { error: 'User inactive' };
    }
  } else {
    return { error: 'User not found' };
  }
}
```

### Descriptive Names
```typescript
// Good
async function fetchUserById(id: string): Promise<User> { }
function calculateTotalPrice(items: Item[]): number { }

// Bad
async function get(id: string) { }
function calc(items: Item[]) { }
```

---

## Error Handling

### Use NestJS Exceptions
```typescript
import { NotFoundException, BadRequestException } from '@nestjs/common';

// Good
if (!user) {
  throw new NotFoundException(`User ${id} not found`);
}

// Bad
if (!user) {
  throw new Error('not found');
}
```

### Never Swallow Errors
```typescript
// Bad
try {
  await riskyOperation();
} catch (e) {
  // silent fail
}

// Good
try {
  await riskyOperation();
} catch (error) {
  this.logger.error('Operation failed', { error, context });
  throw new InternalServerErrorException('Operation failed');
}
```

---

## Async/Await

### Always Use async/await
```typescript
// Good
async function getUsers(): Promise<User[]> {
  const users = await this.repository.find();
  return users;
}

// Bad — avoid raw promises
function getUsers(): Promise<User[]> {
  return this.repository.find().then(users => users);
}
```

### Parallel When Possible
```typescript
// Good — parallel execution
const [users, posts] = await Promise.all([
  this.userService.findAll(),
  this.postService.findAll(),
]);

// Bad — sequential when not needed
const users = await this.userService.findAll();
const posts = await this.postService.findAll();
```

---

## NestJS Specific

### Dependency Injection
```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: LoggerService,
  ) {}
}
```

### Controller Structure
```typescript
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }
}
```

### Service Methods
- Return DTOs or domain objects, not raw database entities
- Keep business logic in services, not controllers
- One public method = one use case

---

## Imports

### Order
```typescript
// 1. Node built-ins
import { readFile } from 'fs/promises';

// 2. External packages
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

// 3. Internal modules (absolute paths)
import { UserService } from '@/modules/user/user.service';

// 4. Relative imports
import { CreateUserDto } from './dto/create-user.dto';
```

### No Barrel Imports in Same Module
```typescript
// Bad — circular dependency risk
import { UserService } from './index';

// Good
import { UserService } from './user.service';
```

---

## Comments

### When to Comment
- Complex business logic that isn't obvious
- Workarounds with links to issues
- Public API documentation (JSDoc)

### When NOT to Comment
- Obvious code
- Commented-out code (delete it)
- TODOs without ticket references

```typescript
// Bad
// increment counter
counter++;

// Good
// Retry limit based on SLA requirements (see JIRA-123)
const MAX_RETRIES = 3;
```

---

## Formatting

### Handled by Prettier
- 2 space indentation
- Single quotes
- Trailing commas
- 100 char line width

Run `pnpm format` before committing.
