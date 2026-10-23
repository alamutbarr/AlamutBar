const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const validate = require("../middlewares/validateMiddleware");
const authenticate = require("../middlewares/authMiddleware");
const {
  requestOtpSchema,
  verifyOtpSchema,
  updateProfileSchema,
} = require("../validations/otpValidation");

router.post(
  "/request-otp",
  validate(requestOtpSchema),
  authController.requestOtp,
);
router.post("/verify-otp", validate(verifyOtpSchema), authController.verifyOtp);
router.get("/me", authenticate, authController.getMe);
router.patch(
  "/me",
  authenticate,
  validate(updateProfileSchema),
  authController.updateMe,
);

module.exports = router;
