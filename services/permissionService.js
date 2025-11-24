import { prisma } from "../config/prisma.js";
import { rolePermissions } from "../utils/rolePermission.js";

export const assignPermissionsService = async (userId, customPermissions = []) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
  });

  if (!user) throw new Error("User not found");

  if (!Array.isArray(customPermissions)) {
    customPermissions = [customPermissions];
  }

  const baseRolePermissions = rolePermissions[user.role] || [];

  const mergedPermissions = [...new Set([...baseRolePermissions, ...customPermissions])];

  const updatedUser = await prisma.user.update({
    where: { id: Number(userId) },
    data: {
      permissions: mergedPermissions,
      customPermissions: customPermissions,
    },
  });

  return updatedUser;
};