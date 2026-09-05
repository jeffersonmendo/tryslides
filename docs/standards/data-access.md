# Data Access

This document defines how this project accesses databases, external APIs, storage systems, and other persistence infrastructure.

The goal is to prevent infrastructure details from spreading through the application while keeping simple operations simple.

Data access boundaries should protect the application from meaningful infrastructure changes, not introduce layers for their own sake.

---

## 1. Infrastructure Must Have a Clear Boundary

Application code should not access persistence from arbitrary locations.

Avoid:

```text
Component
↓
Database

Hook
↓
Database

Random Helper
↓
External API
```

Prefer a controlled flow:

```text
UI
↓
Application Capability
↓
Data Access
↓
Infrastructure
```

For example:

```text
UI
↓
createPresentation()
↓
PresentationRepository
↓
Database
```

The exact layers depend on the complexity of the operation.

The important rule is that infrastructure access has a clear owner.

---

## 2. UI Does Not Access the Database

UI components should not know:

- which database is used
- database table names
- database SDKs
- SQL queries
- persistence schemas
- infrastructure credentials

Avoid:

```tsx
export function DeletePresentationButton({
  presentation_id,
}: Props) {
  async function handleDelete() {
    await supabase
      .from("presentations")
      .delete()
      .eq("id", presentation_id)
  }

  // ...
}
```

Prefer:

```tsx
<DeletePresentationButton
  onDelete={handleDelete}
/>
```

The component communicates user intent.

Another application boundary decides how that operation is performed.

See [`components.md`](./components.md).

---

## 3. Prefer Server-Side Data Access

Database and privileged infrastructure access should normally happen on the server.

Possible entry points include:

```text
Server Component
Server Action
Route Handler
Application Service
Repository
```

depending on the operation.

For example, a read may be as simple as:

```text
Server Component
↓
getPresentation()
↓
Database
```

while a complex mutation may require:

```text
Server Action
↓
Application Service
↓
Repository
↓
Database
```

Do not introduce client-side data access when the operation naturally belongs on the server.

For implementation details, consult the Next.js skill.

---

## 4. Use Repositories When They Protect a Meaningful Boundary

A repository is useful when application behavior should depend on a persistence capability rather than a specific implementation.

Example:

```ts
interface PresentationRepository {
  findById(id: string): Promise<Presentation | null>
  save(presentation: Presentation): Promise<void>
  delete(id: string): Promise<void>
}
```

Infrastructure can provide an implementation:

```ts
class SupabasePresentationRepository
  implements PresentationRepository {
  // ...
}
```

This allows the application to think in terms of:

```text
save presentation
```

instead of:

```text
update row in Supabase table
```

Repositories are especially useful when:

- persistence may have multiple implementations
- business logic needs to remain infrastructure-independent
- operations represent meaningful domain persistence
- testing benefits from replacing infrastructure
- provider-specific behavior should remain isolated

---

## 5. Do Not Require a Repository for Every Query

Repositories are not mandatory.

A simple server-side data-access function may be enough:

```ts
async function getUserById(id: string) {
  return database.user.findUnique({
    where: { id },
  })
}
```

If the function already provides a clear boundary and there is no meaningful abstraction to protect, adding:

```text
Action
↓
Service
↓
Repository
↓
Database
```

may only add ceremony.

Prefer:

> the smallest boundary that keeps responsibilities clear.

Introduce a repository when it provides architectural value, not because repositories appear in the standards.

---

## 6. Application Operations Should Hide Infrastructure Details

Callers should normally express application intent.

Prefer:

```ts
getPresentation()
savePresentation()
createSubscription()
uploadProjectAsset()
```

over exposing provider operations throughout the application:

```ts
querySupabasePresentation()
insertPostgresPresentation()
createStripeSubscription()
uploadToS3Bucket()
```

Provider-specific names are appropriate inside the infrastructure implementation itself.

Conceptually:

```text
Application
↓
Payment Capability
↓
Stripe

Application
↓
Storage Capability
↓
S3
```

This keeps provider knowledge near the integration boundary.

---

## 7. External APIs Follow the Same Principle

Third-party APIs are infrastructure.

Avoid spreading vendor SDK usage throughout features.

Instead of:

```text
Component → Provider
Action → Provider
Service → Provider
Hook → Provider
```

prefer:

```text
Application
↓
Integration Boundary
↓
Provider
```

For example:

