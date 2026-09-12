import { Request, Response, NextFunction } from "express";
import { Organization } from "../organizations/organization.model";
import { User } from "../users/user.model";
import { hashPassword, comparePassword } from "../../utils/password";
import { signToken } from "../../utils/jwt";

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgName, userName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Email already in use" } });
    }

    const org = new Organization({ name: orgName });
    await org.save();

    const hashedPassword = await hashPassword(password);
    const user = new User({
      organizationId: org._id,
      name: userName,
      email,
      passwordHash: hashedPassword,
      role: "org_admin",
      status: "active",
    });
    await user.save();

    const token = signToken({ userId: user._id.toString(), role: user.role });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.status !== "active") {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid credentials or disabled account" } });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      await user.save();
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Invalid credentials" } });
    }

    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    await user.save();

    const token = signToken({ userId: user._id.toString(), role: user.role });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
