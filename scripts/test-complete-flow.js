/**
 * ✅ COMPLETE FLOW TEST SCRIPT
 *
 * Script này test TOÀN BỘ luồng phân phối xe và tất toán công nợ:
 *
 * 📋 LUỒNG ĐẦY ĐỦ:
 * 1. Manufacturer có stock ban đầu (50 xe mỗi màu)
 * 2. Dealer REQUEST xe (RequestVehicle)
 * 3. EVM APPROVE → Transfer stock + Create debt (với tracking)
 * 4. Customer ĐẶT HÀNG → FIFO stock deduction (với tracking)
 * 5. Customer THANH TOÁN → Batch-level debt settlement (với tracking)
 * 6. VERIFY: Check tracking fields đầy đủ
 *
 * 🎯 MỤC ĐÍCH:
 * - Test FIFO hoạt động đúng (lô cũ nhất được dùng trước)
 * - Test batch-level debt settlement (đối trừ chính xác từng lô)
 * - Test tracking fields đầy đủ (used_stocks[], settled_by_orders[])
 * - Verify audit trail hoàn chỉnh
 *
 * ⚠️ YÊU CẦU:
 * - Đã chạy seed-complete-system.js trước
 * - Database có: Roles, Manufacturer, Users, Dealerships, Vehicles
 *
 * 🚀 CHẠY:
 * node scripts/test-complete-flow.js
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import Vehicle from "../src/models/Vehicle.js";
import Dealership from "../src/models/Dealership.js";
import User from "../src/models/User.js";
import RequestVehicle from "../src/models/RequestVehicle.js";
import DealerManufacturerDebt from "../src/models/DealerManufacturerDebt.js";
import Order from "../src/models/Order.js";
import Customer from "../src/models/Customer.js";
import Quote from "../src/models/Quote.js";
import Payment from "../src/models/Payment.js";
import Manufacturer from "../src/models/Manufacturer.js";

// Load environment variables
dotenv.config();

const MONGODB_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/electric_vehicle_dealer";

// ========== Test Data Storage ==========
let manufacturer, evmUser;
let dealers = [];
let vehicles = [];
let testScenarios = [];

// ========== Step 1: Load Existing Data ==========
async function loadExistingData() {
  console.log("\n📥 [1/6] Loading existing data...");

  // Load manufacturer
  manufacturer = await Manufacturer.findOne({name: "VinFast Vietnam"});
  if (!manufacturer) {
    throw new Error(
      "❌ Manufacturer not found! Please run seed-complete-system.js first."
    );
  }
  console.log(`✓ Found manufacturer: ${manufacturer.name}`);

  // Load EVM user
  evmUser = await User.findOne({email: "evm@vinfast.vn"});
  if (!evmUser) {
    throw new Error(
      "❌ EVM user not found! Please run seed-complete-system.js first."
    );
  }
  console.log(`✓ Found EVM user: ${evmUser.email}`);

  // Load dealers
  const dealerDocs = await Dealership.find({
    manufacturer_id: manufacturer._id,
    status: "active",
  }).limit(3);

  if (dealerDocs.length === 0) {
    throw new Error(
      "❌ No dealers found! Please run seed-complete-system.js first."
    );
  }

  for (const dealer of dealerDocs) {
    const staff = await User.findOne({
      dealership_id: dealer._id,
      email: {$regex: /^staff\./},
    });

    dealers.push({
      id: dealer._id,
      name: dealer.company_name,
      code: dealer.code,
      staff_id: staff?._id,
    });

    console.log(`✓ Found dealer: ${dealer.company_name}`);
  }

  // Load vehicles (3 vehicles for testing)
  const vehicleDocs = await Vehicle.find({
    manufacturer_id: manufacturer._id,
    status: "active",
  }).limit(3);

  if (vehicleDocs.length === 0) {
    throw new Error(
      "❌ No vehicles found! Please run seed-complete-system.js first."
    );
  }

  for (const vehicle of vehicleDocs) {
    vehicles.push({
      id: vehicle._id,
      name: vehicle.name,
      price: vehicle.price,
      colors: vehicle.color_options,
    });
    console.log(
      `✓ Found vehicle: ${vehicle.name} (${vehicle.price.toLocaleString()}đ)`
    );
  }
}

// ========== Step 2: Create RequestVehicles ==========
async function createRequestVehicles() {
  console.log("\n📋 [2/6] Creating vehicle requests...");

  // Scenario 1: Đại Việt request VF7 Đỏ x5
  const req1 = await RequestVehicle.create({
    code: `TEST-REQ-${Date.now()}-001`,
    dealership_id: dealers[0].id,
    requested_by: dealers[0].staff_id,
    vehicle_id: vehicles[0].id,
    color: vehicles[0].colors[0], // First color
    quantity: 5,
    manufacturer_id: manufacturer._id,
    expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    notes: "Test scenario 1 - Request 5 units",
    status: "pending", // Will be approved in next step
  });

  testScenarios.push({
    scenario: "Scenario 1",
    dealer: dealers[0],
    vehicle: vehicles[0],
    color: vehicles[0].colors[0],
    request: req1,
    requestQuantity: 5,
    orderQuantity: 2, // Will order 2 units
  });

  console.log(
    `✓ Created request: ${req1.code} (${vehicles[0].name} ${vehicles[0].colors[0]} x5 - ${dealers[0].name})`
  );

  // Scenario 2: Phạm Văn Đồng request VF8 Xanh x3
  if (dealers[1] && vehicles[1]) {
    const req2 = await RequestVehicle.create({
      code: `TEST-REQ-${Date.now()}-002`,
      dealership_id: dealers[1].id,
      requested_by: dealers[1].staff_id,
      vehicle_id: vehicles[1].id,
      color: vehicles[1].colors[1] || vehicles[1].colors[0], // Second color or first
      quantity: 3,
      manufacturer_id: manufacturer._id,
      expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: "Test scenario 2 - Request 3 units",
      status: "pending",
    });

    testScenarios.push({
      scenario: "Scenario 2",
      dealer: dealers[1],
      vehicle: vehicles[1],
      color: vehicles[1].colors[1] || vehicles[1].colors[0],
      request: req2,
      requestQuantity: 3,
      orderQuantity: 1, // Will order 1 unit
    });

    console.log(
      `✓ Created request: ${req2.code} (${vehicles[1].name} ${
        vehicles[1].colors[1] || vehicles[1].colors[0]
      } x3 - ${dealers[1].name})`
    );
  }

  // Scenario 3: Cầu Giấy request VF9 x10
  if (dealers[2] && vehicles[2]) {
    const req3 = await RequestVehicle.create({
      code: `TEST-REQ-${Date.now()}-003`,
      dealership_id: dealers[2].id,
      requested_by: dealers[2].staff_id,
      vehicle_id: vehicles[2].id,
      color: vehicles[2].colors[0],
      quantity: 10,
      manufacturer_id: manufacturer._id,
      expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: "Test scenario 3 - Request 10 units",
      status: "pending",
    });

    testScenarios.push({
      scenario: "Scenario 3",
      dealer: dealers[2],
      vehicle: vehicles[2],
      color: vehicles[2].colors[0],
      request: req3,
      requestQuantity: 10,
      orderQuantity: 3, // Will order 3 units
    });

    console.log(
      `✓ Created request: ${req3.code} (${vehicles[2].name} ${vehicles[2].colors[0]} x10 - ${dealers[2].name})`
    );
  }
}

// ========== Step 3: Approve & Transfer Stock ==========
async function approveAndTransferStock() {
  console.log("\n🚚 [3/6] Approving requests & transferring stock...");

  for (const scenario of testScenarios) {
    const {request, dealer, vehicle, color} = scenario;

    // ✅ APPROVE REQUEST
    request.status = "approved";
    request.approved_by = evmUser._id;
    request.approved_at = new Date();
    await request.save();

    // ✅ TRANSFER STOCK (với tracking)
    const vehicleDoc = await Vehicle.findById(vehicle.id);

    vehicleDoc.stocks.push({
      owner_type: "dealer",
      owner_id: dealer.id,
      color: color,
      quantity: scenario.requestQuantity,

      // ========== TRACKING FIELDS ==========
      source_request_id: request._id,
      delivered_at: new Date(),
      unit_cost: vehicle.price * 0.8, // Cost basis (80%)
      sold_quantity: 0,
      remaining_quantity: scenario.requestQuantity,
      status: "active",
      created_by: evmUser._id,
      notes: `Test flow - Delivered from ${request.code}`,
    });

    await vehicleDoc.save();
    scenario.stockBatchId = vehicleDoc.stocks[vehicleDoc.stocks.length - 1]._id;

    // ✅ CREATE DEBT (với tracking)
    const totalAmount = vehicle.price * scenario.requestQuantity;

    let debt = await DealerManufacturerDebt.findOne({
      dealership_id: dealer.id,
      manufacturer_id: manufacturer._id,
    });

    const debtItem = {
      request_id: request._id,
      vehicle_id: vehicle.id,
      vehicle_name: vehicle.name,
      color: color,
      unit_price: vehicle.price,
      quantity: scenario.requestQuantity,
      amount: totalAmount,
      delivered_at: new Date(),
      notes: `Test flow - From ${request.code}`,

      // ========== TRACKING FIELDS ==========
      settled_amount: 0,
      remaining_amount: totalAmount,
      sold_quantity: 0,
      settled_by_orders: [],
      status: "pending_payment",
    };

    if (debt) {
      debt.total_amount += totalAmount;
      debt.remaining_amount += totalAmount;
      debt.items.push(debtItem);
      await debt.save();
    } else {
      debt = await DealerManufacturerDebt.create({
        dealership_id: dealer.id,
        manufacturer_id: manufacturer._id,
        total_amount: totalAmount,
        paid_amount: 0,
        remaining_amount: totalAmount,
        status: "open",
        items: [debtItem],
        payments: [],
      });
    }

    request.debt_id = debt._id;
    request.status = "delivered";
    request.delivered_at = new Date();
    await request.save();

    scenario.debtId = debt._id;

    console.log(
      `✓ ${scenario.scenario}: Transferred ${scenario.requestQuantity}x ${vehicle.name} → ${dealer.name}`
    );
    console.log(`  💰 Debt created: ${totalAmount.toLocaleString()}đ`);
  }
}

// ========== Step 4: Create Orders & Deduct Stock (FIFO) ==========
async function createOrdersAndDeductStock() {
  console.log("\n🛒 [4/6] Creating orders & deducting stock (FIFO)...");

  for (const scenario of testScenarios) {
    const {dealer, vehicle, color, orderQuantity} = scenario;

    // Create customer
    const customer = await Customer.create({
      full_name: `Test Customer ${scenario.scenario}`,
      phone: `090${Math.floor(Math.random() * 10000000)}`,
      email: `test.customer.${Date.now()}@example.com`,
      address: `Test address for ${scenario.scenario}`,
      id_card: `TEST${Date.now()}`,
      dealership_id: dealer.id,
    });

    scenario.customer = customer;

    // Create quote
    const quote = await Quote.create({
      code: `TEST-QT-${Date.now()}-${scenario.scenario}`,
      customer_id: customer._id,
      dealership_id: dealer.id,
      salesperson_id: dealer.staff_id,
      items: [
        {
          vehicle_id: vehicle.id,
          vehicle_name: vehicle.name,
          vehicle_price: vehicle.price,
          color: color,
          quantity: orderQuantity,
          accessories: [],
          options: [],
          final_amount: vehicle.price * orderQuantity,
        },
      ],
      final_amount: vehicle.price * orderQuantity,
      status: "valid",
      valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Create order
    const order = await Order.create({
      code: `TEST-ORD-${Date.now()}-${scenario.scenario}`,
      customer_id: customer._id,
      dealership_id: dealer.id,
      quote_id: quote._id,
      items: [
        {
          vehicle_id: vehicle.id,
          vehicle_name: vehicle.name,
          vehicle_price: vehicle.price,
          color: color,
          quantity: orderQuantity,
          accessories: [],
          options: [],
          final_amount: vehicle.price * orderQuantity,
          used_stocks: [], // Will be filled by FIFO deduction
        },
      ],
      final_amount: vehicle.price * orderQuantity,
      paid_amount: 0,
      payment_method: "cash",
      status: "pending",
      stock_source: "in_stock",
    });

    scenario.order = order;

    // ✅ FIFO STOCK DEDUCTION
    const vehicleDoc = await Vehicle.findById(vehicle.id);
    const item = order.items[0];

    const eligibleStocks = vehicleDoc.stocks
      .filter(
        (s) =>
          s.owner_type === "dealer" &&
          s.owner_id.toString() === dealer.id.toString() &&
          s.color === color &&
          s.remaining_quantity > 0 &&
          s.status === "active"
      )
      .sort((a, b) => {
        const dateA = a.delivered_at || new Date(0);
        const dateB = b.delivered_at || new Date(0);
        return dateA - dateB; // FIFO - oldest first
      });

    let remainingToDeduct = orderQuantity;
    const usedStocks = [];

    for (const stock of eligibleStocks) {
      if (remainingToDeduct <= 0) break;

      const deductFromThisStock = Math.min(
        remainingToDeduct,
        stock.remaining_quantity
      );

      stock.sold_quantity += deductFromThisStock;
      stock.remaining_quantity -= deductFromThisStock;

      if (stock.remaining_quantity === 0) {
        stock.status = "depleted";
      }

      usedStocks.push({
        stock_entry_id: stock._id,
        source_request_id: stock.source_request_id,
        quantity: deductFromThisStock,
        unit_cost: stock.unit_cost,
        allocated_at: new Date(),
        notes: "FIFO deduct - Test flow",
      });

      remainingToDeduct -= deductFromThisStock;
    }

    if (remainingToDeduct > 0) {
      console.log(
        `  ⚠️ Warning: Not enough stock! Missing ${remainingToDeduct} units`
      );
    }

    // Save changes
    item.used_stocks = usedStocks;
    order.status = "deposit_paid";
    order.paid_amount = order.final_amount * 0.3; // 30% deposit

    await vehicleDoc.save();
    await order.save();

    console.log(`✓ ${scenario.scenario}: Order ${order.code} created`);
    console.log(
      `  📦 Deducted ${orderQuantity}x ${vehicle.name} (${color}) from ${usedStocks.length} batch(es)`
    );
    usedStocks.forEach((us, idx) => {
      console.log(
        `    - Batch ${idx + 1}: ${us.quantity} unit(s) (stock_entry_id: ${
          us.stock_entry_id
        })`
      );
    });
  }
}

// ========== Step 5: Payment & Debt Settlement ==========
async function createPaymentsAndSettleDebt() {
  console.log("\n💰 [5/6] Creating payments & settling debts...");

  for (const scenario of testScenarios) {
    const {order, customer} = scenario;

    const remainingAmount = order.final_amount - order.paid_amount;

    // Create payment
    const payment = await Payment.create({
      order_id: order._id,
      customer_id: customer._id,
      amount: remainingAmount,
      method: "bank",
      reference: `TEST-PAY-${order.code}`,
      paid_at: new Date(),
      notes: `Test flow - Final payment for ${order.code}`,
    });

    scenario.payment = payment;

    // ✅ SETTLE DEBT BY BATCH
    const item = order.items[0];
    let totalSettled = 0;

    for (const usedStock of item.used_stocks) {
      if (!usedStock.source_request_id) continue;

      // Find RequestVehicle
      const requestVehicle = await RequestVehicle.findById(
        usedStock.source_request_id
      );
      if (!requestVehicle || !requestVehicle.debt_id) continue;

      // Find Debt
      const debt = await DealerManufacturerDebt.findById(
        requestVehicle.debt_id
      );
      if (!debt) continue;

      // Find Debt Item
      const debtItem = debt.items.find(
        (i) =>
          i.request_id.toString() === usedStock.source_request_id.toString()
      );
      if (!debtItem) continue;

      // Calculate payment for this batch
      const stockRatio = usedStock.quantity / item.quantity;
      const stockPayment = Math.round(remainingAmount * stockRatio);

      // ✅ UPDATE DEBT ITEM
      debtItem.settled_amount += stockPayment;
      debtItem.remaining_amount = debtItem.amount - debtItem.settled_amount;
      debtItem.sold_quantity += usedStock.quantity;

      debtItem.settled_by_orders.push({
        order_id: order._id,
        order_code: order.code,
        quantity_sold: usedStock.quantity,
        amount: stockPayment,
        settled_at: new Date(),
        payment_id: payment._id,
        notes: `Test flow - Settled from ${order.code}`,
      });

      // Update item status
      if (debtItem.settled_amount >= debtItem.amount) {
        debtItem.status = "fully_paid";
      } else if (debtItem.settled_amount > 0) {
        debtItem.status = "partial_paid";
      }

      // ✅ RECALCULATE DEBT TOTALS
      debt.paid_amount = debt.items.reduce(
        (sum, i) => sum + (i.settled_amount || 0),
        0
      );
      debt.remaining_amount = debt.total_amount - debt.paid_amount;

      if (debt.remaining_amount <= 0) {
        debt.status = "settled";
      } else if (debt.paid_amount > 0) {
        debt.status = "partial";
      }

      debt.payments.push({
        amount: stockPayment,
        paid_at: new Date(),
        method: payment.payment_method,
        order_id: order._id,
        note: `Test flow - Auto settle from ${order.code}`,
      });

      await debt.save();

      totalSettled += stockPayment;
      console.log(
        `  ✓ Settled ${stockPayment.toLocaleString()}đ for batch (Request: ${
          requestVehicle.code
        })`
      );
    }

    // ✅ UPDATE ORDER
    order.paid_amount = order.final_amount;
    order.status = "fully_paid";
    await order.save();

    console.log(
      `✓ ${
        scenario.scenario
      }: Payment ${remainingAmount.toLocaleString()}đ completed`
    );
    console.log(`  💵 Total settled: ${totalSettled.toLocaleString()}đ`);
  }
}

// ========== Step 6: Verify Tracking ==========
async function verifyTracking() {
  console.log("\n🔍 [6/6] Verifying tracking data...");

  let allPassed = true;

  for (const scenario of testScenarios) {
    console.log(`\n📊 ${scenario.scenario} Verification:`);

    // 1. Check Vehicle Stock
    const vehicleDoc = await Vehicle.findById(scenario.vehicle.id);
    const dealerStocks = vehicleDoc.stocks.filter(
      (s) =>
        s.owner_type === "dealer" &&
        s.owner_id.toString() === scenario.dealer.id.toString() &&
        s.color === scenario.color
    );

    console.log(`  📦 Stock Batches: ${dealerStocks.length}`);
    dealerStocks.forEach((stock, idx) => {
      console.log(`    Batch ${idx + 1}:`);
      console.log(
        `      - source_request_id: ${stock.source_request_id ? "✅" : "❌"}`
      );
      console.log(`      - delivered_at: ${stock.delivered_at ? "✅" : "❌"}`);
      console.log(`      - sold_quantity: ${stock.sold_quantity}`);
      console.log(`      - remaining_quantity: ${stock.remaining_quantity}`);
      console.log(`      - status: ${stock.status}`);

      if (!stock.source_request_id || !stock.delivered_at) allPassed = false;
    });

    // 2. Check Order used_stocks
    const orderDoc = await Order.findById(scenario.order._id);
    const usedStocks = orderDoc.items[0].used_stocks;

    console.log(`  🛒 Order ${orderDoc.code}:`);
    console.log(
      `    - used_stocks count: ${usedStocks.length} ${
        usedStocks.length > 0 ? "✅" : "❌"
      }`
    );
    usedStocks.forEach((us, idx) => {
      console.log(`      Stock ${idx + 1}:`);
      console.log(
        `        - stock_entry_id: ${us.stock_entry_id ? "✅" : "❌"}`
      );
      console.log(
        `        - source_request_id: ${us.source_request_id ? "✅" : "❌"}`
      );
      console.log(`        - quantity: ${us.quantity}`);
      console.log(`        - unit_cost: ${us.unit_cost?.toLocaleString()}đ`);

      if (!us.stock_entry_id || !us.source_request_id) allPassed = false;
    });

    // 3. Check Debt settlement
    const debtDoc = await DealerManufacturerDebt.findById(scenario.debtId);
    const debtItem = debtDoc.items.find(
      (i) => i.request_id.toString() === scenario.request._id.toString()
    );

    console.log("💰 Debt Item:");
    console.log(
      `    - settled_amount: ${debtItem.settled_amount.toLocaleString()}đ`
    );
    console.log(
      `    - remaining_amount: ${debtItem.remaining_amount.toLocaleString()}đ`
    );
    console.log(`    - sold_quantity: ${debtItem.sold_quantity}`);
    console.log(
      `    - settled_by_orders count: ${debtItem.settled_by_orders.length} ${
        debtItem.settled_by_orders.length > 0 ? "✅" : "❌"
      }`
    );

    if (debtItem.settled_by_orders.length > 0) {
      debtItem.settled_by_orders.forEach((sbo, idx) => {
        console.log(`      Settlement ${idx + 1}:`);
        console.log(`        - order_code: ${sbo.order_code}`);
        console.log(`        - quantity_sold: ${sbo.quantity_sold}`);
        console.log(`        - amount: ${sbo.amount.toLocaleString()}đ`);
      });
    } else {
      allPassed = false;
    }
  }

  console.log("\n" + "=".repeat(70));
  if (allPassed) {
    console.log("✅ ALL TESTS PASSED! Tracking is working correctly.");
  } else {
    console.log("❌ SOME TESTS FAILED! Please check the logs above.");
  }
  console.log("=".repeat(70));
}

// ========== Summary ==========
async function printSummary() {
  console.log("\n" + "=".repeat(70));
  console.log("📊 TEST COMPLETE FLOW - SUMMARY");
  console.log("=".repeat(70));

  console.log(`\n✅ Test Scenarios: ${testScenarios.length}`);

  for (const scenario of testScenarios) {
    console.log(`\n${scenario.scenario}:`);
    console.log(`  - Dealer: ${scenario.dealer.name}`);
    console.log(`  - Vehicle: ${scenario.vehicle.name} (${scenario.color})`);
    console.log(
      `  - Request: ${scenario.requestQuantity} units → ${scenario.request.code}`
    );
    console.log(
      `  - Order: ${scenario.orderQuantity} units → ${scenario.order.code}`
    );
    console.log(`  - Customer: ${scenario.customer.full_name}`);
    console.log(`  - Payment: ${scenario.payment.amount.toLocaleString()}đ`);
    console.log(`  - Status: ${scenario.order.status}`);
  }

  console.log("\n" + "=".repeat(70));
  console.log("✅ COMPLETE FLOW TEST FINISHED!");
  console.log("=".repeat(70) + "\n");
}

// ========== Main ==========
async function main() {
  try {
    console.log(
      "🧪 Testing complete flow: Request → Approve → Order → Payment → Debt Settlement"
    );
    console.log(
      `Connecting to: ${MONGODB_URI.replace(
        /\/\/([^:]+):([^@]+)@/,
        "//$1:****@"
      )}`
    );

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Run test steps
    await loadExistingData();
    await createRequestVehicles();
    await approveAndTransferStock();
    await createOrdersAndDeductStock();
    await createPaymentsAndSettleDebt();
    await verifyTracking();

    // Print summary
    await printSummary();

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run test
main();
