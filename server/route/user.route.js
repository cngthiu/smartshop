//server/route/user.route.js
import { Router } from 'express'
import { forgotPasswordController, loginController, logoutController, refreshToken, registerUserController, resetpassword, updateUserDetails, uploadAvatar, userDetails, verifyEmailController, verifyForgotPasswordOtp } from '../controllers/user.controller.js'
import auth from '../middleware/auth.js'
import upload from '../middleware/multer.js'

import rateLimit from "express-rate-limit";
import { faceEnrollController, faceLoginController, } from "../controllers/face.controller.js";

const userRouter = Router()

userRouter.post('/register',registerUserController)
userRouter.post('/verify-email',verifyEmailController)
userRouter.post('/login',loginController)
userRouter.get('/logout',auth,logoutController)
userRouter.put('/upload-avatar',auth,upload.single('avatar'),uploadAvatar)
userRouter.put('/update-user',auth,updateUserDetails)
userRouter.put('/forgot-password',forgotPasswordController)
userRouter.put('/verify-forgot-password-otp',verifyForgotPasswordOtp)
userRouter.put('/reset-password',resetpassword)
userRouter.post('/refresh-token',refreshToken)
userRouter.get('/user-details',auth,userDetails)

// Enroll: cần login trước

const faceLoginLimiter = rateLimit({
  windowMs: 1500,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: true, message: "Thử lại sau 1.5 giây" },
});

userRouter.post(
  "/auth/face/enroll",
  auth,
  upload.array("frames", 5),
  faceEnrollController
);
// Login via camera: public, cần email + frame ảnh
userRouter.post(
  "/auth/face/login",
  faceLoginLimiter,
  upload.single("frame"),
  faceLoginController
);


export default userRouter