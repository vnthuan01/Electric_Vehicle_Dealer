import Dealership from "../models/Dealership.js";
import { success, error as errorRes } from "../utils/response.js";
import { paginate } from "../utils/pagination.js";
import { DealerMessage } from "../utils/MessageRes.js";
import User from "../models/User.js";

// Helper: lấy manufacturerId từ user
async function getManufacturerIdFromUser(userId) {
  const currentUser = await User.findById(userId).populate(
    "manufacturer_id",
    "_id name code"
  );
  return currentUser?.manufacturer_id?._id || null;
}

// Helper: kiểm tra quyền truy cập xem một dealership by Id
async function checkDealershipByIdAccess(user, dealershipId) {
  // Lấy thông tin hoàn chỉnh của user, lấy kèm manufacturer, role, dealership
  const currentUser = await User.findById(user.id)
    .select("-password")
    .populate([
      { path: "manufacturer_id", select: "name code" },
      { path: "role_id", select: "name" },
      { path: "dealership_id", select: "company_name code" },
    ]);

  // Chỉ EVM Staff
  if (currentUser.role_id.name === "EVM Staff") {
    return true;
  }

  // Dealer Manager và Dealer Staff chỉ xem được dealership của mình
  if (
    currentUser.role_id.name === "Dealer Manager" ||
    currentUser.role_id.name === "Dealer Staff"
  ) {
    return currentUser.dealership_id._id.toString() === dealershipId;
  }

  return false;
}

// 1. Get all dealerships (EVM Staff only)
export async function getAllDealerships(req, res, next) {
  try {
    const { q, isActive, province, dealer_level, product_distribution } =
      req.query;
    const cond = {}; // Điều kiện tìm kiếm

    console.log(req.query);

    // Filter theo manufacturer của EVM Staff user
    const manufacturerId = await getManufacturerIdFromUser(req.user.id);
    if (manufacturerId) {
      cond.manufacturer_id = manufacturerId;
    }

    // Search filters
    if (q) {
      cond.$or = [
        { company_name: { $regex: q, $options: "i" } },
        { code: { $regex: q, $options: "i" } },
      ];
    }

    // Filter theo tỉnh/thành phố
    if (province) {
      cond["address.province"] = { $regex: province, $options: "i" };
    }

    // Filter theo loại hình đại lý
    if (dealer_level) {
      cond.dealer_level = dealer_level;
    }

    // Filter theo loại sản phẩm phân phối
    if (product_distribution) {
      cond.product_distribution = {
        $regex: product_distribution,
        $options: "i",
      };
    }

    // Filter theo active status
    cond.isActive =
      isActive && (isActive === "true" || isActive === "false")
        ? isActive === "true"
        : true;

    // Pagination
    const result = await paginate(
      Dealership,
      req,
      ["company_name", "code", "address.city"],
      cond,
      [
        { path: "manufacturer_id", select: "name code" },
        { path: "created_by", select: "full_name email" },
      ]
    );

    return success(res, DealerMessage.LIST_RETRIEVED, result);
  } catch (err) {
    next(err);
  }
}

// 2. Get dealership by id (EVM Staff hoặc Dealer thuộc ID đó)
export async function getDealershipById(req, res, next) {
  try {
    const { id } = req.params;

    // Kiểm tra quyền truy cập
    const hasAccess = await checkDealershipByIdAccess(req.user, id);
    if (!hasAccess) {
      return errorRes(
        res,
        "Access denied. You can only view your own dealership.",
        403
      );
    }

    const dealership = await Dealership.findById(id)
      .populate("manufacturer_id", "name code country")
      .populate("created_by", "full_name email");

    if (!dealership) {
      return errorRes(res, DealerMessage.NOT_FOUND, 404);
    }

    return success(res, DealerMessage.DETAIL_RETRIEVED, dealership);
  } catch (err) {
    next(err);
  }
}

