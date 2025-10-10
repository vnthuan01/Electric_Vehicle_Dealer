import Order from "../models/Order.js";
import {success, created, error as errorRes} from "../utils/response.js";
import {
  generateContractPDF,
  saveCustomTemplate,
  getAvailableTemplates,
} from "../services/contractService.js";
import path from "path";
import fs from "fs";

// ==================== GENERATE CONTRACT PDF ====================
export async function generateContract(req, res, next) {
  try {
    const {order_id} = req.params;
    const {template_name = "default", template_data = {}} = req.body;

    // Lấy thông tin đơn hàng
    const order = await Order.findById(order_id)
      .populate("customer_id")
      .populate("dealership_id")
      .lean();

    if (!order) return errorRes(res, "Order not found", 404);
    // Kiểm tra quyền truy cập
    const dealership_id = req.user?.dealership_id;

    if (String(order.dealership_id._id) !== String(dealership_id)) {
      return errorRes(res, "Access denied", 403);
    }

    // Chuẩn bị dữ liệu cho template
    const orderData = {
      ...order,
      customer: order.customer_id,
      dealership: order.dealership_id,
    };

    // Generate PDF
    const pdfBuffer = await generateContractPDF(orderData, {
      ...template_data,
      template_name,
    });

    // Set headers để download PDF
    res.setHeader("Content-Type", "application/pdf");

    const filename = `Hợp-Đồng-Mua-Xe-${order.code}.pdf`;
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
    );

    res.setHeader("Content-Length", pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (e) {
    next(e);
  }
}

// ==================== UPLOAD SIGNED CONTRACT ====================
export async function uploadSignedContract(req, res, next) {
  try {
    const {order_id} = req.params;

    // Kiểm tra đơn hàng
    const order = await Order.findById(order_id);
    if (!order) return errorRes(res, "Order not found", 404);

    const dealership_id = req.user?.dealership_id;
    if (String(order.dealership_id) !== String(dealership_id)) {
      return errorRes(res, "Access denied", 403);
    }

    if (!req.file) {
      return errorRes(res, "No file uploaded", 400);
    }

    // Lưu file đã ký
    const fileUrl = req.file.path;

    // Cập nhật thông tin hợp đồng trong order
    if (!order.contract) {
      order.contract = {};
    }

    order.contract.signed_contract_url = fileUrl;
    order.contract.signed_at = new Date();
    order.contract.signed_by = req.user?.full_name || "Unknown";
    order.contract.uploaded_by = req.user?.id;

    await order.save();

    return success(res, "Signed contract uploaded successfully", {
      contract_url: fileUrl,
      signed_at: order.contract.signed_at,
    });
  } catch (e) {
    next(e);
  }
}

// ==================== GET CONTRACT INFO ====================
export async function getContractInfo(req, res, next) {
  try {
    const {order_id} = req.params;

    const order = await Order.findById(order_id)
      .select("contract customer_id dealership_id")
      .lean();

    if (!order) return errorRes(res, "Order not found", 404);

    const dealership_id = req.user?.dealership_id;
    if (String(order.dealership_id) !== String(dealership_id)) {
      return errorRes(res, "Access denied", 403);
    }

    return success(res, "Contract info retrieved", order.contract || {});
  } catch (e) {
    next(e);
  }
}

// ==================== GET AVAILABLE TEMPLATES ====================
export async function getTemplates(req, res, next) {
  try {
    const templates = await getAvailableTemplates();
    return success(res, "Templates retrieved", templates);
  } catch (e) {
    next(e);
  }
}

// ==================== SAVE CUSTOM TEMPLATE ====================
export async function saveTemplate(req, res, next) {
  try {
    const {template_name, html_content, description} = req.body;

    if (!template_name || !html_content) {
      return errorRes(res, "Template name and HTML content are required", 400);
    }

    const result = await saveCustomTemplate(
      template_name,
      html_content,
      description || ""
    );

    return created(res, "Template saved successfully", result);
  } catch (e) {
    next(e);
  }
}

// ==================== DELETE SIGNED CONTRACT ====================
export async function deleteSignedContract(req, res, next) {
  try {
    const {order_id} = req.params;

    const order = await Order.findById(order_id);
    if (!order) return errorRes(res, "Order not found", 404);

    const dealership_id = req.user?.dealership_id;
    if (String(order.dealership_id) !== String(dealership_id)) {
      return errorRes(res, "Access denied", 403);
    }

    // Xóa file nếu có
    if (order.contract?.signed_contract_url) {
      const filePath = path.join(
        process.cwd(),
        order.contract.signed_contract_url
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Xóa thông tin hợp đồng
    order.contract = undefined;
    await order.save();

    return success(res, "Signed contract deleted successfully", {});
  } catch (e) {
    next(e);
  }
}
