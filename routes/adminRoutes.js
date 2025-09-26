import express from "express";
import { setRole } from "../controllers/adminController.js";
import { verifyToken, isAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/set-role", verifyToken, isAdmin, setRole);

export default router;
