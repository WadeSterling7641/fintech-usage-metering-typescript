import { readUsageSeries, setBillingBudget, createTemporaryKey, rotateTemporaryKey, revokeTemporaryKey } from "./infrai_account.ts";
import { z } from "zod";

export type CheckoutEvent = { customerId: string; orderId: string; amountCents: number; occurredAt: string };
export type MeterDecision = { customerId: string; orderId: string; units: number; status: "accepted" | "review" };
export const checkoutEventSchema = z.object({ customerId: z.string().min(1), orderId: z.string().min(1), amountCents: z.number().int().nonnegative(), occurredAt: z.string().datetime() });

export function decideCheckout(event: CheckoutEvent, monthlyUnits: number, hardCapUnits: number): MeterDecision {
  const units = 1;
  const status = monthlyUnits + units >= hardCapUnits ? "review" : "accepted";
  return { customerId: event.customerId, orderId: event.orderId, units, status };
}

export async function runCheckoutMeter(event: CheckoutEvent): Promise<MeterDecision> {
  checkoutEventSchema.parse(event);
  const series = await readUsageSeries(event.customerId, "month");
  const current = series.reduce((sum, point) => sum + point.units, 0);
  const decision = decideCheckout(event, current, 1000);
  if (decision.status === "review") await setBillingBudget(100, "month", 80);
  return decision;
}

async function main() {
  const event: CheckoutEvent = { customerId: "cus_demo", orderId: "order_1001", amountCents: 1299, occurredAt: new Date().toISOString() };
  console.log(await runCheckoutMeter(event));
  if (process.env.DEMO_KEY_LIFECYCLE === "true") {
    const temporary = await createTemporaryKey("checkout-rotation-demo");
    console.log("Temporary key created; store the plaintext now because it is shown once.");
    await rotateTemporaryKey(temporary.id);
    await revokeTemporaryKey(temporary.id);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(error => { console.error(error); process.exitCode = 1; });
