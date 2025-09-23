// services/paypalService.js
import paypal from "@paypal/checkout-server-sdk";

const environment =
  process.env.PAYPAL_ENV === "production"
    ? new paypal.core.LiveEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      )
    : new paypal.core.SandboxEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET
      );

const client = new paypal.core.PayPalHttpClient(environment);

/**
 * Tạo đơn hàng PayPal
 * @param {number} amount - số tiền
 * @param {string} currency - ví dụ 'USD'
 * @param {string} return_url - redirect khi thanh toán thành công
 * @param {string} cancel_url - redirect khi hủy thanh toán
 * @returns {Object} order info
 */
export async function createOrder(
  amount,
  currency = "USD",
  return_url,
  cancel_url
) {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: amount.toString(),
        },
      },
    ],
    application_context: {
      return_url,
      cancel_url,
    },
  });

  const response = await client.execute(request);
  return response.result;
}

/**
 * Capture đơn hàng sau khi khách thanh toán
 * @param {string} orderId
 * @returns {Object} capture info
 */
export async function captureOrder(orderId) {
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  const response = await client.execute(request);
  return response.result;
}
