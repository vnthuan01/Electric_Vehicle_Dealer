import mongoose from "mongoose";
import User from "./src/models/User.js";
import Role from "./src/models/Role.js";
import Manufacturer from "./src/models/Manufacturer.js";
import Dealership from "./src/models/Dealership.js";
import { hashPassword } from "./src/utils/password.js";
import dotenv from "dotenv";

dotenv.config();

const mongoUri = process.env.MONGO_URI;

async function seed() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // 1. Seed Roles & Users
    const roles = ["Admin", "EVM Staff", "Dealer Manager", "Dealer Staff"];
    const roleDocs = {};
    for (const roleName of roles) {
      let role = await Role.findOne({ name: roleName });
      if (!role) role = await Role.create({ name: roleName });
      roleDocs[roleName] = role;
    }

    // Tạo users cơ bản trước (Admin, EVM Staff)
    const basicUsers = [
      {
        full_name: "Admin User",
        email: "admin@example.com",
        password: "Admin123!",
        role: "Admin",
      },
      {
        full_name: "EVM Staff User",
        email: "evm@vinfast.vn",
        phone: "0901234567",
        address: "Hanoi, Vietnam",
        password: "Evm123!",
        role: "EVM Staff",
      },
    ];

    const userDocs = {};
    for (const u of basicUsers) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        const hashed = await hashPassword(u.password);
        user = await User.create({
          full_name: u.full_name,
          email: u.email,
          phone: u.phone || "",
          address: u.address || "",
          password: hashed,
          role_id: roleDocs[u.role]._id,
        });
        console.log(`User created: ${u.full_name}`);
      }
      userDocs[u.role] = user;
    }

    // 2. Seed Manufacturer
    const manufacturers = [
      {
        name: "VinFast Vietnam",
        code: "VF-VN",
        country: "Vietnam",
        founded: new Date("2017-01-01"),
      },
    ];

    let manufacturer;
    for (const m of manufacturers) {
      manufacturer = await Manufacturer.findOne({ code: m.code });
      if (!manufacturer) {
        manufacturer = await Manufacturer.create(m);
        console.log(`Manufacturer created: ${m.name}`);
      }
    }

    // Cập nhật EVM Staff với manufacturer_id
    await User.findByIdAndUpdate(userDocs["EVM Staff"]._id, {
      manufacturer_id: manufacturer._id,
    });
    console.log("Updated EVM Staff with manufacturer_id");

    // 3. Seed Dealerships (đa dạng theo thực tế)
    const dealerships = [
      // HCM
      {
        code: "VF_HCM_3S_006",
        company_name: "Showroom VinFast – Chevrolet Đại Việt",
        business_license: "0666777888",
        tax_code: "0666777888-006",
        legal_representative: "Nguyễn Văn F",
        manufacturer_id: manufacturer._id,
        dealer_level: "3S",
        product_distribution: "Ô tô",

        contract: {
          contract_number: "HD_VF_006_2024",
          signed_date: new Date("2024-06-01"),
          expiry_date: new Date("2026-06-01"),
          territory: "TP.HCM Quận 7",
          exclusive_territory: false,
        },

        address: {
          street: "Số 1489 đường Nguyễn Văn Linh",
          district: "Quận 7",
          city: "TP.HCM",
          province: "Thành phố Hồ Chí Minh",
          full_address:
            "Số 1489 đường Nguyễn Văn Linh, phường Tân Phong, quận 7, TP Hồ Chí Minh",
        },

        contact: {
          phone: "028-1111-2222",
          email: "daiviet.q7@vinfast.vn",
          hotline: "1900-1111",
        },

        capabilities: {
          showroom_area: 450,
          display_capacity: 14,
          services: {
            vehicle_sales: true, // Bán xe - dịch vụ cốt lõi
            test_drive: true, // 3S có lái thử
            spare_parts_sales: true, // 3S có bán phụ tùng
          },
          total_staff: 22,
          sales_staff: 14,
          support_staff: 8, // nhân viên hỗ trợ lái thử và phụ tùng
        },

        status: "active",
        isActive: true,
        created_by: userDocs["EVM Staff"]._id,
        notes: "Showroom 3S tại Quận 7 TP.HCM",
      },

      {
        code: "VF_HCM_3S_007",
        company_name: "Showroom VinFast Phạm Văn Đồng",
        business_license: "0777888999",
        tax_code: "0777888999-007",
        legal_representative: "Trần Thị G",
        manufacturer_id: manufacturer._id,
        dealer_level: "3S",
        product_distribution: "Ô tô",

        contract: {
          contract_number: "HD_VF_007_2024",
          signed_date: new Date("2024-06-15"),
          expiry_date: new Date("2026-06-15"),
          territory: "TP.HCM Quận Bình Tân",
          exclusive_territory: false,
        },

        address: {
          street: "Số 464 đường Kinh Dương Vương",
          district: "Quận Bình Tân",
          city: "TP.HCM",
          province: "Thành phố Hồ Chí Minh",
          full_address:
            "Số 464 đường Kinh Dương Vương, phường An Lạc A, quận Bình Tân, TP Hồ Chí Minh",
        },

        contact: {
          phone: "028-2222-3333",
          email: "phamvandong@vinfast.vn",
          hotline: "1900-2222",
        },

        capabilities: {
          showroom_area: 380,
          display_capacity: 12,
          services: {
            vehicle_sales: true, // Bán xe - dịch vụ cốt lõi
            test_drive: true, // 3S có lái thử
            spare_parts_sales: true, // 3S có bán phụ tùng
          },
          total_staff: 20,
          sales_staff: 12,
          support_staff: 8, // nhân viên hỗ trợ lái thử và phụ tùng
        },

        status: "active",
        isActive: true,
        created_by: userDocs["EVM Staff"]._id,
        notes: "Showroom 3S tại Bình Tân TP.HCM",
      },

      // Hà Nội
      {
        code: "VF_HN_3S_008",
        company_name: "Showroom VIN3S Thái Hòa",
        business_license: "0888999000",
        tax_code: "0888999000-008",
        legal_representative: "Lê Văn H",
        manufacturer_id: manufacturer._id,
        dealer_level: "3S",
        product_distribution: "Ô tô",

        contract: {
          contract_number: "HD_VF_008_2024",
          signed_date: new Date("2024-07-01"),
          expiry_date: new Date("2026-07-01"),
          territory: "Hà Nội Quốc Oai",
          exclusive_territory: false,
        },

        address: {
          street: "Khu công nghiệp Thạch Thất – Quốc Oai",
          district: "Huyện Quốc Oai",
          city: "Hà Nội",
          province: "Thành phố Hà Nội",
          full_address:
            "Khu công nghiệp Thạch Thất – Quốc Oai, Thị Trấn Quốc Oai, Huyện Quốc Oai, Hà Nội, Vietnam",
        },

        contact: {
          phone: "024-3333-4444",
          email: "thaihoa@vinfast.vn",
          hotline: "1900-3333",
        },

        capabilities: {
          showroom_area: 320,
          display_capacity: 10,
          services: {
            vehicle_sales: true, // Bán xe - dịch vụ cốt lõi
            test_drive: true, // 3S có lái thử
            spare_parts_sales: true, // 3S có bán phụ tùng
          },
          total_staff: 18,
          sales_staff: 11,
          support_staff: 7, // nhân viên hỗ trợ lái thử và phụ tùng
        },

        status: "active",
        isActive: true,
        created_by: userDocs["EVM Staff"]._id,
        notes: "Showroom 3S tại Quốc Oai Hà Nội",
      },

      {
        code: "VF_HN_3S_009",
        company_name: "Showroom VIN3S Nam Đàn",
        business_license: "0999000111",
        tax_code: "0999000111-009",
        legal_representative: "Phạm Thị I",
        manufacturer_id: manufacturer._id,
        dealer_level: "3S",
        product_distribution: "Ô tô",

        contract: {
          contract_number: "HD_VF_009_2024",
          signed_date: new Date("2024-07-15"),
          expiry_date: new Date("2026-07-15"),
          territory: "Hà Nội Đống Đa",
          exclusive_territory: false,
        },

        address: {
          street: "162 Phố Trường Chinh",
          district: "Quận Đống Đa",
          city: "Hà Nội",
          province: "Thành phố Hà Nội",
          full_address:
            "162 Phố Trường Chinh, phường Khương Thượng, quận Đống Đa, TP. Hà Nội",
        },

        contact: {
          phone: "024-4444-5555",
          email: "namdan@vinfast.vn",
          hotline: "1900-4444",
        },

        capabilities: {
          showroom_area: 350,
          display_capacity: 11,
          services: {
            vehicle_sales: true, // Bán xe - dịch vụ cốt lõi
            test_drive: true, // 3S có lái thử
            spare_parts_sales: true, // 3S có bán phụ tùng
          },
          total_staff: 19,
          sales_staff: 12,
          support_staff: 7, // nhân viên hỗ trợ lái thử và phụ tùng
        },

        status: "active",
        isActive: true,
        created_by: userDocs["EVM Staff"]._id,
        notes: "Showroom 3S tại Đống Đa Hà Nội",
      },

      // Đà Nẵng
      {
        code: "VF_DN_3S_010",
        company_name: "Showroom VIN3S Phan Rang",
        business_license: "0000111222",
        tax_code: "0000111222-010",
        legal_representative: "Hoàng Văn J",
        manufacturer_id: manufacturer._id,
        dealer_level: "3S",
        product_distribution: "Ô tô",

        contract: {
          contract_number: "HD_VF_010_2024",
          signed_date: new Date("2024-08-01"),
          expiry_date: new Date("2026-08-01"),
          territory: "Đà Nẵng Hải Châu",
          exclusive_territory: false,
        },

        address: {
          street: "115 Nguyễn Văn Linh",
          district: "Quận Hải Châu",
          city: "Đà Nẵng",
          province: "Thành phố Đà Nẵng",
          full_address:
            "115 Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, Thành phố Đà Nẵng, Việt Nam",
        },

        contact: {
          phone: "0236-5555-6666",
          email: "phanrang@vinfast.vn",
          hotline: "1900-5555",
        },

        capabilities: {
          showroom_area: 280,
          display_capacity: 9,
          services: {
            vehicle_sales: true, // Bán xe - dịch vụ cốt lõi
            test_drive: true, // 3S có lái thử
            spare_parts_sales: true, // 3S có bán phụ tùng
          },
          total_staff: 16,
          sales_staff: 10,
          support_staff: 6, // nhân viên hỗ trợ lái thử và phụ tùng
        },

        status: "active",
        isActive: true,
        created_by: userDocs["EVM Staff"]._id,
        notes: "Showroom 3S tại Hải Châu Đà Nẵng",
      },

      // Trà Vinh
      {
        code: "VF_TV_3S_011",
        company_name: "Showroom VIN3S Lạc Long Quân",
        business_license: "0111222333",
        tax_code: "0111222333-011",
        legal_representative: "Vũ Thị K",
        manufacturer_id: manufacturer._id,
        dealer_level: "3S",
        product_distribution: "Ô tô và Xe máy điện",

        contract: {
          contract_number: "HD_VF_011_2024",
          signed_date: new Date("2024-08-15"),
          expiry_date: new Date("2026-08-15"),
          territory: "Trà Vinh",
          exclusive_territory: false,
        },

        address: {
          street: "Tầng 1, TTTM Vincom Trà Vinh, 24 Nguyễn Thị Minh Khai",
          district: "Phường 2",
          city: "TP. Trà Vinh",
          province: "Tỉnh Trà Vinh",
          full_address:
            "Tầng 1, TTTM Vincom Trà Vinh, 24 Nguyễn Thị Minh Khai, Phường 2, TP. Trà Vinh, tỉnh Trà Vinh",
        },

        contact: {
          phone: "0294-6666-7777",
          email: "laclongquan@vinfast.vn",
          hotline: "1900-6666",
        },

        capabilities: {
          showroom_area: 250,
          display_capacity: 8,
          services: {
            vehicle_sales: true, // Bán xe - dịch vụ cốt lõi
            test_drive: true, // 3S có lái thử
            spare_parts_sales: true, // 3S có bán phụ tùng
          },
          total_staff: 14,
          sales_staff: 9,
          support_staff: 5, // nhân viên hỗ trợ lái thử và phụ tùng
        },

        status: "active",
        isActive: true,
        created_by: userDocs["EVM Staff"]._id,
        notes: "Showroom 3S tại Trà Vinh",
      },

      {
        code: "VF_TN_3S_012",
        company_name: "Showroom VIN3S Hiệp Bình Phước",
        business_license: "0222333444",
        tax_code: "0222333444-012",
        legal_representative: "Đỗ Văn L",
        manufacturer_id: manufacturer._id,
        dealer_level: "3S",
        product_distribution: "Ô tô và Xe máy điện",

        contract: {
          contract_number: "HD_VF_012_2024",
          signed_date: new Date("2024-09-01"),
          expiry_date: new Date("2026-09-01"),
          territory: "Tây Ninh",
          exclusive_territory: false,
        },

        address: {
          street: "Tầng L1, TTTM Vincom Plaza Tây Ninh, 444 Ba Mươi Tháng Tư",
          district: "Phường 3",
          city: "TP.Tây Ninh",
          province: "Tỉnh Tây Ninh",
          full_address:
            "Tầng L1, TTTM Vincom Plaza Tây Ninh, 444 Ba Mươi Tháng Tư, Khu phố 1, Phường 3, TP.Tây Ninh, tỉnh Tây Ninh",
        },

        contact: {
          phone: "0276-7777-8888",
          email: "hiepbinhphuoc@vinfast.vn",
          hotline: "1900-7777",
        },

        capabilities: {
          showroom_area: 220,
          display_capacity: 7,
          services: {
            vehicle_sales: true, // Bán xe - dịch vụ cốt lõi
            test_drive: true, // 3S có lái thử
            spare_parts_sales: true, // 3S có bán phụ tùng
          },
          total_staff: 12,
          sales_staff: 8,
          support_staff: 4, // nhân viên hỗ trợ lái thử và phụ tùng
        },

        status: "active",
        isActive: true,
        created_by: userDocs["EVM Staff"]._id,
        notes: "Showroom 3S tại Tây Ninh",
      },
    ];

    const dealershipDocs = {};
    for (const d of dealerships) {
      let dealership = await Dealership.findOne({ code: d.code });
      if (!dealership) {
        dealership = await Dealership.create(d);
        console.log(`Dealership created: ${d.company_name}`);
      }
      dealershipDocs[d.code] = dealership;
    }

    // 4. Seed Dealer Users (Manager và Staff cho mỗi dealership)
    const dealerUsers = [
      // === HCM ===
      // VF_HCM_3S_006 - Showroom VinFast – Chevrolet Đại Việt
      {
        full_name: "Lê Quản Lý Đại Việt",
        email: "manager.daiviet@vinfast.vn",
        phone: "0902222221",
        address: "TP.HCM",
        password: "Manager123!",
        role: "Dealer Manager",
        dealership_code: "VF_HCM_3S_006",
      },
      {
        full_name: "Phạm Nhân Viên Đại Việt",
        email: "staff.daiviet@vinfast.vn",
        phone: "0902222222",
        address: "TP.HCM",
        password: "Staff123!",
        role: "Dealer Staff",
        dealership_code: "VF_HCM_3S_006",
      },

      // VF_HCM_3S_007 - Showroom VinFast Phạm Văn Đồng
      {
        full_name: "Lê Quản Lý Phạm Văn Đồng",
        email: "manager.phamvandong@vinfast.vn",
        phone: "0907777771",
        address: "TP.HCM",
        password: "Manager123!",
        role: "Dealer Manager",
        dealership_code: "VF_HCM_3S_007",
      },
      {
        full_name: "Phạm Nhân Viên Phạm Văn Đồng",
        email: "staff.phamvandong@vinfast.vn",
        phone: "0907777772",
        address: "TP.HCM",
        password: "Staff123!",
        role: "Dealer Staff",
        dealership_code: "VF_HCM_3S_007",
      },

      // === HÀ NỘI ===
      // VF_HN_3S_008 - Showroom VIN3S Thái Hòa
      {
        full_name: "Nguyễn Quản Lý Thái Hòa",
        email: "manager.thaihoa@vinfast.vn",
        phone: "0908888881",
        address: "Hà Nội",
        password: "Manager123!",
        role: "Dealer Manager",
        dealership_code: "VF_HN_3S_008",
      },
      {
        full_name: "Trần Nhân Viên Thái Hòa",
        email: "staff.thaihoa@vinfast.vn",
        phone: "0908888882",
        address: "Hà Nội",
        password: "Staff123!",
        role: "Dealer Staff",
        dealership_code: "VF_HN_3S_008",
      },

      // VF_HN_3S_009 - Showroom VIN3S Nam Đàn
      {
        full_name: "Lê Quản Lý Nam Đàn",
        email: "manager.namdan@vinfast.vn",
        phone: "0909999991",
        address: "Hà Nội",
        password: "Manager123!",
        role: "Dealer Manager",
        dealership_code: "VF_HN_3S_009",
      },
      {
        full_name: "Phạm Nhân Viên Nam Đàn",
        email: "staff.namdan@vinfast.vn",
        phone: "0909999992",
        address: "Hà Nội",
        password: "Staff123!",
        role: "Dealer Staff",
        dealership_code: "VF_HN_3S_009",
      },

      // === ĐÀ NẴNG ===
      // VF_DN_3S_010 - Showroom VIN3S Phan Rang
      {
        full_name: "Hoàng Quản Lý Phan Rang",
        email: "manager.phanrang@vinfast.vn",
        phone: "0910101011",
        address: "Đà Nẵng",
        password: "Manager123!",
        role: "Dealer Manager",
        dealership_code: "VF_DN_3S_010",
      },
      {
        full_name: "Vũ Nhân Viên Phan Rang",
        email: "staff.phanrang@vinfast.vn",
        phone: "0910101012",
        address: "Đà Nẵng",
        password: "Staff123!",
        role: "Dealer Staff",
        dealership_code: "VF_DN_3S_010",
      },

      // === TRÀ VINH ===
      // VF_TV_3S_011 - Showroom VIN3S Lạc Long Quân
      {
        full_name: "Đỗ Quản Lý Lạc Long Quân",
        email: "manager.laclongquan@vinfast.vn",
        phone: "0911111111",
        address: "Trà Vinh",
        password: "Manager123!",
        role: "Dealer Manager",
        dealership_code: "VF_TV_3S_011",
      },
      {
        full_name: "Bùi Nhân Viên Lạc Long Quân",
        email: "staff.laclongquan@vinfast.vn",
        phone: "0911111112",
        address: "Trà Vinh",
        password: "Staff123!",
        role: "Dealer Staff",
        dealership_code: "VF_TV_3S_011",
      },

      // === TÂY NINH ===
      // VF_TN_3S_012 - Showroom VIN3S Hiệp Bình Phước
      {
        full_name: "Mai Quản Lý Hiệp Bình Phước",
        email: "manager.hiepbinhphuoc@vinfast.vn",
        phone: "0912121212",
        address: "Tây Ninh",
        password: "Manager123!",
        role: "Dealer Manager",
        dealership_code: "VF_TN_3S_012",
      },
      {
        full_name: "Lý Nhân Viên Hiệp Bình Phước",
        email: "staff.hiepbinhphuoc@vinfast.vn",
        phone: "0912121213",
        address: "Tây Ninh",
        password: "Staff123!",
        role: "Dealer Staff",
        dealership_code: "VF_TN_3S_012",
      },
    ];

    for (const u of dealerUsers) {
      let user = await User.findOne({ email: u.email });
      if (!user) {
        const hashed = await hashPassword(u.password);
        user = await User.create({
          full_name: u.full_name,
          email: u.email,
          phone: u.phone,
          address: u.address,
          password: hashed,
          role_id: roleDocs[u.role]._id,
          dealership_id: dealershipDocs[u.dealership_code]._id,
        });
        console.log(`Dealer user created: ${u.full_name} (${u.role})`);
      }
    }

    console.log("\n🎉 Seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log("- 1 Admin user");
    console.log("- 1 EVM Staff user");
    console.log("- 12 Dealerships (đa dạng loại hình)");
    console.log("- 24 Dealer users (12 managers + 12 staff)");
    console.log("\n🏢 Dealership Types:");
    console.log("- 3S: Sales + Service + Spare parts (11 dealerships)");
    console.log("- 1S: Showroom only (1 dealership)");
    console.log("\n🚗 Product Distribution:");
    console.log("- Ô tô: 9 dealerships");
    console.log("- Xe máy điện: 1 dealership");
    console.log("- Ô tô và Xe máy điện: 2 dealerships");
    console.log("\n🌍 Địa điểm:");
    console.log("- Thành phố Hà Nội: 5 dealerships");
    console.log("- Thành phố Hồ Chí Minh: 3 dealerships");
    console.log("- Thành phố Đà Nẵng: 1 dealership");
    console.log("- Thành phố Cần Thơ: 1 dealership");
    console.log("- Tỉnh Thái Nguyên: 1 dealership");
    console.log("- Tỉnh Trà Vinh: 1 dealership");
    console.log("- Tỉnh Tây Ninh: 1 dealership");
    console.log("\n🔑 Sample Test credentials:");
    console.log("EVM Staff: evm@vinfast.vn / Evm123!");
    console.log("Manager 3S HN: manager.truongchinh@vinfast.vn / Manager123!");
    console.log("Manager 3S HCM: manager.daiviet@vinfast.vn / Manager123!");
    console.log("Manager 1S HN: manager.timescity@vinfast.vn / Manager123!");
    console.log(
      "Manager Đại Việt Q7: manager.daiviet.q7@vinfast.vn / Manager123!"
    );
    console.log(
      "Manager Phạm Văn Đồng: manager.phamvandong@vinfast.vn / Manager123!"
    );
    console.log("... và 7 cặp manager/staff khác");

    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
