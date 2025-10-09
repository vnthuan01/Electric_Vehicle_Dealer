import cron from "node-cron";
import Promotion from "../models/Promotion.js";

// Chạy mỗi khi qua 00:00 ngày hôm sau
cron.schedule("0 0 * * *", async () => {
  const now = new Date();
  const result = await Promotion.updateMany(
    {end_date: {$lt: now}, is_active: true},
    {$set: {is_active: false}}
  );
  if (result.modifiedCount > 0) {
    console.log(
      `[CRON] Deactivated ${result.modifiedCount} expired promotions`
    );
  }
});
