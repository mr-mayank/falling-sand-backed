import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
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

const activeGames = new Map();

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("joinGame", ({ playerId, gameId }) => {
    socket.playerId = playerId;
    socket.gameId = gameId;

    // Store in active games
    if (!activeGames.has(gameId)) {
      activeGames.set(gameId, new Set());
    }
    activeGames.get(gameId).add(playerId);

    // Join the game room
    socket.join(gameId);
  });

  socket.on("reconnect_player", async ({ playerId, gameId }) => {
    try {
      // Verify player was in game
      const gamePlayers = activeGames.get(gameId);
      if (gamePlayers?.has(playerId)) {
        // Rejoin room
        socket.join(gameId);

        // Get current game state
        const game = await Battleship.findOne({ roomId: gameId });

        // Send current game state
        socket.emit("game_state_sync", game);

        // Notify other players
        socket.to(gameId).emit("player_reconnected", { playerId });
      }
    } catch (error) {
      socket.emit("reconnect_error", { message: "Failed to reconnect" });
    }
  });

  socket.on("disconnect", () => {
    if (socket.gameId && socket.playerId) {
      // Don't remove immediately, wait for potential reconnect
      setTimeout(() => {
        const gamePlayers = activeGames.get(socket.gameId);
        if (gamePlayers) {
          gamePlayers.delete(socket.playerId);
          if (gamePlayers.size === 0) {
            activeGames.delete(socket.gameId);
          }
        }
      }, 60000); // 1 minute grace period
    }
  });

  socket.on("gameUpdate", (gameId, data) => {
    io.to(gameId).emit("update", data);
  });
});


app.get("/", (req, res) => {
  res.send("API is running...");
});

app.use("/user", userRoutes);
app.use("/battleship", battleShipRoutes);

// 404 Error Handling Middleware
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ message: "Internal Server Error" });
});


connectDB(); // Use the connectDB function to connect to MongoDB
httpServer.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
