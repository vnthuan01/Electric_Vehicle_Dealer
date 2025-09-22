import dotenv from "dotenv";
import http from "http";
import app from "./app.js";
import {connectDatabase} from "./config/db.js";
import {logInfo, logError} from "./utils/logger.js";
import {socketConfig} from "./config/socket.js";
import {Server} from "socket.io";

dotenv.config();

const server = http.createServer(app);
const port = process.env.PORT || 5000;

const io = new Server(server, {
  cors: {
    origin: "*", // cho phép mọi domain (có thể set cụ thể: "http://localhost:3000")
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

async function start() {
  try {
    await connectDatabase();
    socketConfig(io);
    server.listen(port, () => {
      logInfo(`Server listening on http://localhost:${port}/api-docs`);
    });
  } catch (err) {
    logError("Failed to start server", err);
    process.exit(1);
  }
}

start();
