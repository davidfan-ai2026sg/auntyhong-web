import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { computeTotals, nextPayNowRef } from "../lib/pricing";
import { adminPassword, sessionToken } from "../lib/auth";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ah-web-"));
process.env.DATABASE_PATH = path.join(tmp, "test.db");
process.env.ADMIN_PASSWORD = "test-kitchen";
process.env.DEMO_PAYMENTS = "1";

async function main() {
  const threeTins = computeTotals({
    subtotal: 22 * 3,
    deliveryKind: "delivery",
  });
  assert.equal(threeTins.subtotal, 66);
  assert.equal(threeTins.delivery, 15);
  assert.equal(threeTins.total, 81);
  assert.equal(threeTins.belowMinimum, false);

  const free = computeTotals({ subtotal: 120, deliveryKind: "delivery" });
  assert.equal(free.delivery, 0);
  assert.equal(free.total, 120);

  const express = computeTotals({
    subtotal: 66,
    deliveryKind: "delivery",
    expressSlot: true,
  });
  assert.equal(express.delivery, 55);

  const collect = computeTotals({ subtotal: 66, deliveryKind: "collect" });
  assert.equal(collect.delivery, 0);
  assert.equal(collect.total, 66);

  const under = computeTotals({ subtotal: 22, deliveryKind: "delivery" });
  assert.equal(under.belowMinimum, true);

  const ref = nextPayNowRef(1, new Date("2026-08-31T12:00:00+08:00"));
  assert.match(ref, /^AH-20260831-001$/);

  const { resetDbForTests, createOrder, getOrder, setOrderStatus, quoteCart } = await import("../lib/db");
  resetDbForTests();
  const quoted = quoteCart([{ sku: "SQ0179319", qty: 3 }], "delivery", false);
  assert.equal(quoted.totals.total, 81);

  const duo = quoteCart(
    [
      {
        sku: "SQ9265799",
        qty: 1,
        options: {
          "Cookie Tin #1": "Melty Kuih Bangkit",
          "Cookie Tin #2": "Malty Cashew Bars",
        },
      },
    ],
    "delivery",
    false
  );
  assert.equal(duo.totals.subtotal, 66);
  assert.equal(duo.totals.delivery, 15);
  assert.equal(duo.totals.total, 81);
  assert.match(duo.items[0].variant_label, /Melty Kuih Bangkit/);
  assert.match(duo.items[0].variant_label, /Malty Cashew Bars/);

  const order = await createOrder({
    customer_name: "Test Guest",
    customer_phone: "+65 9000 0000",
    customer_email: "demo@example.com",
    delivery_kind: "delivery",
    address: "1 Demo Street, Singapore",
    notes: "",
    express_slot: false,
    lines: [{ sku: "SQ0179319", qty: 3 }],
  });
  assert.equal(order.status, "pending_payment");
  assert.equal(order.total, 81);
  assert.match(order.paynow_ref, /^AH-\d{8}-\d{3}$/);

  const submitted = await setOrderStatus(order.id, "payment_submitted", "paynow");
  assert.equal(submitted?.status, "payment_submitted");
  const paid = await setOrderStatus(order.id, "paid");
  assert.equal(paid?.status, "paid");
  assert.equal((await getOrder(order.id))?.payment_method, "paynow");

  process.env.ADMIN_PASSWORD = "test-kitchen";
  assert.equal(adminPassword(), "test-kitchen");
  assert.equal(sessionToken().length, 64);

  console.log("commerce tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
