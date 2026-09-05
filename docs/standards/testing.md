# Testing

This document defines how testing should be approached in this project.

The goal is to protect important behavior, business rules, and application boundaries while keeping tests maintainable and proportional to the risk of the code.

Tests should increase confidence in the product.

They should not exist only to increase a coverage percentage.

---

## 1. Test Behavior, Not Implementation Details

Prefer tests that describe what the application should do.

For example:

```ts
expect(
  calculateSubscriptionPrice({
    plan: "pro",
    billing_period: "yearly",
  }),
).toBe(90)
```

The test cares about the result of the business behavior.

Avoid tests that depend unnecessarily on:

- private helper calls
- internal variable names
- exact internal function order
- implementation-specific component structure
- details that users and callers cannot observe

A refactor that preserves behavior should not require rewriting unrelated tests.

---

## 2. Prioritize Tests by Risk

Not every line of code deserves the same testing effort.

Prioritize behavior where failure would have meaningful consequences.

Examples include:

- payments
- permissions
- authentication behavior
- pricing
- business rules
- data transformations
- destructive operations
- persistence behavior
- complex editor operations
- important user workflows

A simple presentational wrapper may require little or no dedicated testing.

A subscription calculation may require extensive testing.

Testing effort should follow product risk and complexity.

---

## 3. Unit Test Deterministic Logic

Unit tests are especially useful for logic that can run independently from infrastructure.

Examples:

```text
calculatePrice()
canDeleteWorkspace()
normalizePresentation()
applyDiscount()
buildPagination()
```

Prefer testing these functions directly.

Example:

```ts
describe("canDeleteWorkspace", () => {
  it("allows the owner to delete the workspace", () => {
    const result = canDeleteWorkspace({
      workspace_owner_id: "user_1",
      current_user_id: "user_1",
    })

    expect(result).toBe(true)
  })
})
```

Do not introduce mocks for infrastructure that the function does not actually need.

Good architecture often makes important business behavior naturally easy to unit test.

---

## 4. Integration Test Important Boundaries

Integration tests are appropriate when confidence depends on multiple responsibilities working together.

Examples:

```text
Server Action
↓
Validation
↓
Application Operation
↓
Repository
```

or:

```text
Repository
↓
Database
```

or:

```text
Webhook
↓
Verification
↓
Application Operation
```

Integration tests are particularly valuable for:

- persistence behavior
- authorization boundaries
- external service adapters
- important Server Actions
- Route Handlers
- schema-to-application flows

Do not replace every unit test with a large integration test.

Use the smallest test level that gives meaningful confidence.

---

## 5. Test UI Through Observable Behavior

Component tests should focus on what the user can observe or do.

Prefer testing:

```text
What is rendered?
What can the user click?
What changes after interaction?
Is unavailable behavior disabled?
Is the correct feedback displayed?
```

Avoid testing:

```text
Internal component state
Private functions
Exact hook calls
Implementation-specific DOM structure
```

For example, prefer:

```ts
expect(
  screen.getByRole("button", {
    name: "Delete presentation",
  }),
).toBeDisabled()
```

over inspecting an internal `can_delete` variable.

The component's public behavior is the contract.

---

## 6. Mock at Meaningful Boundaries

Mocks should replace dependencies that are genuinely external to the behavior being tested.

Good candidates may include:

- payment providers
- email providers
- storage services
- external APIs
- time
- random identifiers
- repository contracts

For example:

```text
Application Service
↓
PaymentGateway
```

can be tested with a controlled `PaymentGateway` implementation.

Avoid mocking every internal function merely to isolate one function from its own module.

Excessive mocking creates tests that verify implementation wiring rather than application behavior.

If a test requires many internal mocks, reconsider whether the production boundaries are clear.

---

## 7. Prefer Fakes When They Better Represent the Contract

A simple fake implementation can sometimes be clearer than a complex mocking setup.

For example:

```ts
class MemoryPresentationRepository
  implements PresentationRepository {
  // deterministic in-memory implementation
}
```

may allow several application tests to operate against the same repository contract.

This is especially useful when the architecture already defines a meaningful boundary.

Do not create repository interfaces or fake implementations solely because tests exist.

Production architecture should not be distorted to satisfy a testing style.

---

## 8. Test Failure Paths

Important operations should not only test successful behavior.

Consider meaningful failure cases such as:

```text
Invalid input
Missing resource
Unauthorized user
Forbidden operation
Duplicate resource
Business rule rejection
Infrastructure failure
```

For example:

```text
Delete Presentation

✓ owner can delete
✓ non-owner cannot delete
✓ missing presentation is handled
✓ persistence failure does not report success
```

The number of cases should reflect the risk and behavior of the operation.

Do not mechanically test every theoretical branch when it provides little additional confidence.

