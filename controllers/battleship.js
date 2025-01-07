import Battleship from "../models/Battleship.js";

export const createGame = async (req, res) => {
  try {
    const { roomID, player1, password } = req.body;

    if (!roomID || !player1) {
      return res.status(400).json({
        message: "Missing required fields: roomID and player1 are required",
        status: "failure",
      });
    }

    const existingGame = await Battleship.findOne({ roomID });
    if (existingGame) {
      return res.status(409).json({
        message: "A game with this room ID already exists",
        status: "failure",
      });
    }

    const newGame = await Battleship.create({
      roomID,
      player1,
      player2: null,
      board1: "",
      board2: "",
      status: "waiting",
      password: password || null,
      turn: null,
      winner: null,
    });

    if (!newGame) {
      return res.status(500).json({
        message: "Failed to create new game",
        status: "failure",
      });
    }

    res.status(201).json({
      message: "Game created successfully",
      game: {
        roomID: newGame.roomID,
        player1: newGame.player1,
        status: newGame.status,
        hasPassword: !!newGame.password,
      },
      status: "success",
    });
  } catch (error) {
    console.error("Create game error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
      status: "failure",
    });
  }
};
export const joinGame = async (req, res) => {
  try {
    const { roomID, player, password } = req.body;

    if (!roomID || !player) {
      return res.status(400).json({
        message: "Missing required fields: roomID and player2 are required",
        status: "failure",
      });
    }

    const game = await Battleship.findOne({ roomID });

    if (!game) {
      return res.status(404).json({
        message: "Game not found",
        status: "failure",
      });
    }

    if (game.status !== "waiting") {
      return res.status(400).json({
        message: "Game is not available for joining",
        status: "failure",
      });
    }

    if (!game.player1) {
      return res.status(400).json({
        message: "Host has not joined the game",
        status: "failure",
      });
    }

    if (game.player1 === player) {
      return res.status(400).json({
        message: "You cannot join your own game",
        status: "failure",
      });
    }

    if (game.player2) {
      return res.status(400).json({
        message: "Game is already full",
        status: "failure",
      });
    }

    if (game.password) {
      if (!password) {
        return res.status(401).json({
          message: "This game requires a password",
          status: "failure",
        });
      }

      if (game.password !== password) {
        return res.status(401).json({
          message: "Incorrect password",
          status: "failure",
        });
      }
    }

    const updatedGame = await Battleship.findOneAndUpdate(
      { roomID },
      {
        $set: {
          player2: player,
          status: "active",
          turn: game.player1,
          board1: "",
          board2: "",
        },
      },
      { new: true }
    );

    if (!updatedGame) {
      return res.status(500).json({
        message: "Failed to update game state",
        status: "failure",
      });
    }

    const gameResponse = updatedGame.toObject();
    delete gameResponse.password;

    res.status(200).json({
      game: gameResponse,
      status: "success",
    });
  } catch (error) {
    console.error("Join game error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
      status: "failure",
    });
  }
};

export const leaveGame = async (req, res) => {
  try {
    const { roomID, player } = req.body;

    if (!roomID || !player) {
      return res.status(400).json({
        message: "Missing required fields: roomID and player are required",
        status: "failure",
      });
    }

    const game = await Battleship.findOne({ roomID });

    if (!game) {
      return res.status(404).json({
        message: "Game not found",
        status: "failure",
      });
    }

    if (game.player1 === player) {
      if (game.status === "active") {
        const updatedGame = await Battleship.findOneAndUpdate(
          { roomID },
          {
            winner: game.player2,
            status: "completed",
          },
          { new: true }
        );

        return res.status(200).json({
          message: "Host left the game. Player 2 wins!",
          winner: game.player2,
        });
      } else {
        await Battleship.deleteOne({ roomID });
        return res.status(200).json({
          message: "Game deleted by host",
          status: "success",
        });
      }
    }

    if (game.player2 === player) {
      if (game.status === "active") {
        const updatedGame = await Battleship.findOneAndUpdate(
          { roomID },
          {
            winner: game.player1,
            status: "completed",
          },
          { new: true }
        );

        return res.status(200).json({
          message: "Player 2 left the game. Player 1 wins!",
          winner: game.player1,
          status: "success",
        });
      } else {
        const updatedGame = await Battleship.findOneAndUpdate(
          { roomID },
          {
            $set: {
              player2: null,
              board2: "",
            },
          },
          { new: true }
        );

        return res.status(200).json({
          message: "Player 2 left the game",
          status: "success",
        });
      }
    }

    return res.status(400).json({
      message: "Player not found in this game",
      status: "failure",
    });
  } catch (error) {
    console.error("Leave game error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      status: "failure",
    });
  }
};

