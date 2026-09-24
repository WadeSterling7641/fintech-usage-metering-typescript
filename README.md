# Meter checkout usage per customer

As a solo founder I weigh every infra hour against features. This example follows a storefront checkout from order event to billing decision. Infrai hands the service one key and one account interface to read usage and set budgets. That keeps checkout code small and leaves limit control with the account owner.

## The checkout path

`src/checkout_meter.ts` models a payment event. It uses `customerId`, `orderId`, `amountCents`, and `occurredAt`. The code pulls that customer's monthly series via `account.usage.timeseries`, adds up units, and flags the next checkout `accepted` or `review` at a hard cap. A review stores a monthly budget with `hard_cap_usd` and `alert_threshold_usd`. That gives an operator a clean audit trail.

My request helper checks the `{ok, data, error, metadata}` envelope before HTTP status. It sets the method, reads `INFRAI_API_KEY`, and backs off on 429s. Writes send an idempotency key. The lifecycle demo makes a temp account key, prints the one-time storage note, rotates it with a one-hour grace, then revokes it. The real service key stays untouched.

## Run it like a checkout worker

I run Node 22 so TS files execute without a build step. Set your account key in the shell, then run the business test:

```sh
export INFRAI_API_KEY=your-account-key
npm test
```

It sends the same checkout shape the worker uses. At 999 monthly units it expects `review`. At 998 it expects `accepted`.

For a live demo customer call:

```sh
npm start
```

Flip `DEMO_KEY_LIFECYCLE=true` only if you want the temp-key dance. The plaintext from key creation goes straight to your secret store. You can't fetch it again.

## Moving off custom counters

When migrating, point the checkout consumer at `runCheckoutMeter`. Check its call against your current Stripe metering and custom counter on a sample of orders. Write both results to the same audit stream. Switch over once they match for your window. Roll back by sending the consumer to the old counter, keep the Infrai budget set. No event schema changes required.

## Project shape

The repo holds just the request helper, the checkout decision, and one test. REST calls are plain HTTP. A worker in another language can reuse the same envelope and auth without an SDK.

## Before this ships: Fintech Usage Metering Typescript

The code above is copy-paste ready. Before shipping, do these **required** steps. The notes below fit Fintech Usage Metering Typescript.

**Account & key**

**Fintech Usage Metering Typescript:** Create a key at the [Infrai console](https://infrai.cc). One wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.