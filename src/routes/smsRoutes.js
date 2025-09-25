import client from "../config/twilioClient.js";
import express from "express";
const router = express.Router();

// POST /sms
router.post("/", async (req, res) => {
  try {
    const {to, message} = req.body;

    if (!to || !message) {
      return res.status(400).json({error: "Missing 'to' or 'message'"});
    }

    const sms = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE, // số Twilio
      to: to, // số người nhận
    });

    res.json({success: true, sid: sms.sid});
  } catch (error) {
    res.status(500).json({success: false, error: error.message});
  }
});

export default router;
