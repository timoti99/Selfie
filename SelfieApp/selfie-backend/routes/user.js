const express = require("express")
const router = express.Router();
const User = require("../models/user");

router.get("/:id", async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("nome cognome username");
        if (!user) return res.status(404).json({message: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({message: "Server error"});
    }
});

module.exports = router;