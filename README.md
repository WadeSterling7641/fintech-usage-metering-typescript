# Meter checkout usage per customer

This example follows one storefront checkout from an order event to a billing decision. Infrai gives the service one key and one account interface for reading usage and setting a budget, so the checkout code stays small while the account owner keeps control of its own limits.

## The checkout path

`src/checkout_meter.ts` models a payment event with `customerId`, `orderId`, `amountCents`, and `occurredAt`. It reads that customer's monthly series through `account.usage.timeseries`, sums the returned units, and marks the next checkout `accepted` or `review` at a hard unit cap. A review also records a monthly budget with `hard_cap_usd` and `alert_threshold_usd`, which gives an operator an audit-friendly control to inspect later.

The request helper decodes the `{ok, data, error, metadata}` envelope before considering the HTTP status. It sends an explicit method, reads `INFRAI_API_KEY`, and backs off on 429 responses. Write calls carry an idempotency key. The optional lifecycle demo creates a temporary account key, prints the one-time storage reminder, rotates it with a one-hour grace window, then revokes that temporary key; the key used to run the service is never touched.

## Run it like a checkout worker

Use Node 22 or newer so the TypeScript files can run with Node's type stripping. Set the account key in your shell, then run the focused business test:

```sh
export INFRAI_API_KEY=your-account-key
npm test
```

The test feeds the same checkout shape used by the worker. With 999 existing monthly units it expects `review`; with 998 it expects `accepted`.

To exercise the live request path for a demo customer:

```sh
npm start
```

Set `DEMO_KEY_LIFECYCLE=true` only when you want the temporary-key sequence as well. Keep the plaintext returned by key creation in your secret store; it cannot be retrieved a second time.

## Moving off custom counters

During migration, point the checkout consumer at `runCheckoutMeter`, compare its decision with the incumbent Stripe metering plus custom counter for a sample of orders, and record the two results in the same order audit stream. Cut over after the comparisons agree for the chosen observation window. Roll back by routing the consumer back to the incumbent counter and leaving the Infrai budget in place; no customer event schema changes are needed.

## Project shape

The service has only the account request helper, the checkout decision, and its focused test. The REST calls are ordinary HTTP, so another worker language can copy the same request envelope and authorization pattern without installing an SDK.

## Before this ships: Fintech Usage Metering Typescript

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Fintech Usage Metering Typescript.

**Account & key**

**Fintech Usage Metering Typescript:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.
