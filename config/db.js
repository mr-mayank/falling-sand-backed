import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(cors());

// Create an HTTP server and integrate Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins (change this for production)
    methods: ["GET", "POST"],
  },
});

// Socket.io for real-time communication
io.on("connection", (socket) => {
  console.log("A user connected");

  // Join a game room
  socket.on("joinGame", (gameId) => {
    socket.join(gameId);
    console.log(`User joined game: ${gameId}`);
  });

  // Handle real-time game updates
  socket.on("gameUpdate", (gameId, data) => {
    io.to(gameId).emit("update", data);
  });

  // Disconnect event
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// Default route for health check
app.get("/", (req, res) => {
  res.send("API is running...");
});

// 404 Error Handling Middleware
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ message: "Internal Server Error" });
});

// MongoDB Connection and Server Startup
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    httpServer.listen(process.env.PORT, () =>
      console.log(`Server running on http://localhost:${process.env.PORT}`)
    );
  })
  .catch((error) => console.log(`${error} did not connect`));
