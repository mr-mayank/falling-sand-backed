import Battleship from "../models/Battleship.js";
import User from "../models/User.js";

export const createGame = async (req, res) => {
  try {
    const { roomID, player1, password } = req.body;

    if (!roomID || !player1) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Missing required fields: roomID and player1 are required",
          name: "MissingFields",
          code: "EX-00201",
        },
      });
    }

    const existingGame = await Battleship.findOne({ roomID });
    if (existingGame) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "A game with this room ID already exists",
          name: "GameExists",
          code: "EX-00202",
        },
      });
    }

    const newGame = await Battleship.create({
      roomID,
      player1,
      player2: null,
      board1: "",
      board2: "",
      key1: "",
      key2: "",
      status: "waiting",
      password: password || null,
      turn: null,
      winner: null,
    });

    if (!newGame) {
      return res.status(500).json({
        Status: "failure",
        Error: {
          message: "Failed to create new game",
          name: "InternalError",
          code: "EX-00203",
        },
      });
    }

    res.status(201).json({
      Status: "success",
      Data: {
        id: newGame._id,
        roomID: newGame.roomID,
        player1: newGame.player1,
        status: newGame.status,
        hasPassword: !!newGame.password,
      },
    });
  } catch (error) {
    console.error("Create game error:", error);
    res.status(500).json({
      Status: "failure",
      Error: {
        message: "Internal server error",
        name: "InternalError",
        code: "EX-00203",
      },
    });
  }
};
export const joinGame = async (req, res) => {
  try {
    const { roomID, player, password } = req.body;

    if (!roomID || !player) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Missing required fields: roomID and player2 are required",
          name: "MissingFields",
          code: "EX-00201",
        },
      });
    }

    const game = await Battleship.findOne({ roomID });

    if (!game) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Game not found",
          name: "GameNotFound",
          code: "EX-00204",
        },
      });
    }

    if (game.status !== "waiting") {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Game is not available for joining",
          name: "GameNotFound",
          code: "EX-00204",
        },
      });
    }

    if (!game.player1) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Host has not joined the game",
          name: "HostNotJoined",
          code: "EX-00205",
        },
      });
    }

    if (game.player1 === player) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "You cannot join your own game",
          name: "YouCannotJoinYourOwnGame",
          code: "EX-00206",
        },
      });
    }

    if (game.player2) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Game is already full",
          name: "GameAlreadyFull",
          code: "EX-00207",
        },
      });
    }

    if (game.password) {
      if (!password) {
        return res.status(401).json({
          Status: "failure",
          Error: {
            message: "This game requires a password",
            name: "PasswordRequired",
            code: "EX-00208",
          },
        });
      }

      if (game.password !== password) {
        return res.status(401).json({
          Status: "failure",
          Error: {
            message: "Incorrect password",
            name: "IncorrectPassword",
            code: "EX-00209",
          },
        });
      }
    }

    const updatedGame = await Battleship.findOneAndUpdate(
      { roomID },
      {
        $set: {
          player2: player,
          status: "waiting",
          turn: game.player1,
          board1: "",
          board2: "",
        },
      },
      { new: true }
    );

    if (!updatedGame) {
      return res.status(500).json({
        Status: "failure",
        Error: {
          message: "Failed to update game state",
          name: "FailedToUpdateGameState",
          code: "EX-00210",
        },
      });
    }

    const gameResponse = updatedGame.toObject();
    delete gameResponse.password;

    res.status(200).json({
      Status: "success",
      Data: {
        id: gameResponse._id,
        roomID: gameResponse.roomID,
        player1: gameResponse.player1,
        player2: gameResponse.player2,
        status: gameResponse.status,
        board1: gameResponse.board1,
        board2: gameResponse.board2,
        turn: gameResponse.player1,
        hasPassword: !!gameResponse.password,
      },
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

export const startGame = async (req, res) => {
  try {
    const { roomID, player } = req.body;

    if (!roomID || !player) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Missing required fields: roomID and player2 are required",
          name: "MissingFields",
          code: "EX-00201",
        },
      });
    }

    const game = await Battleship.findOne({ _id: roomID });

    if (!game) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Game not found",
          name: "GameNotFound",
          code: "EX-00204",
        },
      });
    }

    if (game.status !== "waiting") {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Game is already started",
          name: "GameStarted",
          code: "EX-00204",
        },
      });
    }

    if (game.player1 !== player) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Only host can start the game",
          name: "GameError",
          code: "EX-00205",
        },
      });
    }

    if (!game.player2) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "All players must join the game before starting it",
          name: "Player2NotFound",
          code: "EX-00206",
        },
      });
    }

    game.status = "active";
    await game.save();

    res.status(200).json({
      Status: "success",
      Data: {
        id: game._id,
        roomID: game.roomID,
        player1: game.player1,
        player2: game.player2,
        status: game.status,
        board1: game.board1,
        board2: game.board2,
        turn: game.player1,
      },
    });
  } catch (error) {
    console.error("Join game error:", error);
    res.status(500).json({
      Status: "failure",
      Error: {
        message: "Something went wrong, please try again later.",
        name: "ServerError",
        code: "EX-500",
      },
    });
  }
};

