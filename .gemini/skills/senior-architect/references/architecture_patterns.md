# Architecture Patterns

Reference guide for common architectural patterns, their trade-offs, and when to use them.

## 1. Layered Architecture (n-tier)
The most common and default pattern for many applications.

**Structure:**
- **Presentation Layer:** UI, Controllers, Handlers
- **Application Layer:** Business Logic, Services
- **Domain Layer:** Models, Entities, Logic
- **Infrastructure Layer:** DB access, Gateways, Clients

**Trade-offs:**
- ✅ Simple to understand and implement
- ✅ Clear separation of concerns
- ❌ Can lead to "sinkhole" layers
- ❌ Hard to test in isolation if not careful

**When to use:**
- Small to medium applications
- Teams new to architectural patterns
- Projects with clear horizontal separation

... (rest of the file content from fetched content)
