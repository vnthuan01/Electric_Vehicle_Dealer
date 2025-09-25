const express = require("express");
const router = express.Router();
const client = require("../twilioClient");

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

module.exports = router;