---

## 9. Test Business Rules Explicitly

Important business rules should have focused tests.

For example:

```text
A free workspace may contain at most 3 projects.
```

should have tests around that behavior:

```text
0 projects → allowed
2 projects → allowed
3 projects → rejected
```

These tests serve as executable documentation for product behavior.

They are especially valuable because business rules often survive changes to:

- UI
- database
- framework
- API
- infrastructure

Keep these tests close to the capability that owns the rule.

---

## 10. Keep Tests Deterministic

Tests should produce the same result when the application behavior has not changed.

Be careful with uncontrolled dependencies such as:

```text
Current time
Random values
Network access
External APIs
Shared databases
Execution order
```

Prefer controlled inputs.

For example, instead of hiding current time inside important logic:

```ts
isSubscriptionExpired(subscription)
```

a design may allow explicit time when useful:

```ts
isSubscriptionExpired(
  subscription,
  current_date,
)
```

Do not make every function injectable merely for testing.

Control nondeterminism when it materially affects test reliability.

---

## 11. Keep Tests Close to Ownership

Tests should normally live near the capability they verify or in a predictable test location defined by the project.

For example:

```text
features/
└── billing/
    ├── services/
    │   ├── calculate-price.ts
    │   └── calculate-price.test.ts
    └── ...
```

or another consistent structure chosen by the project.

Feature-specific tests belong to the feature.

Do not create one global test directory containing unrelated tests unless the test type genuinely operates at the application level.

End-to-end tests may naturally live at the project level because they verify complete workflows.

---

## 12. End-to-End Tests Protect Critical Workflows

End-to-end tests are useful for a small number of high-value user journeys.

Examples:

```text
Sign in
↓
Create project
↓
Edit project
↓
Save
```

or:

```text
Select plan
↓
Checkout
↓
Subscription activated
```

E2E tests provide strong confidence but are usually:

- slower
- more expensive
- more fragile
- harder to debug

Do not use E2E tests as the only testing strategy.

Prefer a testing distribution where detailed behavior is tested closer to its owner and E2E tests protect the most important complete workflows.

---

## 13. Avoid Coverage-Driven Testing

Coverage can reveal untested areas.

It should not become the primary definition of test quality.

Do not write meaningless tests simply to turn:

```text
78%
```

into:

```text
100%
```

High coverage can still hide poor tests.

Lower coverage can still provide strong confidence if the important behavior is thoroughly protected.

Ask:

> If this code breaks, would an important test fail?

That question is usually more valuable than the raw coverage percentage.

---

## 14. Bugs Should Usually Gain Regression Tests

When a meaningful bug is fixed, consider adding a test that reproduces the original failure.

Conceptually:

```text
Bug discovered
↓
Reproduce with test
↓
Test fails
↓
Fix
↓
Test passes
```

This prevents the same behavior from returning later.

A regression test is especially valuable when the bug involved:

- business logic
- concurrency
- permissions
- persistence
- state synchronization
- edge cases
- previous incorrect assumptions

Do not require regression tests for trivial issues where the test would provide no meaningful protection.

---

## 15. Tests Should Remain Readable

A test should make the behavior under examination obvious.

Prefer:

```text
Arrange
↓
Act
↓
Assert
```

as a conceptual structure when useful.

Test names should describe expected behavior.

Prefer:

```ts
it("rejects deletion when the user is not the owner")
```

over:

```ts
it("test delete 2")
```

Avoid large abstractions that make the test shorter but hide what scenario is actually being created.

Some duplication in tests is acceptable when it improves clarity.

---

## Framework and Tooling Details

This standard does not mandate every testing library or reproduce framework-specific testing documentation.

The project may use tools appropriate for:

- unit testing
- React component testing
- integration testing
- browser/end-to-end testing

The exact tooling should be documented in the project when it becomes part of the project's architecture.

When testing React or Next.js behavior, consult the relevant installed skills and current framework guidance.

---

## Core Principle

> Test the behavior whose failure would reduce confidence in the product.

Prefer:

```text
Important behavior
+
Meaningful boundaries
+
Critical failure paths
+
Stable tests
```

over:

```text
Maximum number of tests
+
Maximum coverage
+
Implementation-level assertions
```

Tests are part of the engineering design, but the test suite should remain proportional to the application.

---

## Related Standards

- [Architecture](./architecture.md) — boundaries and testability.
- [Functions](./functions.md) — deterministic and cohesive logic.
- [Data Access](./data-access.md) — repositories, fakes, and persistence testing.
- [Validation](./validation.md) — boundary validation behavior.
- [Errors](./errors.md) — failure paths and error contracts.
- [Components](./components.md) — observable UI behavior.
- [Modules](./modules.md) — test ownership and feature boundaries.