export const leaveGameAfk = async (req, res) => {
  try {
    const { roomID, player } = req.body;

    if (!roomID || !player) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Missing required fields: roomID and player2 are required",
          name: "MissingFields",
          code: "EX-00201",
        },
      });
    }

    const game = await Battleship.findOne({ _id: roomID });

    if (!game) {
      return;
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
          Status: "success",
          Data: {
            message: "Host left the game. Player 2 wins!",
            winner: game.player2,
          },
        });
      } else {
        await Battleship.deleteOne({ _id: roomID });
        return res.status(200).json({
          Status: "success",
          Data: {
            message: "Game deleted by host",
          },
        });
      }
    }

    if (game.player2 === player) {
      if (game.status === "active") {
        const updatedGame = await Battleship.findOneAndUpdate(
          { _id: roomID },
          {
            winner: game.player1,
            status: "completed",
          },
          { new: true }
        );

        return res.status(200).json({
          Status: "success",
          Data: {
            message: "Player 2 left the game. Player 1 wins!",
            winner: game.player1,
          },
        });
      } else {
        const updatedGame = await Battleship.findOneAndUpdate(
          { _id: roomID },
          {
            $set: {
              player2: null,
              board2: "",
            },
          },
          { new: true }
        );

        return res.status(200).json({
          Status: "success",
          Data: {
            message: "Player 2 left the game",
          },
        });
      }
    }

    return res.status(400).json({
      Status: "failure",
      Error: {
        message: "Player not found in this game",
        name: "PlayerNotFound",
        code: "EX-404",
      },
    });
  } catch (error) {
    console.error("Leave game error:", error);
    return res.status(500).json({
      Status: "failure",
      Error: {
        message: "Internal server error",
        name: "ServerError",
        code: "EX-500",
      },
    });
  }
};

export const leaveGame = async (req, res) => {
  try {
    const { roomID, player } = req.body;

    if (!roomID || !player) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Missing required fields: roomID and player2 are required",
          name: "MissingFields",
          code: "EX-00201",
        },
      });
    }

    const game = await Battleship.findOne({ roomID });

    if (!game) {
      return res.status(404).json({
        Status: "failure",
        Error: {
          message: "Game not found",
          name: "NotFound",
          code: "EX-00202",
        },
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
          Status: "success",
          Data: {
            message: "Host left the game. Player 2 wins!",
            winner: game.player2,
          },
        });
      } else {
        await Battleship.deleteOne({ roomID });
        return res.status(200).json({
          Status: "success",
          Data: {
            message: "Game deleted by host",
          },
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
          Status: "success",
          Data: {
            message: "Player 2 left the game. Player 1 wins!",
            winner: game.player1,
          },
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
          Status: "success",
          Data: {
            message: "Player 2 left the game",
          },
        });
      }
    }

    return res.status(400).json({
      Status: "failure",
      Error: {
        message: "Player not found in this game",
        name: "PlayerNotFound",
        code: "EX-404",
      },
    });
  } catch (error) {
    console.error("Leave game error:", error);
    return res.status(500).json({
      Status: "failure",
      Error: {
        message: "Internal server error",
        name: "ServerError",
        code: "EX-500",
      },
    });
  }
};

export const kickPlayer = async (req, res) => {
  try {
    const { roomID, player } = req.body;

    if (!roomID || !player) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Missing required fields: roomID and player2 are required",
          name: "MissingFields",
          code: "EX-00201",
        },
      });
    }

    const game = await Battleship.findOne({ roomID });

    if (!game) {
      return res.status(404).json({
        Status: "failure",
        Error: {
          message: "Game not found",
          name: "GameNotFound",
          code: "EX-00204",
        },
      });
    }

    if (game.player1 === player) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "You cannot kick the host",
          name: "CannotKickHost",
          code: "EX-00205",
        },
      });
    }

    if (game.status === "active") {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "You cannot kick a player while the game is active",
          name: "CannotKickActivePlayer",
          code: "EX-00206",
        },
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
        Status: "success",
        Data: {
          message: "Player 2 Kicked out",
        },
      });
    }

    return res.status(400).json({
      Status: "failure",
      Error: {
        message: "Player not found in this game",
        name: "PlayerNotFound",
        code: "EX-00207",
      },
    });
  } catch (error) {
    console.error("Leave game error:", error);
    return res.status(500).json({
      Status: "failure",
      Error: {
        message: "Internal server error",
        name: "ServerError",
        code: "EX-500",
      },
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
        Status: "success",
        Data: {
          message: "No games found",
          items: [],
          count: 0,
        },
      });
    }

    return res.status(200).json({
      Status: "success",
      Data: {
        items: games,
        count: games.length,
      },
    });
  } catch (error) {
    console.error("Get all rooms error:", error);
    return res.status(500).json({
      Status: "failure",
      Error: {
        message: "Internal server error",
        name: "ServerError",
        code: "EX-500",
      },
    });
  }
};

