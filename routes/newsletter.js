// routes/newsletter.js
const express = require("express");
const { subscribe } = require("../controllers/newsletterController");
const router = express.Router();

router.post("/", subscribe); // This means POST / when the base path is used
module.exports = router;
