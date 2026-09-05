# Tryslides Billing and Access

## Product Model

Tryslides is a paid product with one level of product access.

There are no initial feature tiers such as:

- Free
- Basic
- Pro
- Plus
- Enterprise

A subscription unlocks Tryslides.

## Billing Periods

Users may choose:

- monthly billing
- annual billing

Both provide exactly the same product capabilities.

Annual billing exists only to provide a discounted effective price for
a longer commitment.

Billing period must not be interpreted as a product capability tier.

## Initial Pricing

The initial planned monthly price is:

$9/month

The price may increase later.

A future target discussed for new customers is:

$14.99/month

Exact production pricing remains controlled through Stripe Price
configuration rather than hardcoded business logic.

## Stripe Model

Use one Stripe Product representing Tryslides.

Conceptually:

    Product: Tryslides

    ├── Monthly Price
    └── Annual Price

Both prices grant the same entitlement.

When pricing changes, create new Stripe Prices instead of changing
domain concepts such as plan names.

This also permits grandfathering existing subscribers when desired.

## Authentication

Authentication uses Supabase Auth.

Initial authentication provider:

- Google

Authentication answers:

> Who is this user?

Authentication does not determine subscription access.

## Authorization

Subscription state answers:

> Does this authenticated user currently have access to Tryslides?

Authentication and product authorization must remain separate concerns.

Conceptually:

Supabase Auth
→ authenticated user

Subscription state
→ product access

## Access Model

The initial access model should remain intentionally simple.

Conceptually:

    hasActiveSubscription(user_id)

An active monthly subscription and an active annual subscription grant
the same access.

Avoid introducing feature-level entitlement complexity until the
product actually requires multiple access levels.

## Stripe Synchronization

Do not query Stripe on every product request.

Stripe is the billing authority.

Relevant subscription state should be synchronized into the application
database using Stripe webhooks.

Conceptually:

Stripe
→ webhook
→ subscription persistence
→ application access check

## Subscription Data

Relevant persisted metadata may include:

- user_id
- stripe_customer_id
- stripe_subscription_id
- stripe_price_id
- status
- current_period_end
- cancel_at_period_end

Exact schema belongs to database implementation documentation.

## Relevant Stripe Events

Initial integration may need events such as:

- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed

Exact handling should be defined during billing implementation.

## Product Access Flow

Conceptually:

Landing
→ Sign in with Google
→ Check subscription
├── active → Dashboard / Editor
└── inactive → Checkout

## Core Independence

The Presentation Core must not know:

- whether the user is authenticated
- whether the user has paid
- Stripe
- Stripe customers
- Stripe subscriptions
- prices
- billing periods

The application layer decides whether the user is allowed to enter or
perform protected product workflows.

Once a valid presentation operation reaches the Core, billing is not a
domain concern of the Presentation Core.

## Local Demo

Local/demo mode may use IndexedDB without cloud persistence.

Whether demo access requires authentication or subscription is a
product decision separate from Presentation Core behavior.

The local repository must not introduce billing concepts into the Core.

## Future Pricing

Tryslides may change pricing without changing the architecture of the
Presentation Core.

For example:

    $9/month
        ↓
    $14.99/month

should be a billing configuration change, not a presentation-domain
migration.

## Principle

> One product. One level of access. Two billing periods.

Monthly and annual subscriptions differ in payment cadence and price,
not in product capabilities.
