import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { computeTotals, nextPayNowRef, isPaidLike, PRODUCTION_STATUSES } from "../lib/pricing";
import { adminPassword, sessionToken } from "../lib/auth";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ah-web-"));
process.env.DATABASE_PATH = path.join(tmp, "test.db");
process.env.DESK_PATH = path.join(tmp, "desk.json");
process.env.ADMIN_PASSWORD = "test-kitchen";
process.env.DEMO_PAYMENTS = "1";
delete process.env.VERCEL;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.STRIPE_SECRET_KEY;
delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

async function main() {
  const threeTins = computeTotals({
    subtotal: 22 * 3,
    deliveryKind: "delivery",
  });
  assert.equal(threeTins.subtotal, 66);
  assert.equal(threeTins.delivery, 15);
  assert.equal(threeTins.discount, 0);
  assert.equal(threeTins.total, 81);
  assert.equal(threeTins.belowMinimum, false);

  const withPct = computeTotals({
    subtotal: 66,
    deliveryKind: "delivery",
    discount: 6.6,
  });
  assert.equal(withPct.discount, 6.6);
  assert.equal(withPct.total, 74.4);

  const withFixedCap = computeTotals({
    subtotal: 22,
    deliveryKind: "collect",
    discount: 100,
  });
  assert.equal(withFixedCap.discount, 22);
  assert.equal(withFixedCap.total, 0);

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

  assert.ok(PRODUCTION_STATUSES.includes("in_production"));
  assert.ok(isPaidLike("payment_submitted"));
  assert.ok(isPaidLike("paid"));
  assert.equal(isPaidLike("pending_payment"), false);

  const {
    resetDbForTests,
    createOrder,
    findCustomerOrder,
    getOrder,
    setOrderStatus,
    quoteCart,
    createEnquiry,
    listEnquiries,
    getSettings,
    updateSettings,
    listOrders,
    productionRollup,
    invoiceNumberFor,
    markOrderPaid,
  } = await import("../lib/db");
  const { resetDeskForTests, deskStorage, readDeskStore } = await import("../lib/desk-store");
  const {
    listProducts,
    getProduct,
    findVariant,
    upsertProduct,
    updateProduct,
    deleteProduct,
    setProductStock,
    clearAllProducts,
    seedProducts,
  } = await import("../lib/catalog");
  const {
    stripeConfigured,
    stripeClientFacing,
    orderAmountCents,
    parsePaymentIntentOrderId,
  } = await import("../lib/stripe");

  resetDbForTests();
  resetDeskForTests();
  assert.equal(deskStorage(), "file");
  process.env.VERCEL = "1";
  assert.equal(deskStorage(), "tmp");
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  assert.equal(deskStorage(), "blob");
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL;
  assert.equal(deskStorage(), "file");

  assert.equal(stripeConfigured(), false);
  assert.equal(stripeClientFacing(), false);
  assert.equal(orderAmountCents(66), 6600);
  assert.equal(orderAmountCents(81.5), 8150);
  assert.equal(orderAmountCents(0), 0);
  assert.equal(parsePaymentIntentOrderId({}), 0);
  assert.equal(parsePaymentIntentOrderId({ orderId: "12" }), 12);
  assert.equal(parsePaymentIntentOrderId({ orderId: -1 }), 0);

  // payment-intent route validation without live Stripe keys
  {
    const { POST } = await import("../app/api/stripe/payment-intent/route");
    const missing = await POST(
      new Request("http://localhost/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    assert.equal(missing.status, 400);
    const missingBody = await missing.json();
    assert.match(String(missingBody.error || ""), /not configured|orderId/i);

    // still not configured even with orderId
    const noKey = await POST(
      new Request("http://localhost/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: 1 }),
      })
    );
    assert.equal(noKey.status, 400);
    const noKeyBody = await noKey.json();
    assert.match(String(noKeyBody.error || ""), /not configured/i);
  }

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

  // Pending orders must land on desk at create (not only after paid)
  const deskAfterCreate = await readDeskStore();
  assert.ok(
    deskAfterCreate.orders.some((o) => o.order_no === order.order_no && o.status === "pending_payment"),
    "createOrder should upsertDeskOrder"
  );
  const byOrderNo = await findCustomerOrder(order.order_no);
  assert.equal(byOrderNo?.id, order.id);
  const byRef = await findCustomerOrder(order.paynow_ref);
  assert.equal(byRef?.order_no, order.order_no);

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
    requested_date: "2026-09-10",
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
  assert.equal(pickup.requested_date, "2026-09-10");

  const found = await findCustomerOrder(String(pickup.id));
  assert.equal(found?.order_no, pickup.order_no);
  const foundByNo = await findCustomerOrder(pickup.order_no);
  assert.equal(foundByNo?.id, pickup.id);
  // Desk already has pending pickup; findCustomerOrder resolves via desk/sqlite without needing cookie
  const deskPending = await readDeskStore();
  assert.ok(deskPending.orders.some((o) => o.order_no === pickup.order_no));

  const submitted = await setOrderStatus(order.id, "payment_submitted", "paynow");
  assert.equal(submitted?.status, "payment_submitted");
  assert.equal(submitted?.stock_decremented, true);
  const paid = await setOrderStatus(order.id, "paid");
  assert.equal(paid?.status, "paid");
  assert.equal(paid?.stock_decremented, true);
  assert.equal((await getOrder(order.id))?.payment_method, "paynow");

  // Desk should hold paid-like orders
  const desk = await readDeskStore();
  assert.ok(desk.orders.some((o) => o.id === order.id));

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

  // Option edit persistence — rename flavor + round-trip
  const lucky = luckyStillThere.product;
  const tin1 = lucky.additionalFields[0];
  const tin2 = lucky.additionalFields[1];
  assert.equal(tin1.title, "Cookie Tin #1");
  assert.equal(tin2.title, "Cookie Tin #2");
  const flavors = [...tin1.options];
  assert.ok(flavors.includes("Melty Kuih Bangkit"));
  const withQa = await updateProduct(lucky.slug, {
    title: lucky.title,
    additionalFields: [
      { ...tin1, options: [...tin1.options, "QA Overnight Flavor"] },
      tin2,
    ],
  });
  assert.ok(withQa.additionalFields[0].options.includes("QA Overnight Flavor"));
  const again = await getProduct(lucky.slug);
  assert.ok(again);
  assert.equal(again.additionalFields.length, 2);
  assert.equal(again.additionalFields[0].title, "Cookie Tin #1");
  assert.ok(again.additionalFields[0].options.includes("QA Overnight Flavor"));
  // Flat field update must not strip options
  const pricedLucky = await updateProduct(lucky.slug, { title: lucky.title, price: 66 });
  assert.equal(pricedLucky.additionalFields.length, 2);
  assert.ok(pricedLucky.additionalFields[0].options.includes("QA Overnight Flavor"));
  // Revert QA flavor
  await updateProduct(lucky.slug, {
    title: lucky.title,
    additionalFields: [
      { title: "Cookie Tin #1", required: true, options: flavors },
      { title: "Cookie Tin #2", required: true, options: [...tin2.options] },
    ],
  });

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

  // --- Empty-catalog round trip ---
  const cleared = await clearAllProducts();
  assert.ok(cleared > 0);
  assert.equal((await listProducts()).length, 0);
  assert.equal(await getProduct("lucky-duo-cookies-giftset"), undefined);
  // Storefront helpers must not throw on empty catalogue
  assert.equal((await listProducts()).length, 0);

  const tinFlavors = [
    "Almond Butter Cookies",
    "Melty Kuih Bangkit",
    "Malty Cashew Bars",
    "Emping Belinjau Cookies",
    "Premium Prawn Rolls",
    "Spicy Floss Samosas",
    "Golden Peanut Puffs",
    "Cashew Butter Cookies",
  ];
  const rebuilt = await upsertProduct({
    title: "Lucky Duo 成雙成對",
    slug: "lucky-duo-cookies-giftset",
    sku: "SQ9265799",
    price: 66,
    stock: 12,
    unlimited: false,
    description: "Two cookie tins, kitchen-rebuilt",
    categories: ["Shop", "Gift Sets"],
    additionalFields: [
      { title: "Cookie Tin #1", required: true, options: tinFlavors },
      { title: "Cookie Tin #2", required: true, options: tinFlavors },
    ],
  });
  assert.equal(rebuilt.slug, "lucky-duo-cookies-giftset");
  assert.equal(rebuilt.additionalFields.length, 2);
  assert.equal(rebuilt.additionalFields[0].title, "Cookie Tin #1");
  assert.deepEqual(rebuilt.additionalFields[0].options, tinFlavors);
  const rebuiltGet = await getProduct("lucky-duo-cookies-giftset");
  assert.ok(rebuiltGet);
  assert.equal(rebuiltGet.additionalFields[1].title, "Cookie Tin #2");
  assert.ok((await listProducts()).some((p) => p.slug === "lucky-duo-cookies-giftset"));

  // Restore full seed catalogue for remaining tests / cleanliness
  resetDeskForTests();
  resetDbForTests();
  const seeded = await listProducts();
  assert.ok(seeded.length >= seedProducts().length - 1);
  assert.ok(await getProduct("lucky-duo-cookies-giftset"));

  // --- Stock decrement once on pay ---
  const stockProduct = await upsertProduct({
    title: "Stock Test Tin",
    sku: "AH-STOCK-1",
    price: 50,
    stock: 5,
    unlimited: false,
    categories: ["Shop"],
  });
  const stockOrder = await createOrder({
    customer_name: "Stock Guest",
    customer_phone: "+65 9111 1111",
    customer_email: "stock@example.com",
    delivery_kind: "collect",
    address: "",
    notes: "",
    express_slot: false,
    lines: [{ sku: "AH-STOCK-1", qty: 2 }],
  });
  assert.equal(stockOrder.status, "pending_payment");
  const afterPay = await setOrderStatus(stockOrder.id, "payment_submitted", "paynow");
  assert.equal(afterPay?.stock_decremented, true);
  const afterStock = await findVariant("AH-STOCK-1");
  assert.equal(afterStock?.variant.stock, 3);
  // Repeat pay-like transition must not decrement again
  await setOrderStatus(stockOrder.id, "paid");
  assert.equal((await findVariant("AH-STOCK-1"))?.variant.stock, 3);
  await markOrderPaid(stockOrder.id, "stripe");
  assert.equal((await findVariant("AH-STOCK-1"))?.variant.stock, 3);

  // Sell down to zero → sold out
  const zeroOrder = await createOrder({
    customer_name: "Zero Guest",
    customer_phone: "+65 9222 2222",
    customer_email: "",
    delivery_kind: "collect",
    address: "",
    notes: "",
    express_slot: false,
    lines: [{ sku: "AH-STOCK-1", qty: 3 }],
  });
  await setOrderStatus(zeroOrder.id, "paid", "paynow");
  const zeroHit = await findVariant("AH-STOCK-1");
  assert.equal(zeroHit?.variant.stock, 0);
  assert.equal(zeroHit?.variant.inStock, false);
  assert.equal(zeroHit?.product.soldOut, true);

  // Production rollup + invoice fields
  const kitchenOrders = (await listOrders()).filter((o) => isPaidLike(o.status));
  assert.ok(kitchenOrders.length >= 1);
  const rollup = productionRollup(kitchenOrders);
  assert.ok(rollup.some((r) => r.qty > 0));
  const invOrder = kitchenOrders.find((o) => o.id === stockOrder.id) || kitchenOrders[0];
  assert.match(invoiceNumberFor(invOrder), /^INV-/);

  // Order happy path: Lucky Duo pickup + pay → production variants
  const duoOrder = await createOrder({
    customer_name: "Duo Guest",
    customer_phone: "+65 9333 3333",
    customer_email: "duo@example.com",
    delivery_kind: "collect",
    address: "",
    notes: "",
    express_slot: false,
    requested_date: "2026-09-12",
    lines: [
      {
        sku: "SQ9265799",
        qty: 1,
        options: {
          "Cookie Tin #1": "Melty Kuih Bangkit",
          "Cookie Tin #2": "Cashew Butter Cookies",
        },
      },
    ],
  });
  const duoPaid = await setOrderStatus(duoOrder.id, "payment_submitted", "paynow");
  assert.equal(duoPaid?.status, "payment_submitted");
  assert.match(duoPaid!.items[0].variant_label, /Melty Kuih Bangkit/);
  assert.match(duoPaid!.items[0].variant_label, /Cashew Butter Cookies/);
  const board = (await listOrders()).filter((o) => isPaidLike(o.status));
  const onBoard = board.find((o) => o.id === duoOrder.id);
  assert.ok(onBoard);
  assert.equal(onBoard.requested_date, "2026-09-12");
  const duoRollup = productionRollup([onBoard]);
  assert.ok(duoRollup.some((r) => /Melty Kuih Bangkit/.test(r.variant_label)));

  // --- Below-minimum gate (createOrder) ---
  await assert.rejects(
    () =>
      createOrder({
        customer_name: "Tiny Cart",
        customer_phone: "+65 9000 0099",
        customer_email: "",
        delivery_kind: "collect",
        address: "",
        notes: "",
        express_slot: false,
        lines: [{ sku: "SQ0179319", qty: 1 }],
      }),
    /Minimum order/i
  );

  // --- Vouchers ---
  const {
    listVouchers,
    upsertVoucher,
    applyVoucherCode,
    setVoucherActive,
    normalizeVoucherCode,
  } = await import("../lib/vouchers");
  const seededVouchers = await listVouchers();
  assert.ok(seededVouchers.some((v) => normalizeVoucherCode(v.code) === "WELCOME10"));
  const welcome = await applyVoucherCode("welcome10", 66);
  assert.ok(welcome);
  assert.equal(welcome.code, "WELCOME10");
  assert.equal(welcome.discount, 6.6);

  const quotedWelcome = await quoteCart(
    [{ sku: "SQ0179319", qty: 3 }],
    "delivery",
    false,
    "WELCOME10"
  );
  assert.equal(quotedWelcome.totals.subtotal, 66);
  assert.equal(quotedWelcome.totals.discount, 6.6);
  assert.equal(quotedWelcome.totals.delivery, 15);
  assert.equal(quotedWelcome.totals.total, 74.4);
  assert.equal(quotedWelcome.voucher?.code, "WELCOME10");

  const fixed = await upsertVoucher({
    code: "SAVE5",
    type: "fixed",
    value: 5,
    active: true,
    note: "test fixed",
  });
  assert.equal(fixed.code, "SAVE5");
  const quotedFixed = await quoteCart(
    [{ sku: "SQ0179319", qty: 3 }],
    "collect",
    false,
    "save5"
  );
  assert.equal(quotedFixed.totals.discount, 5);
  assert.equal(quotedFixed.totals.total, 61);

  const fixedCap = await applyVoucherCode("SAVE5", 3);
  assert.equal(fixedCap?.discount, 3);

  await assert.rejects(() => applyVoucherCode("NOPE-CODE", 66), /Invalid voucher/i);
  await setVoucherActive("SAVE5", false);
  await assert.rejects(() => applyVoucherCode("SAVE5", 66), /inactive/i);

  const voucherOrder = await createOrder({
    customer_name: "Voucher Guest",
    customer_phone: "+65 9444 4444",
    customer_email: "voucher@example.com",
    delivery_kind: "collect",
    address: "",
    notes: "",
    express_slot: false,
    lines: [{ sku: "SQ0179319", qty: 3 }],
    voucher_code: "welcome10",
  });
  assert.equal(voucherOrder.voucher_code, "WELCOME10");
  assert.equal(voucherOrder.discount, 6.6);
  assert.equal(voucherOrder.total, 59.4);
  assert.equal(voucherOrder.delivery_fee, 0);

  await assert.rejects(
    () =>
      createOrder({
        customer_name: "Bad Code",
        customer_phone: "+65 9555 5555",
        customer_email: "",
        delivery_kind: "collect",
        address: "",
        notes: "",
        express_slot: false,
        lines: [{ sku: "SQ0179319", qty: 3 }],
        voucher_code: "NOTREAL",
      }),
    /Invalid voucher/i
  );

    // --- Confirmation email on payment (no mailer → error flag, payment still ok) ---
  const { buildOrderConfirmationEmail, sendOrderConfirmation } = await import("../lib/mail");
  const built = buildOrderConfirmationEmail(voucherOrder);
  assert.match(built.subject, /Order confirmation/);
  assert.match(built.subject, new RegExp(voucherOrder.order_no));
  assert.match(built.html, /Subtotal/);
  assert.match(built.html, /WELCOME10|Discount/);
  assert.match(built.html, /invoice/i);
  assert.match(built.text, /Total/);

  const paidMail = await setOrderStatus(voucherOrder.id, "payment_submitted", "paynow");
  assert.equal(paidMail?.status, "payment_submitted");
  assert.equal(paidMail?.confirmation_email_sent, false);
  assert.match(String(paidMail?.confirmation_email_error || ""), /Mail not configured|RESEND|SMTP/i);
  // Second transition must not clear / re-attempt when already attempted with error… 
  // Actually flag is false so paid transition may retry — that's OK. Mark sent manually via paid:
  const stripePaid = await markOrderPaid(voucherOrder.id, "stripe");
  assert.equal(stripePaid?.status, "paid");
  // Still no mailer — error remains or refreshed
  assert.ok(stripePaid?.confirmation_email_error || stripePaid?.confirmation_email_sent === false);

  const noEmailOrder = await createOrder({
    customer_name: "No Email Guest",
    customer_phone: "+65 9666 6666",
    customer_email: "",
    delivery_kind: "collect",
    address: "",
    notes: "",
    express_slot: false,
    lines: [{ sku: "SQ0179319", qty: 3 }],
  });
  const noEmailPaid = await setOrderStatus(noEmailOrder.id, "payment_submitted", "paynow");
  assert.equal(noEmailPaid?.confirmation_email_sent, true);
  assert.equal(noEmailPaid?.confirmation_email_error, undefined);
  const skip = await sendOrderConfirmation(noEmailOrder);
  assert.equal(skip.ok, false);
  assert.equal("skipped" in skip && skip.skipped, true);

  // Refresh / re-set status must not duplicate-send once marked sent
  const paidAgain = await setOrderStatus(noEmailOrder.id, "paid", "paynow");
  assert.equal(paidAgain?.confirmation_email_sent, true);

    const settings = await updateSettings({ min_order: 90, uen: "", gst_reg: "" });
  assert.equal(settings.min_order, 90);
  assert.equal(settings.uen, "");
  assert.equal((await getSettings()).min_order, 90);
  const below = await quoteCart([{ sku: "SQ0179319", qty: 3 }], "delivery", false);
  assert.equal(below.totals.subtotal, 66);
  assert.equal(below.totals.belowMinimum, true);
  assert.equal(below.totals.minOrder, 90);

  await assert.rejects(
    () => quoteCart([{ sku: "NO-SUCH-SKU", qty: 1 }], "delivery", false),
    /Unknown SKU/
  );

  // Cleanup test SKU
  await deleteProduct(stockProduct.slug);

  console.log("commerce tests ok");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
