import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

export const handleLogin = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) throw new Error('User not found');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid credentials');

  if (!user.isActive) throw new Error('Account is deactivated');

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      permissions: user.permissions || []
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  return {
    isAdmin: user.role === 'admin',
    message: `Login successful as ${user.role}`,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};
