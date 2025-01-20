import axios from "axios";

axios.defaults.baseURL = process.env.API_BASE_URL || "http://localhost:8080";
class GameSocketHandler {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map();
    this.disconnectionTimers = new Map(); // Store disconnection timers
  }

  initialize() {
    this.io.on("connection", (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    socket.on("joinGame", (data) => this.handleJoinGame(socket, data));
    socket.on("leaveGame", (data) => this.handleLeaveGame(socket, data));
    socket.on("startGame", (data) => this.handleStartGame(socket, data));
    socket.on("kickPlayer", (data) => this.handleKickPlayer(socket, data));
    socket.on("disconnect", () => this.handleDisconnect(socket));
    socket.on("creationComplete", (data) =>
      this.handleCreationComplete(socket, data)
    );
    socket.on("makeMove", (data) => this.handleMakeMove(socket, data));
    socket.on("reconnect_player", (data) =>
      this.handleReconnectPlayer(socket, data)
    );
  }

  handleJoinGame(socket, { playerId, gameId }) {
    socket.playerId = playerId;
    socket.gameId = gameId;

    // Clear any existing disconnection timer for this player
    if (this.disconnectionTimers.has(playerId)) {
      clearTimeout(this.disconnectionTimers.get(playerId));
      this.disconnectionTimers.delete(playerId);
    }

    // Store in active games
    if (!this.activeGames.has(gameId)) {
      this.activeGames.set(gameId, new Set());
    }
    this.activeGames.get(gameId).add(playerId);

    // Join the game room
    socket.join(gameId);
    this.io.to(gameId).emit("playerJoined", { playerId, gameId });
  }

  handleLeaveGame(socket, { playerId, gameId }) {
    // Clear any existing disconnection timer
    if (this.disconnectionTimers.has(playerId)) {
      clearTimeout(this.disconnectionTimers.get(playerId));
      this.disconnectionTimers.delete(playerId);
    }

    this.removePlayerFromGame(playerId, gameId);
    this.io.to(gameId).emit("playerLeft", { playerId, gameId });
  }

  handleStartGame(socket, { gameId }) {
    // Clear disconnection timers for all players in this game
    const gamePlayers = this.activeGames.get(gameId);
    if (gamePlayers) {
      for (const playerId of gamePlayers) {
        if (this.disconnectionTimers.has(playerId)) {
          clearTimeout(this.disconnectionTimers.get(playerId));
          this.disconnectionTimers.delete(playerId);
        }
      }
    }

    this.io.to(gameId).emit("gameStarted", { gameId });
  }

  handleKickPlayer(socket, { kickedPlayerId, gameId }) {
    this.removePlayerFromGame(kickedPlayerId, gameId);
    this.io.to(gameId).emit("playerKicked", { kickedPlayerId, gameId });
  }

  async handleReconnectPlayer(socket, { playerId, gameId }) {
    try {
      const gamePlayers = this.activeGames.get(gameId);
      console.log("recon");
      if (gamePlayers?.has(playerId)) {
        socket.join(gameId);
        const game = await Battleship.findOne({ roomId: gameId });
        socket.emit("game_state_sync", game);
        socket.to(gameId).emit("player_reconnected", { playerId });
      }
    } catch (error) {
      socket.emit("reconnect_error", { message: "Failed to reconnect" });
    }
  }

  async makeLeaveGameRequest(roomID, player) {
    try {
      const response = await axios.post("/battleship/v1/leave-game", {
        roomID,
        player,
      });
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error("Error making leave game request:", error);
      return null;
    }
  }

  handleDisconnect(socket) {
    if (socket.gameId && socket.playerId) {
      // Set a 2-minute timer for auto-leave
      const timer = setTimeout(async () => {
        // Make the API call to leave the game
        const result = await this.makeLeaveGameRequest(
          socket.gameId,
          socket.playerId
        );

        if (result) {
          this.removePlayerFromGame(socket.playerId, socket.gameId);
          this.io.to(socket.gameId).emit("playerLeft", {
            playerId: socket.playerId,
            gameId: socket.gameId,
            message: result.Data.message,
            reason: "afk",
          });
        }

        this.disconnectionTimers.delete(socket.playerId);
      }, 10000); //30 seconds

      this.disconnectionTimers.set(socket.playerId, timer);
    }
  }

  handleCreationComplete(socket, { gameId, playerId }) {
    this.io.to(gameId).emit("createComplete", { gameId, playerId });
  }

  handleMakeMove(socket, data) {
    console.log(data, "data");
    this.io.to(data.gameId).emit("movePlayed", data);
  }

  removePlayerFromGame(playerId, gameId) {
    const gamePlayers = this.activeGames.get(gameId);
    if (gamePlayers) {
      gamePlayers.delete(playerId);
      if (gamePlayers.size === 0) {
        this.activeGames.delete(gameId);
      }
    }
  }
}

export default GameSocketHandler;
