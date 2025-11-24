import { prisma } from "../config/prisma.js";

export const assignCustomPermissions = async (req, res) => {
  try {
    const { id, permissions } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can manage permissions",
      });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: "Permissions must be an array",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const role = await prisma.role.findUnique({
      where: { name: user.role },
    });

    const basePermissions = role?.permissions || [];

    const finalPermissions = [...new Set([...basePermissions, ...permissions])];

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        customPermissions: permissions,
        permissions: finalPermissions,
      },
    });

    res.json({
      success: true,
      message: "Custom permissions assigned successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        permissions: updatedUser.permissions,
        customPermissions: updatedUser.customPermissions,
      },
    });
  } catch (error) {
    console.error("Error assigning permissions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};