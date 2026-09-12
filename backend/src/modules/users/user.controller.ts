import { Request, Response, NextFunction } from "express";
import { User } from "./user.model";

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!._id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "User not found" } });
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const listOrgUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find({ organizationId: req.org!._id }).select("-passwordHash");
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
