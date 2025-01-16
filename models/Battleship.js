import mongoose from "mongoose";

const BattleshipSchema = mongoose.Schema({
  roomID: { type: String, required: true },
  player1: { type: String, required: false },
  player2: { type: String, required: false },
  board1: { type: String, required: false },
  key1: { type: String, required: false },
  board2: { type: String, required: false },
  key2: { type: String, required: false },
  status: { type: String, required: true },
  password: { type: String, required: false },
  turn: { type: String, required: false },
  winner: { type: String, required: false },
});

export default mongoose.model("Battleship", BattleshipSchema);