export const getGame = async (req, res) => {
  try {
    const { roomID } = req.params;

    if (!roomID) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Missing required fields: roomID is required",
          name: "MissingFields",
          code: "EX-400",
        },
      });
    }

    const game = await Battleship.findOne({ _id: roomID });

    if (!game) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "Game not found",
          name: "NotFound",
          code: "EX-404",
        },
      });
    }
    let player1, player2;
    if (game) {
      if (game.player1) {
        player1 = await User.findOne({ _id: game.player1 }).select(
          "username _id"
        );
      }
      if (game.player2) {
        player2 = await User.findOne({ _id: game.player2 }).select(
          "username _id"
        );
      }
    }

    return res.status(200).json({
      Status: "success",
      Data: {
        id: game._id,
        name: game.roomID,
        player1: player1 ? { id: player1._id, name: player1.username } : null,
        player2: player2 ? { id: player2._id, name: player2.username } : null,
        gameBoard1: game.board1,
        key1: game.key1,
        gameBoard2: game.board2,
        key2: game.key2,
        status: game.status,
        turn: game.turn,
        isPrivate: !!game.password,
      },
    });
  } catch (error) {
    console.error("Get game error:", error);
    return res.status(500).json({
      Status: "failure",
      Error: {
        message: "Internal server error",
        name: "ServerError",
        code: "EX-500",
      },
    });
  }
};

export const updateGameBoard = async (req, res) => {
  try {
    const { roomID, player, board, key, turn } = req.body;

    if (!roomID || !player || !board || !key) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message:
            "Missing required fields: roomID, player, board, key are required",
          name: "MissingFields",
          code: "EX-400",
        },
      });
    }

    const game = await Battleship.findOne({ _id: roomID });

    if (!game) {
      return res.status(404).json({
        Status: "failure",
        Error: {
          message: "Game not found",
          name: "NotFound",
          code: "EX-404",
        },
      });
    }

    if (player !== game.player1 && player !== game.player2) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "You are not a part of this game",
          name: "NotPartOfGame",
          code: "EX-400",
        },
      });
    }

    if (player === game.player2 && game.board2 === "") {
      const updatedGame = await Battleship.findOneAndUpdate(
        { _id: roomID },
        {
          $set: {
            board2: board,
            key2: key,
          },
        },
        { new: true }
      );
      return res.status(200).json({
        Status: "success",
        Data: {
          message: "Board updated successfully",
          board: updatedGame.board2,
        },
      });
    }

    if (player === game.player1 && game.board1 === "") {
      const updatedGame = await Battleship.findOneAndUpdate(
        { _id: roomID },
        {
          $set: {
            board1: board,
            key1: key,
          },
        },
        { new: true }
      );
      return res.status(200).json({
        Status: "success",
        Data: {
          message: "Board updated successfully",
          board: updatedGame.board1,
        },
      });
    }

    if (player !== game.turn) {
      return res.status(400).json({
        Status: "failure",
        Error: {
          message: "It is not your turn",
          name: "NotYourTurn",
          code: "EX-400",
        },
      });
    }
    if (game.player1 === player) {
      const updatedGame = await Battleship.findOneAndUpdate(
        { roomID },
        {
          $set: {
            board2: board,
            turn: turn,
          },
        },
        { new: true }
      );

      return res.status(200).json({
        Status: "success",
        Data: {
          message: "Board updated successfully",
          board: updatedGame.board1,
          turn: updatedGame.turn,
        },
      });
    } else if (game.player2 === player) {
      {
        const updatedGame = await Battleship.findOneAndUpdate(
          { roomID },
          {
            $set: {
              board1: board,
              turn: turn,
            },
          },
          { new: true }
        );

        return res.status(200).json({
          Status: "success",
          Data: {
            message: "Board updated successfully",
            board: updatedGame.board2,
            turn: updatedGame.turn,
          },
        });
      }
    } else {
      return res.status(403).json({
        Status: "failure",
        Error: {
          message: "You are not a player in this game",
          name: "NotAPlayer",
          code: "EX-403",
        },
      });
    }
  } catch (error) {
    console.error("Update game board error:", error);
    return res.status(500).json({
      Status: "failure",
      Error: {
        error: error.message,
        status: "failure",
      },
    });
  }
};
