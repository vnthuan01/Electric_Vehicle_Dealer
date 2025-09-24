import axios from "axios";
import crypto from "crypto";

const ZALO_API =
  process.env.ZALOPAY_ENV === "production"
    ? "https://openapi.zalopay.vn/v2/create"
    : "https://sb-openapi.zalopay.vn/v2/create";

const APP_ID = process.env.ZALOPAY_APP_ID;
const KEY1 = process.env.ZALOPAY_KEY1;
const CALLBACK_URL = process.env.ZALOPAY_CALLBACK_URL;

/**
 * Tạo MAC cho request ZaloPay
 * @param {Object} payload
 * @param {string} key
 * @returns {string} mac
 */
function generateMac(payload, key) {
  const embedData = JSON.stringify(payload.embed_data || {});
  const item = JSON.stringify(payload.item || []);

  const data = [
    payload.app_id,
    payload.app_trans_id,
    payload.app_user,
    payload.amount,
    payload.app_time,
    embedData,
    item,
  ].join("|");

  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

/**
 * Tạo đơn hàng ZaloPay
 * @param {Object} orderData
 * @returns {Object} response từ ZaloPay
 */
export async function createZalopayOrder(orderData) {
  const payload = {
    app_id: APP_ID,
    app_trans_id: orderData.app_trans_id, // ví dụ: order_123456
    app_user: orderData.app_user || "demo",
    amount: orderData.amount,
    app_time: Date.now(),
    bank_code: orderData.bank_code || "",
    description: orderData.description || "",
    embed_data: orderData.embed_data || {},
    item: orderData.item || [],
    callback_url: CALLBACK_URL,
    return_url: orderData.return_url || "",
  };

  // Tạo chữ ký MAC
  payload.mac = generateMac(payload, KEY1);

  try {
    const response = await axios.post(ZALO_API, payload, {
      headers: {"Content-Type": "application/json"},
    });
    return response.data;
  } catch (error) {
    console.error(
      "ZaloPay createOrder error:",
      error.response?.data || error.message
    );
    throw error;
  }
}

/**
 * Xác thực callback từ ZaloPay
 * @param {Object} callbackData
 * @returns {boolean}
 */
export function verifyCallback(callbackData) {
  const mac = callbackData.mac;
  const data = [
    callbackData.app_id,
    callbackData.app_trans_id,
    callbackData.zp_trans_id,
    callbackData.amount,
    callbackData.status,
  ].join("|");

  const checkMac = crypto.createHmac("sha256", KEY1).update(data).digest("hex");
  return checkMac === mac;
}
