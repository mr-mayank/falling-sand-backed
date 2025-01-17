import express from "express";
import {
  createGame,
  getGame,
  joinGame,
  leaveGame,
  kickPlayer,
  updateGameBoard,
  getAllRooms,
  startGame,
  leaveGameAfk,
} from "../controllers/battleship.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/create", auth, createGame);
router.post("/join", auth, joinGame);
router.post("/leave", auth, leaveGame);
router.post("/kick", auth, kickPlayer);
router.post("/update-board", auth, updateGameBoard);
router.post("/start", auth, startGame);
router.post("/leave-game", leaveGameAfk);
router.get("/get-game/:roomID", auth, getGame);
router.get("/get-all-rooms", auth, getAllRooms);

export default router;
