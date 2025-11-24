import { prisma } from "../config/prisma.js"; 
import { createAdminOTPService, verifyAdminOTPService } from "../services/adminService.js";

export const assignRole = async (req, res) => {
  try {
    const { id, role } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }

    const allowedRoles = ["user", "admin", "customer"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const existingUser = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (existingUser.role === role) {
      return res.status(400).json({
        success: false,
        message: `User is already assigned the role '${role}'`
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { role }
    });

    res.json({
      success: true,
      message: `Role updated successfully to ${role}`,
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllAdmins = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const cursor = req.query.cursor ? { id: Number(req.query.cursor) } : undefined;

    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor,
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        customPermissions: true
      }
    });

    const nextCursor = admins.length ? admins[admins.length - 1].id : null;

    res.json({ success: true, admins, nextCursor });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignPermissions = async (req, res) => {
  try {
    const { id, customPermissions } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const mergedPermissions = Array.from(new Set([...(user.customPermissions || []), ...customPermissions]));

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { customPermissions: mergedPermissions }
    });

    res.json({
      success: true,
      message: "Permissions updated successfully",
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const revokePermissions = async (req, res) => {
  try {
    const { id, revokePermissions } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updatedPermissions = (user.customPermissions || []).filter(
      perm => !revokePermissions.includes(perm)
    );

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { customPermissions: updatedPermissions }
    });

    res.json({
      success: true,
      message: "Permissions revoked successfully",
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAdminOTPController = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await createAdminOTPService(email, password);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const verifyAdminOTPController = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await verifyAdminOTPService(email, otp);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};