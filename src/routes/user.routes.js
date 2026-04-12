// src/routes/user.routes.js
const express = require("express");
const router  = express.Router();
const { getAllUsers, getUserById, updateUser, deleteUser } = require("../controllers/user.controller");
const authenticate = require("../middleware/authenticate");
const authorize    = require("../middleware/authorize");

router.use(authenticate);

router.get("/",    authorize("ADMIN"), getAllUsers);
router.get("/:id",                     getUserById);
router.patch("/:id",                   updateUser);
router.delete("/:id", authorize("ADMIN"), deleteUser);

module.exports = router;
