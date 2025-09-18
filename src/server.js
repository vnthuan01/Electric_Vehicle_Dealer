import dotenv from "dotenv";
import app from "./app.js";
import {connectDatabase} from "./config/db.js";
import {logInfo, logError} from "./utils/logger.js";

dotenv.config();

const port = process.env.PORT || 5000;

async function start() {
  try {
    await connectDatabase();
    app.listen(port, () => {
      logInfo(`Server listening on http://localhost:${port}`);
    });
  } catch (err) {
    logError("Failed to start server", err);
    process.exit(1);
  }
}

start();
