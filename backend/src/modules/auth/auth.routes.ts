import { Router } from "express";
import { register, login } from "./auth.controller";
import { validate } from "../../middleware/validate";
import { z } from "zod";

const router = Router();

const registerSchema = z.object({
  body: z.object({
    orgName: z.string().min(2),
    userName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

export default router;
