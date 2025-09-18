import Twilio from "twilio";

const client = () => {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error("TWILIO credentials not set");
  }
  return new Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
};

export async function sendSms({to, body}) {
  const twilioPhone = process.env.TWILIO_PHONE;
  if (!twilioPhone) throw new Error("TWILIO_PHONE not set");
  return client().messages.create({to, from: twilioPhone, body});
}
