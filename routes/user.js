import express from "express";
import { getUserDetails, signin, signup } from "../controllers/user.js";
import auth from "../middleware/auth.js";
const router = express.Router();

router.post("/signin", signin);
router.post("/signup", signup);
router.get("/get-user-details", auth, getUserDetails);

export default router;