export const kickPlayer = async (req, res) => {
  try {
    const { roomID, player } = req.body;

    if (!roomID || !player) {
      return res.status(400).json({
        message: "Missing required fields: roomID and player are required",
        status: "failure",
      });
    }

    const game = await Battleship.findOne({ roomID });

    if (!game) {
      return res.status(404).json({
        message: "Game not found",
        status: "failure",
      });
    }

    if (game.player1 === player) {
      return res.status(400).json({
        message: "You cannot kick the host",
        status: "failure",
      });
    }

    if (game.status === "active") {
      return res.status(400).json({
        message: "You cannot kick a player while the game is active",
        status: "failure",
      });
    }

    if (game.player2 === player) {
      const updatedGame = await Battleship.findOneAndUpdate(
        { roomID },
        {
          $set: {
            player2: null,
            status: "waiting",
            board1: "",
            board2: "",
            turn: null,
            winner: null,
          },
        },
        { new: true }
      );

      return res.status(200).json({
        message: "Player 2 Kicked out",
        status: "success",
      });
    }

    return res.status(400).json({
      message: "Player not found in this game",
      status: "failure",
    });
  } catch (error) {
    console.error("Leave game error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      status: "failure",
    });
  }
};

export const getAllRooms = async (req, res) => {
  try {
    const games = await Battleship.find()
      .select("roomID player1 player2 status password _id")
      .sort({ _id: -1 });

    if (games.length === 0) {
      return res.status(200).json({
        message: "No games found",
        status: "success",
        data: [],
      });
    }

    return res.status(200).json({
      data: games,
      count: games.length,
      status: "success",
    });
  } catch (error) {
    console.error("Get all rooms error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      status: "failure",
    });
  }
};

export const getGame = async (req, res) => {
  try {
    const { roomID } = req.params;

    if (!roomID) {
      return res.status(400).json({
        message: "Missing required fields: roomID is required",
        status: "failure",
      });
    }

    const game = await Battleship.findOne({ roomID });

    if (!game) {
      return res.status(404).json({
        message: "Game not found",
        status: "failure",
      });
    }

    return res.status(200).json({
      game,
      status: "success",
    });
  } catch (error) {
    console.error("Get game error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      status: "failure",
    });
  }
};

export const updateGameBoard = async (req, res) => {
  try {
    const { roomID, player, board } = req.body;

    if (!roomID || !player || !board) {
      return res.status(400).json({
        message: "Missing required fields: roomID, player, board are required",
        status: "failure",
      });
    }

    const game = await Battleship.findOne({ roomID });

    if (!game) {
      return res.status(404).json({
        message: "Game not found",
        status: "failure",
      });
    }

    if (player !== game.turn) {
      return res.status(400).json({
        message: "It is not your turn",
        status: "failure",
      });
    }
    if (game.player1 === player) {
      const updatedGame = await Battleship.findOneAndUpdate(
        { roomID },
        {
          $set: {
            board1: board,
            turn: game.player2,
          },
        },
        { new: true }
      );

      return res.status(200).json({
        updatedGame,
        status: "success",
      });
    } else if (game.player2 === player) {
      {
        const updatedGame = await Battleship.findOneAndUpdate(
          { roomID },
          {
            $set: {
              board2: board,
              turn: game.player1,
            },
          },
          { new: true }
        );

        return res.status(200).json({
          updatedGame,
          status: "success",
        });
      }
    } else {
      return res.status(403).json({
        message: "You are not a player in this game",
        status: "failure",
      });
    }
  } catch (error) {
    console.error("Update game board error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
      status: "failure",
    });
  }
};
