const express = require("express");
const router = express.Router();
const { registerRider, getAllRiders } = require("../controllers/rider.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

router.post("/", registerRider);
router.get("/", authenticate, authorize("ADMIN"), getAllRiders);

module.exports = router;