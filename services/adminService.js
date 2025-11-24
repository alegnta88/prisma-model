import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import redisClient from '../config/redis.js';
import { sendEmail } from '../utils/sendEmail.js';
import { generateOTP } from '../utils/otpGenerator.js';

const prisma = new PrismaClient();

export const createAdminOTPService = async (email, password) => {
  const admin = await prisma.user.findFirst({
    where: { email, role: 'admin' },
  });
  if (!admin) throw new Error('Admin not found');

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) throw new Error('Invalid admin credentials');

  const otp = generateOTP(6);

  await redisClient.setEx(`otp:admin-login:${email}`, 300, otp);

  const emailSent = await sendEmail(
    email,
    'Admin Login OTP',
    `Hello ${admin.name},\n\nYour login verification code is ${otp}.\nThe code will expire in 5 minutes.`
  );

  if (!emailSent) throw new Error('Failed to send OTP. Please try again.');

  return { success: true, message: 'OTP sent to admin email for verification.' };
};

export const verifyAdminOTPService = async (email, otp) => {
  const storedOtp = await redisClient.get(`otp:admin-login:${email}`);
  if (!storedOtp) throw new Error('OTP expired or not found');
  if (storedOtp !== otp) throw new Error('Invalid OTP');

  await redisClient.del(`otp:admin-login:${email}`);

  const admin = await prisma.user.findFirst({
    where: { email, role: 'admin' },
  });
  if (!admin) throw new Error('Admin not found');

  const token = jwt.sign(
    {
      id: admin.id,
      role: admin.role,
      email: admin.email,
      permissions: admin.permissions || [],
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  return {
    success: true,
    message: 'Admin logged in successfully.',
    token,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
};
