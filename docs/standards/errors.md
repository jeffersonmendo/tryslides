# Errors

This document defines how errors should be represented, propagated, translated, and exposed in this project.

The goal is to make failures predictable without coupling internal application logic to HTTP responses, UI messages, database errors, or external providers.

Errors should preserve useful context internally while exposing only the information appropriate for each boundary.

---

## 1. Errors Belong to Different Layers

Not every error should have the same representation.

A failure may originate from:

```text
Database
External Provider
Validation
Authorization
Business Rule
Application Operation
Framework
```

and eventually reach:

```text
UI
API
Server Action
Log
```

These consumers have different needs.

Conceptually:

```text
Infrastructure Error
↓
Application Error
↓
Boundary Response
↓
UI / API Consumer
```

Do not expose infrastructure failures directly simply because they are the original error.

---

## 2. Use Application Errors for Meaningful Failures

When a failure represents something the application understands, give it an application-level meaning.

Examples:

```text
NOT_FOUND
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
CONFLICT
RATE_LIMITED
INTERNAL_ERROR
```

A project may define additional domain-specific codes:

```text
SUBSCRIPTION_ALREADY_ACTIVE
WORKSPACE_LIMIT_REACHED
PRESENTATION_NOT_EDITABLE
```

Codes should be stable identifiers that application code can reason about.

Avoid making application behavior depend on matching human-readable error messages.

Prefer:

```ts
if (error.code === "WORKSPACE_LIMIT_REACHED") {
  // ...
}
```

over:

```ts
if (error.message === "You reached your workspace limit") {
  // ...
}
```

Messages are for humans.

Codes are for application behavior.

---

## 3. Internal Errors Do Not Need API Response Shapes

Internal functions should return values or throw/return meaningful errors according to their responsibility.

Do not require every internal operation to return:

```ts
{
  success: true,
  message: "...",
  code: "...",
  error: null,
  status: 200,
}
```

For example, an internal capability may simply return:

```ts
async function getPresentation(
  id: string,
): Promise<Presentation> {
  // ...
}
```

and fail with an application error when necessary.

The transport or application boundary can decide how that failure should be represented externally.

This keeps internal logic independent from HTTP and UI concerns.

---

## 4. Boundary Responses Should Be Consistent

When an application boundary needs a structured response, use a predictable contract.

A default project response may follow:

```ts
type AppResponse<T> =
  | {
      success: true
      message: string
      code: string
      error: null
      status: number
      data: T
    }
  | {
      success: false
      message: string
      code: string
      error: AppResponseError | null
      status: number
      data: null
    }
```

Example success:

```ts
{
  success: true,
  message: "Presentation created successfully.",
  code: "PRESENTATION_CREATED",
  error: null,
  status: 201,
  data: presentation,
}
```

Example failure:

```ts
{
  success: false,
  message: "Presentation not found.",
  code: "PRESENTATION_NOT_FOUND",
  error: null,
  status: 404,
  data: null,
}
```

The exact response contract may be extended by a project when necessary.

Project-specific changes belong in `/docs/project/architecture.md` or `/docs/project/decisions.md`.

---

## 5. Keep Status Separate From Error Meaning

HTTP status and application error code represent different concepts.

For example:

```text
status: 404
code: PRESENTATION_NOT_FOUND
```

or:

```text
status: 409
code: SUBSCRIPTION_ALREADY_ACTIVE
```

The status describes the transport-level category.

The code describes the application-level condition.

Do not use HTTP status codes as the only representation of business failures.

Likewise, internal business logic should not depend unnecessarily on HTTP concepts.

Prefer:

```text
Application Error
↓
Boundary maps error
↓
HTTP status
```

rather than:

```text
Business Logic
↓
throws HTTP 409
```

---

## 6. Translate Infrastructure Errors

Infrastructure errors should normally be translated before reaching higher layers.

Example:

```text
PostgreSQL unique violation
↓
Repository / Infrastructure Boundary
↓
EMAIL_ALREADY_EXISTS
↓
Application Boundary
↓
User-appropriate response
```

The UI should not need to understand:

```text
PostgreSQL error codes
Supabase error objects
Stripe exceptions
Resend failures
Storage provider errors
```

Provider-specific information may still be preserved internally for debugging and logging.

Translation prevents infrastructure details from becoming application contracts.

---

## 7. Preserve the Original Cause When Useful

Translating an error does not mean destroying diagnostic information.

When supported and appropriate:

```ts
throw new AppError(
  "PAYMENT_PROVIDER_ERROR",
  "Unable to process payment.",
  {
    cause: error,
  },
)
```

