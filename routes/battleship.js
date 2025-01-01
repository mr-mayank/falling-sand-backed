import express from "express";
import {
  createGame,
  getGame,
  joinGame,
  leaveGame,
  kickPlayer,
  updateGameBoard,
} from "../controllers/battleship.js";

const router = express.Router();

router.post("/create", createGame);
router.post("/join", joinGame);
router.post("/leave", leaveGame);
router.post("/kick", kickPlayer);
router.post("/update-board", updateGameBoard);
router.get("/get-game/:roomID", getGame);

export default router;
