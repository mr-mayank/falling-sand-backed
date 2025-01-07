import express from "express";
import {
  createGame,
  getGame,
  joinGame,
  leaveGame,
  kickPlayer,
  updateGameBoard,
  getAllRooms,
} from "../controllers/battleship.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/create", auth, createGame);
router.post("/join", auth, joinGame);
router.post("/leave", auth, leaveGame);
router.post("/kick", auth, kickPlayer);
router.post("/update-board", auth, updateGameBoard);
router.get("/get-game/:roomID", auth, getGame);
router.get("/allRooms", auth, getAllRooms);

export default router;
