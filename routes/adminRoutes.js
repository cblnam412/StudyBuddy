const express = require("express");
const { setRole } = require("../controllers/adminController.js");
const { verifyToken, isAdmin } = require("../middlewares/authMiddleware");


const router = express.Router();

router.post("/set-role", verifyToken, isAdmin, setRole);

module.exports = router;