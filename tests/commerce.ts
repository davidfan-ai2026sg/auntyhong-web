import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { computeTotals, nextPayNowRef } from "../lib/pricing";
import { adminPassword, sessionToken } from "../lib/auth";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ah-web-"));
process.env.DATABASE_PATH = path.join(tmp, "test.db");
process.env.DESK_PATH = path.join(tmp, "desk.json");
process.env.ADMIN_PASSWORD = "test-kitchen";
process.env.DEMO_PAYMENTS = "1";
delete process.env.VERCEL;
delete process.env.BLOB_READ_WRITE_TOKEN;

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

  const { resetDbForTests, createOrder, findCustomerOrder, getOrder, setOrderStatus, quoteCart, createEnquiry, listEnquiries, getSettings, updateSettings } = await import("../lib/db");
  const { resetDeskForTests } = await import("../lib/desk-store");
  const { listProducts, findVariant, upsertProduct, updateProduct, deleteProduct, setProductStock } = await import("../lib/catalog");
  resetDbForTests();
  resetDeskForTests();

  const quoted = await quoteCart([{ sku: "SQ0179319", qty: 3 }], "delivery", false);
  assert.equal(quoted.totals.total, 81);

  const duo = await quoteCart(
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

  await assert.rejects(
    () =>
      createOrder({
        customer_name: "Test Guest",
        customer_phone: "+65 9000 0000",
        customer_email: "",
        delivery_kind: "delivery",
        address: "",
        notes: "",
        express_slot: false,
        lines: [{ sku: "SQ0179319", qty: 3 }],
      }),
    /Delivery address is required/
  );

  const pickup = await createOrder({
    customer_name: "Pickup Guest",
    customer_phone: "+65 9000 0001",
    customer_email: "",
    delivery_kind: "collect",
    address: "",
    notes: "",
    express_slot: false,
    lines: [
      {
        sku: "SQ9265799",
        qty: 1,
        options: {
          "Cookie Tin #1": "Melty Kuih Bangkit",
          "Cookie Tin #2": "Malty Cashew Bars",
        },
      },
    ],
  });
  assert.equal(pickup.delivery_kind, "collect");
  assert.equal(pickup.address, "");
  assert.equal(pickup.delivery_fee, 0);
  assert.equal(pickup.total, 66);
  assert.equal(pickup.status, "pending_payment");

  const found = await findCustomerOrder(String(pickup.id));
  assert.equal(found?.order_no, pickup.order_no);

  const submitted = await setOrderStatus(order.id, "payment_submitted", "paynow");
  assert.equal(submitted?.status, "payment_submitted");
  const paid = await setOrderStatus(order.id, "paid");
  assert.equal(paid?.status, "paid");
  assert.equal((await getOrder(order.id))?.payment_method, "paynow");

  process.env.ADMIN_PASSWORD = "test-kitchen";
  assert.equal(adminPassword(), "test-kitchen");
  assert.equal(sessionToken().length, 64);

  const enquiryId = await createEnquiry({
    company: "Harbour Co",
    name: "Mei",
    email: "mei@example.com",
    phone: "+65 8000 0000",
    message: "Need 40 Lucky Duo tins for CNY",
    qty_hint: "40 tins / week 3",
  });
  assert.ok(enquiryId > 0);
  const enquiries = await listEnquiries();
  const enquiry = enquiries.find((e) => e.id === enquiryId);
  assert.ok(enquiry);
  assert.equal(enquiry.company, "Harbour Co");
  assert.equal(enquiry.name, "Mei");
  assert.equal(enquiry.email, "mei@example.com");
  assert.match(enquiry.message, /Lucky Duo/);

  const created = await upsertProduct({
    title: "Test Kitchen Tin",
    sku: "AH-TEST-TIN",
    price: 12,
    stock: 8,
    unlimited: false,
    description: "Desk-created tin",
    categories: ["Shop"],
  });
  assert.equal(created.title, "Test Kitchen Tin");
  const listed = await listProducts();
  assert.ok(listed.some((p) => p.slug === created.slug));
  const createdHit = await findVariant("AH-TEST-TIN");
  assert.ok(createdHit);
  assert.equal(createdHit.variant.price, 12);
  assert.equal(createdHit.variant.stock, 8);
  assert.equal(createdHit.variant.inStock, true);

  const luckyStillThere = await findVariant("SQ9265799");
  assert.ok(luckyStillThere);
  assert.equal(luckyStillThere.product.slug, "lucky-duo-cookies-giftset");
  assert.equal(luckyStillThere.product.additionalFields.length, 2);

  const priced = await updateProduct(created.slug, { price: 18, stock: 0, soldOut: true });
  assert.equal(priced.fromPrice, 18);
  const pricedHit = await findVariant("AH-TEST-TIN");
  assert.ok(pricedHit);
  assert.equal(pricedHit.variant.price, 18);
  assert.equal(pricedHit.variant.stock, 0);
  assert.equal(pricedHit.variant.inStock, false);
  assert.equal(pricedHit.product.soldOut, true);

  const restocked = await setProductStock({ slug: created.slug, sku: "AH-TEST-TIN", stock: 4, soldOut: false });
  assert.equal(restocked.soldOut, false);
  assert.equal(restocked.variants[0].inStock, true);

  const removed = await deleteProduct(created.slug);
  assert.equal(removed, true);
  assert.equal(await findVariant("AH-TEST-TIN"), undefined);
  assert.ok(await findVariant("SQ9265799"));

  const settings = await updateSettings({ min_order: 90 });
  assert.equal(settings.min_order, 90);
  assert.equal((await getSettings()).min_order, 90);
  const below = await quoteCart([{ sku: "SQ0179319", qty: 3 }], "delivery", false);
  assert.equal(below.totals.subtotal, 66);
  assert.equal(below.totals.belowMinimum, true);
  assert.equal(below.totals.minOrder, 90);

  await assert.rejects(
    () => quoteCart([{ sku: "NO-SUCH-SKU", qty: 1 }], "delivery", false),
    /Unknown SKU/
  );

  console.log("commerce tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
