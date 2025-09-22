import nodemailer from "nodemailer";

import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendMail({to, subject, html}) {
  if (!process.env.MAIL_USER) throw new Error("MAIL_USER not set");
  return transporter.sendMail({from: process.env.MAIL_USER, to, subject, html});
}
