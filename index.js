import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import GameSocketHandler from "./config/socket.js";
import userRoutes from "./routes/user.js";
import battleShipRoutes from "./routes/battleship.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const gameSocketHandler = new GameSocketHandler(io);
gameSocketHandler.initialize();

app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/auth-service/v1/auth", userRoutes);
app.use("/battleship/v1", battleShipRoutes);

// 404 Error Handling Middleware
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ message: "Internal Server Error" });
});

connectDB();
httpServer.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
