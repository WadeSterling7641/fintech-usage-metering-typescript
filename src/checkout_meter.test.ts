import { strict as assert } from "node:assert";
import { decideCheckout } from "./checkout_meter.ts";

const event = { customerId: "cus_42", orderId: "order_7", amountCents: 2500, occurredAt: "2026-01-01T00:00:00Z" };
assert.equal(decideCheckout(event, 999, 1000).status, "review");
assert.equal(decideCheckout(event, 998, 1000).status, "accepted");
console.log("checkout decision test passed");
