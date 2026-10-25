const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const router = express.Router();
const authController = require("../controllers/authController");
const validate = require("../middleware/validateMiddleware");
const authenticate = require("../middleware/authMiddleware");
const AppError = require("../utils/AppError");
const {
  requestOtpSchema,
  verifyOtpSchema,
  updateProfileSchema,
} = require("../validations/otpValidation");

const uploadDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const kycUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `kyc-${unique}${path.extname(file.originalname) || ".jpg"}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(new Error("فقط تصویر JPG، PNG یا WEBP مجاز است."));
      return;
    }
    cb(null, true);
  },
});

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
router.patch("/kyc", authenticate, authController.setKycIdType);
router.post("/kyc", authenticate, (req, res, next) => {
  kycUpload.single("file")(req, res, (error) => {
    if (error) return next(new AppError(error.message || "آپلود مدرک ناموفق بود.", 400));
    return next();
  });
}, authController.uploadKyc);

module.exports = router;