This allows the application to expose a stable error while retaining the original failure for observability.

Do not expose the original cause directly to users when it contains:

- internal implementation details
- stack traces
- database information
- provider payloads
- secrets
- sensitive identifiers

Internal diagnostics and public errors serve different purposes.

---

## 8. User Messages and Developer Details Are Different

An error may contain information useful to developers but inappropriate for users.

Internal:

```text
Stripe request failed:
payment_method pm_123...
request_id req_...
```

User-facing:

```text
We couldn't process the payment.
Please try again.
```

Do not use raw exception messages as user-facing copy by default.

User-facing messages should be:

- understandable
- actionable when possible
- safe to expose
- appropriate for the interface

Detailed technical information belongs in logs or observability systems.

---

## 9. Expected and Unexpected Errors

Distinguish failures the application expects from failures that indicate an unexpected problem.

Expected examples:

```text
resource not found
invalid input
permission denied
duplicate resource
business rule rejected
```

Unexpected examples:

```text
database unavailable
unhandled provider failure
programming error
unexpected invariant violation
```

Expected errors should normally have stable application codes.

Unexpected failures should generally become a safe generic boundary error:

```text
INTERNAL_ERROR
```

while preserving diagnostic information internally.

Do not invent a specific business error when the application does not actually know what failed.

---

## 10. Validation Errors Should Preserve Useful Structure

Validation failures may need field-level information.

Example:

```ts
{
  success: false,
  message: "Some fields are invalid.",
  code: "VALIDATION_ERROR",
  status: 400,
  error: {
    fields: {
      email: ["Invalid email address"],
      title: ["Title is required"],
    },
  },
  data: null,
}
```

This allows UI code to display useful feedback without depending directly on Zod's internal error representation.

Conceptually:

```text
Zod Error
↓
Validation Boundary
↓
Application Validation Error
↓
UI
```

Do not expose validation-library internals as a permanent application API unless intentionally designed that way.

---

## 11. Error Handling Should Happen at Meaningful Boundaries

Do not wrap every function in `try/catch`.

Avoid:

```ts
async function getUser() {
  try {
    return await repository.getUser()
  } catch (error) {
    throw error
  }
}
```

This adds no behavior.

Catch an error when the current layer can meaningfully:

- translate it
- recover from it
- add useful context
- retry appropriately
- log it at the correct boundary
- convert it into a response

Otherwise, allow it to propagate to the layer responsible for handling it.

---

## 12. Do Not Silently Swallow Errors

Avoid:

```ts
try {
  await savePresentation()
} catch {
  return null
}
```

unless `null` intentionally represents that failure in the function's contract.

Silent failures make debugging difficult and can create inconsistent application state.

If an error is intentionally ignored, the reason should be clear.

Example:

```ts
try {
  await sendAnalyticsEvent()
} catch (error) {
  logger.warn("Analytics event failed", {
    error,
  })
}
```

The failure is intentionally non-blocking, but it is not invisible.

---

## 13. Logging Is Not Error Handling

Logging an error does not mean the application has handled it.

Avoid:

```ts
catch (error) {
  console.error(error)
}
```

when the caller still needs to know the operation failed.

Decide separately:

```text
Should this be logged?
Should this propagate?
Should this be translated?
Can the operation recover?
What should the caller receive?
```

Observability and control flow are related but distinct responsibilities.

---

## 14. Error Boundaries Should Match Responsibility

Different boundaries may represent the same application error differently.

For example:

```text
Application Error
PRESENTATION_NOT_FOUND
```

may become:

```text
Route Handler
→ HTTP 404 response
```

or:

```text
Server Action
→ structured AppResponse
```

or:

```text
Server-rendered page
→ not-found UI
```

or:

```text
Client interaction
→ toast / inline message
```

The underlying meaning remains stable while presentation changes according to the boundary.

---

## Core Principle

> Errors should become more meaningful as they move inward and safer as they move outward.

Infrastructure errors should not define application behavior.

Application errors should represent conditions the product understands.

Boundary responses should translate those conditions into the format required by the consumer.

Keep these responsibilities separate:

```text
Cause
↓
Application Meaning
↓
Boundary Representation
↓
User Presentation
```

---

## Related Standards

- [Validation](./validation.md) — validation failures and boundary validation.
- [Data Access](./data-access.md) — infrastructure error translation.
- [Server and Client](./server-client.md) — server error boundaries.
- [Functions](./functions.md) — propagation and meaningful error handling.
- [TypeScript](./typescript.md) — typed result and error contracts.
- [Architecture](./architecture.md) — responsibility boundaries.