# Validation

This document defines how runtime validation should be handled in this project.

The goal is to validate data when it enters a trusted application boundary, keep invalid external data from spreading internally, and avoid unnecessary repeated validation.

Zod is the preferred schema-validation library when runtime validation is required.

---

## 1. Validate at System Boundaries

Data coming from outside the trusted application should be treated as unknown until validated.

Common boundaries include:

- forms
- Route Handlers
- Server Actions
- URL parameters and search parameters
- webhooks
- external APIs
- environment variables
- AI tool inputs
- imported or uploaded data

Conceptually:

```text id="4luf82"
External Input
↓
Validation
↓
Trusted Typed Data
↓
Application Logic
```

Example:

```ts id="un2nq3"
const create_user_schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

const result = create_user_schema.safeParse(input)

if (!result.success) {
  return handleValidationError(result.error)
}

await createUser(result.data)
```

Once the application has established a trusted representation, do not repeatedly validate the same data without a meaningful reason.

---

## 2. TypeScript Does Not Replace Runtime Validation

TypeScript describes compile-time expectations.

It does not guarantee that external runtime data matches those expectations.

This is unsafe:

```ts id="h38p3p"
const body = await request.json() as CreateUserInput

await createUser(body)
```

The assertion does not validate the request.

Prefer:

```ts id="id7n8x"
const body: unknown = await request.json()

const input = create_user_schema.parse(body)

await createUser(input)
```

The application should move from:

```text id="11k5aq"
unknown
↓
validated
↓
typed
```

rather than:

```text id="rxuepr"
unknown
↓
type assertion
↓
assumed safe
```

---

## 3. Keep Schemas With Their Owner

Schemas should normally live with the feature or capability that owns the input.

Example:

```text id="63qgdr"
features/
└── presentations/
    └── schemas/
        ├── create-presentation.ts
        └── update-presentation.ts
```

A schema used by only one cohesive operation may also remain close to that operation when a separate file provides no value.

Do not create a global schema directory containing unrelated application schemas.

Shared schemas are appropriate when the underlying contract is genuinely shared.

---

## 4. Derive Types From Schemas When They Represent the Same Contract

When a Zod schema is the runtime source of truth for an input, derive its TypeScript type when appropriate.

```ts id="m8w99j"
export const create_presentation_schema = z.object({
  title: z.string().min(1),
  is_public: z.boolean(),
})

export type CreatePresentationInput =
  z.infer<typeof create_presentation_schema>
```

Avoid maintaining this separately:

```ts id="20y0zb"
type CreatePresentationInput = {
  title: string
  is_public: boolean
}
```

when both definitions intentionally represent the exact same contract.

However, do not derive unrelated application models from input schemas merely because their current shapes happen to match.

An input contract and a domain model may represent different concepts.

---

## 5. Validation Is Not Business Logic

Validation answers questions such as:

```text id="8qxsrk"
Is this value present?
Is this an email?
Is this one of the accepted values?
Does this object have the expected shape?
Is this string within an accepted input length?
```

Business rules answer questions such as:

```text id="gv31qs"
Can this user publish this presentation?
Can this subscription be cancelled?
Is this discount available to this customer?
Can this project accept another member?
```

Do not hide important business behavior inside large Zod refinements merely because the input already passes through a schema.

For example, structural validation may establish:

```ts id="cp8jzx"
const invite_schema = z.object({
  workspace_id: z.string().uuid(),
  email: z.string().email(),
})
```

while application logic determines:

```ts id="hz4mub"
const can_invite = await canInviteMember(
  workspace_id,
  current_user,
)
```

Keep responsibilities distinct.

---

## 6. Validation Is Not Authorization

Valid input does not mean an operation is permitted.

A request may be perfectly valid:

```ts id="v67dql"
{
  presentation_id: "presentation_123"
}
```

while the current user still has no permission to delete that presentation.

Protected operations should follow a flow such as:

```text id="97zb8h"
Input
↓
Validation
↓
Authentication / Authorization
↓
Application Operation
↓
Persistence
```

The exact order may vary when authorization requires validated identifiers, but both responsibilities must exist where required.

Client-side permission checks do not replace server-side authorization.

---

## 7. Client Validation Improves UX, Server Validation Protects the Boundary

Client-side validation can provide immediate feedback.

For example:

```text id="s6h5yu"
User types invalid email
↓
Form displays feedback
```

This improves the user experience.

It does not make the server input trustworthy.

For protected mutations:

```text id="vznogf"
Client Validation
↓
User Experience

Server Validation
↓
Trusted Boundary
```

The server must still validate untrusted input when correctness or security depends on it.

Where practical, the same schema may be reused across both environments if the contract is genuinely identical.

---

## 8. Validate External Services

Responses from third-party services should not automatically be trusted simply because they come from an SDK or API.

Validation may be useful when:

- the response is loosely typed
- the provider contract is unstable
- the data enters important business logic
- webhook payloads require verification and parsing
- the application stores the external data
- the provider returns unknown or user-controlled content

Conceptually:

```text id="p9b2em"
External Provider
↓
Verification / Validation
↓
Mapping
↓
Application Model
```

Do not add runtime schemas around every strongly typed library response when they provide no meaningful protection.

---

## 9. Validate Environment Configuration Early

Required application configuration should fail clearly when invalid or missing.

Instead of allowing:

```text id="n51xxl"
Missing configuration
↓
Application starts
↓
Unrelated feature executes
↓
Unexpected failure
```

prefer:

```text id="e9jyr5"
Application configuration
↓
Validation
↓
Known valid configuration
```

Example:

```ts id="92fxi0"
const env_schema = z.object({
  DATABASE_URL: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
})
```

Environment validation must also respect server/client boundaries.

A validated secret is still a secret and must not be exposed to client code.

---

## 10. Normalize at the Boundary When Appropriate

Validation may also normalize external representations into the form expected internally.

Example:

```ts id="2b2bgl"
const email_schema = z
  .string()
  .email()
  .transform((value) => value.trim().toLowerCase())
```

Conceptually:

```text id="h3cbsn"
External Representation
↓
Validation / Normalization
↓
Stable Internal Input
```

Normalization should be predictable.

Do not hide significant business transformations inside validation schemas.

---

## 11. Return Useful Validation Errors

Validation failures should be translated into errors appropriate for the caller.

A form may need field-level information:

```text id="nxq0e5"
email → Invalid email address
title → Required
```

An API may require a structured application error.

Internal logs may require more diagnostic detail.

Do not expose raw validation-library internals to users unless that representation is intentionally part of the application contract.

Error representation is defined further in [`errors.md`](./errors.md).

---

## 12. Avoid Validation Everywhere

Validation has value at trust boundaries.

It becomes noise when every internal function revalidates already trusted data.

Avoid:

```text id="itpl24"
Server Action
↓ validate

Service
↓ validate again

Repository
↓ validate again

Database Mapper
↓ validate same input again
```

unless each boundary represents a genuinely different contract or trust level.

Prefer:

```text id="3apb2p"
External Input
↓
Validate Once
↓
Trusted Application Input
↓
Internal Operations
```

Additional validation is appropriate when data crosses another untrusted boundary or changes into a different contract.

---

## Core Principle

> Validate where trust changes.

Use runtime schemas to protect application boundaries.

Use TypeScript to maintain type safety inside those boundaries.

Use business logic to enforce product rules.

Use authorization to determine whether an operation is permitted.

These responsibilities may work together, but they should not be confused.

---

## Related Standards

- [TypeScript](./typescript.md) — compile-time type safety.
- [Server and Client](./server-client.md) — trusted server boundaries.
- [Data Access](./data-access.md) — validating external and persisted data.
- [Functions](./functions.md) — function input contracts.
- [Errors](./errors.md) — representing validation failures.
- [Architecture](./architecture.md) — responsibility boundaries.