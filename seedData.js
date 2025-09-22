import mongoose from "mongoose";
import User from "./src/models/User.js";
import Role from "./src/models/Role.js";
import Manufacturer from "./src/models/Manufacturer.js";
import Dealership from "./src/models/Dealership.js";
import {hashPassword} from "./src/utils/password.js";
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
      let role = await Role.findOne({name: roleName});
      if (!role) role = await Role.create({name: roleName});
      roleDocs[roleName] = role;
    }

    const users = [
      {
        full_name: "Admin User",
        email: "admin@example.com",
        password: "Admin123!",
        role: "Admin",
      },
      {
        full_name: "EVM Staff User",
        email: "evm@example.com",
        password: "Evm123!",
        role: "EVM Staff",
      },
      {
        full_name: "Dealer Manager User",
        email: "manager@example.com",
        password: "Manager123!",
        role: "Dealer Manager",
      },
      {
        full_name: "Dealer Staff User",
        email: "staff@example.com",
        password: "Staff123!",
        role: "Dealer Staff",
      },
    ];

    for (const u of users) {
      const exist = await User.findOne({email: u.email});
      if (!exist) {
        const hashed = await hashPassword(u.password);
        await User.create({
          full_name: u.full_name,
          email: u.email,
          password: hashed,
          role_id: roleDocs[u.role]._id,
        });
        console.log(`User created: ${u.full_name}`);
      }
    }

    // 2. Seed Manufacturer
    const manufacturers = [
      {
        name: "VinFast Vietnam",
        code: "VF-VN",
        country: "Vietnam",
        founded: 2017,
      },
    ];
    for (const m of manufacturers) {
      const exist = await Manufacturer.findOne({code: m.code});
      if (!exist) {
        await Manufacturer.create(m);
        console.log(`Manufacturer created: ${m.name}`);
      }
    }

    // 3. Seed Dealerships
    const dealerships = [
      {
        name: "VinFast Hanoi",
        code: "VF-HN",
        address: "123 Nguyen Trai, Hanoi",
        phone: "0241234567",
        email: "hanoi@vinfast.vn",
      },
      {
        name: "VinFast Ho Chi Minh",
        code: "VF-HCM",
        address: "456 Le Lai, HCMC",
        phone: "0287654321",
        email: "hcm@vinfast.vn",
      },
      {
        name: "VinFast Da Nang",
        code: "VF-DN",
        address: "789 Tran Phu, Da Nang",
        phone: "0236123456",
        email: "danang@vinfast.vn",
      },
    ];
    for (const d of dealerships) {
      const exist = await Dealership.findOne({code: d.code});
      if (!exist) {
        await Dealership.create(d);
        console.log(`Dealership created: ${d.name}`);
      }
    }

    console.log("Seeding completed!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

seed();