// 3. Tạo new dealership (EVM Staff only)
export async function createDealership(req, res, next) {
  try {
    const currentUser = await User.findById(req.user.id).populate(
      "manufacturer_id"
    );

    if (!currentUser?.manufacturer_id) {
      return errorRes(res, "EVM Staff phải thuộc về một manufacturer", 400);
    }

    // Validate required fields
    const {
      code,
      company_name,
      business_license,
      tax_code,
      legal_representative,
      dealer_level,
      product_distribution,
      contract,
      address,
      contact,
      capabilities,
      notes,
    } = req.body;

    // Check if code or tax_code already exists
    const existingDealership = await Dealership.findOne({
      $or: [{ code }, { tax_code }],
    });

    if (existingDealership) {
      return errorRes(
        res,
        existingDealership.code === code
          ? "Mã đại lý đã tồn tại"
          : "Mã số thuế đã tồn tại",
        400
      );
    }

    // Set default services based on dealer_level
    const defaultServices = {
      vehicle_sales: true, // Tất cả đều bán xe
      test_drive: dealer_level !== "1S", // 1S không có lái thử
      spare_parts_sales: dealer_level === "3S", // Chỉ 3S mới bán phụ tùng
    };

    // Merge with provided services
    const finalCapabilities = {
      ...capabilities,
      services: { ...defaultServices, ...capabilities?.services },
    };

    const newDealership = await Dealership.create({
      code,
      company_name,
      business_license,
      tax_code,
      legal_representative,
      manufacturer_id: currentUser.manufacturer_id._id,
      dealer_level: dealer_level || "3S",
      product_distribution: product_distribution || "Ô tô và Xe máy điện",
      contract,
      address,
      contact,
      capabilities: finalCapabilities,
      status: "active",
      isActive: true,
      created_by: req.user.id,
      notes:
        notes || `Đại lý ${dealer_level} được tạo bởi ${currentUser.full_name}`,
    });

    const populatedDealership = await Dealership.findById(newDealership._id)
      .populate("manufacturer_id", "name code")
      .populate("created_by", "full_name email");

    return success(res, "Tạo đại lý thành công", populatedDealership, 201);
  } catch (err) {
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => e.message);
      return errorRes(res, `Validation Error: ${errors.join(", ")}`, 400);
    }
    next(err);
  }
}

// 4. Deactivate dealership (EVM Staff only)
export async function deactivateDealership(req, res, next) {
  try {
    const { id } = req.params;
    const reason = req.body?.reason || "";

    const dealership = await Dealership.findById(id);
    if (!dealership) {
      return errorRes(res, DealerMessage.NOT_FOUND, 404);
    }

    // Check if already deactivated
    if (!dealership.isActive || dealership.status === "inactive") {
      return errorRes(res, "Đại lý đã được vô hiệu hóa trước đó", 400);
    }

    // Update status
    const updatedDealership = await Dealership.findByIdAndUpdate(
      id,
      {
        status: "inactive",
        isActive: false,
        notes: reason
          ? `${
              dealership.notes || ""
            }\n[${new Date().toISOString()}] Vô hiệu hóa: ${reason}`
          : `${
              dealership.notes || ""
            }\n[${new Date().toISOString()}] Đại lý đã được vô hiệu hóa`,
      },
      { new: true }
    ).populate([
      { path: "manufacturer_id", select: "name code" },
      { path: "created_by", select: "full_name email" },
    ]);

    return success(res, "Vô hiệu hóa đại lý thành công", updatedDealership);
  } catch (err) {
    next(err);
  }
}

// 5. Activate/Reactivate dealership (EVM Staff only)
export async function activateDealership(req, res, next) {
  try {
    const { id } = req.params;
    const reason = req.body?.reason || "";

    const dealership = await Dealership.findById(id);
    if (!dealership) {
      return errorRes(res, DealerMessage.NOT_FOUND, 404);
    }

    // Check if already activated
    if (dealership.isActive && dealership.status === "active") {
      return errorRes(res, "Đại lý đã được kích hoạt trước đó", 400);
    }

    // Update status to active
    const updatedDealership = await Dealership.findByIdAndUpdate(
      id,
      {
        status: "active",
        isActive: true,
        notes: reason
          ? `${
              dealership.notes || ""
            }\n[${new Date().toISOString()}] Kích hoạt lại: ${reason}`
          : `${
              dealership.notes || ""
            }\n[${new Date().toISOString()}] Đại lý đã được kích hoạt lại`,
      },
      { new: true }
    ).populate([
      { path: "manufacturer_id", select: "name code" },
      { path: "created_by", select: "full_name email" },
    ]);

    return success(res, "Kích hoạt đại lý thành công", updatedDealership);
  } catch (err) {
    next(err);
  }
}
