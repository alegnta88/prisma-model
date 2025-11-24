import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/password.js';
import { sendSMS } from '../utils/sendSMS.js';

const prisma = new PrismaClient();

export const registerUserService = async ({ name, email, phone, password }, isAdmin = false) => {
  if (!isAdmin) throw new Error('Only admin can create users');

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) throw new Error('User already exists');

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'user',
      isVerified: true,
      isActive: true,
    },
  });

  const smsSent = await sendSMS(phone, `Dear ${name}, your user account has been created successfully by admin.`);
  if (!smsSent) throw new Error('Failed to send notification SMS. Please try again.');

  return user;
};


export const deactivateUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) throw new Error('User not found');
  if (!user.isActive) throw new Error('This account is already deactivated');
  if (user.role !== 'user') throw new Error('Cannot deactivate non-user account');

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  return updatedUser;
};

export const activateUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) throw new Error('User not found');
  if (user.isActive) throw new Error('This account is already activated!');
  if (user.role !== 'user') throw new Error('Cannot activate non-user account');

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { isActive: true },
  });

  return updatedUser;
};

export const fetchUsersService = async (limit = 10, cursor = null) => {
  let users;

  if (cursor) {
    users = await prisma.user.findMany({
      where: { role: 'user' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: 1, 
      cursor: { id: cursor },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  } else {
    users = await prisma.user.findMany({
      where: { role: 'user' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  const nextCursor = users.length ? users[users.length - 1].id : null;

  return { users, nextCursor };
};