```ts
interface EmailSender {
  sendPasswordReset(
    input: PasswordResetEmail,
  ): Promise<void>
}
```

An implementation may use Resend without requiring the rest of the application to know that.

Do not create an interface for every third-party function automatically.

Create a boundary when hiding the provider protects the application.

---

## 8. Map External Representations at Boundaries

Database rows and external API responses do not always need to become the application's internal model.

For example:

```text
Database Row
↓
Mapper / Repository
↓
Application Model
```

may be useful when persistence and application representations differ.

Likewise:

```text
External API Response
↓
Validation
↓
Mapping
↓
Application Model
```

prevents external contracts from spreading through internal code.

Do not create mapping layers when both representations are intentionally identical and separating them provides no benefit.

---

## 9. Reads and Mutations May Have Different Complexity

Do not force reads and writes through identical architecture.

A simple read may be:

```text
Server Component
↓
Data Access
↓
Database
```

while an important mutation may be:

```text
Server Action
↓
Validation
↓
Application Operation
↓
Business Rules
↓
Repository
↓
Database
```

This is acceptable.

Architecture should reflect responsibility and risk rather than visual symmetry.

---

## 10. Mocks and Alternative Implementations

When a real persistence boundary exists, alternative implementations may be useful.

Example:

```text
PresentationRepository
├── SupabasePresentationRepository
├── IndexedDbPresentationRepository
└── MemoryPresentationRepository
```

The application can then use the same capability with different infrastructure.

Mocks and in-memory implementations should remain deterministic and should not leak test-specific behavior into production code.

Do not create alternate implementations merely to demonstrate that an interface can have multiple implementations.

They should exist because the project actually needs them.

---

## 11. Data Access Must Respect Ownership

Feature-specific persistence should normally remain with the feature that owns the data behavior.

Example:

```text
features/
└── presentations/
    └── repositories/
        └── presentation-repository.ts
```

Shared infrastructure configuration may live in an application-level infrastructure location:

```text
lib/
└── database/
```

The database client may be shared infrastructure.

The meaning of a `Presentation`, however, belongs to the presentations capability.

Do not turn the database layer into the owner of the application's domain model.

---

## 12. Do Not Leak Infrastructure Errors

Provider-specific failures should be translated when they cross into application or presentation boundaries.

Avoid requiring UI code to understand:

```text
PostgreSQL error codes
Supabase errors
Stripe SDK exceptions
storage provider errors
```

The infrastructure layer may preserve the original error for logging while exposing an application-appropriate error to higher layers.

See [`errors.md`](./errors.md) for error conventions.

---

## 13. Security and Authorization

Data access must not rely on client behavior as the security boundary.

Protected operations must verify required authorization on the trusted server side.

Client UI may hide unavailable actions for user experience:

```tsx
{can_delete && <DeleteButton />}
```

but this does not replace server authorization.

Conceptually:

```text
Client request
↓
Server boundary
↓
Authorization
↓
Application operation
↓
Persistence
```

Never trust a client-provided identifier, role, price, permission, or ownership claim simply because the UI generated it.

---

## 14. Choosing the Right Data Access Structure

Use the simplest structure that satisfies the application's needs.

### Simple

```text
Server Component
↓
Data Access Function
↓
Database
```

### With Application Coordination

```text
Server Action
↓
Service
↓
Data Access
```

### Infrastructure-Independent Core

```text
Application/Core
↓
Repository Contract
↑
Repository Implementation
↓
Database
```

None of these is universally correct.

Choose based on:

- business complexity
- infrastructure volatility
- testing requirements
- reuse
- ownership
- number of implementations
- expected change

The architecture selected for a specific product belongs in `/docs/project/architecture.md`.

---

## Core Principle

The application should depend on the capability it needs, not unnecessarily on the technology that provides it.

At the same time:

> Do not hide infrastructure behind abstractions that provide no meaningful value.

Good data access architecture balances **isolation and simplicity**.

---

## Related Standards

- [Architecture](./architecture.md) — dependency direction and infrastructure boundaries.
- [Components](./components.md) — UI must remain infrastructure-independent.
- [Server and Client](./server-client.md) — where privileged data access executes.
- [Modules](./modules.md) — ownership of repositories and integrations.
- [Validation](./validation.md) — validating external data.
- [Errors](./errors.md) — translating infrastructure failures.
- [Testing](./testing.md) — testing persistence boundaries.