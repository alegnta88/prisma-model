import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateOTP } from '../utils/otpGenerator.js';
import { sendSMS } from '../utils/sendSMS.js';
import { generateToken } from '../utils/jwt.js';
import redisClient from '../config/redis.js';

const prisma = new PrismaClient();

export const registerCustomerService = async ({ name, email, phone, password }) => {
  const existingCustomer = await prisma.customer.findUnique({
    where: { email },
  });

  if (existingCustomer) throw new Error('Customer already exists');

  const hashedPassword = await hashPassword(password);
  const otp = generateOTP(6);

  const customer = await prisma.customer.create({
    data: {
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'customer',
      isVerified: false,
      twoFactorEnabled: false,
    },
  });

  await redisClient.setEx(`otp:registration:${customer.id}`, 300, otp);

  const smsSent = await sendSMS(phone, `Dear ${name}, your registration OTP is ${otp}`);
  if (!smsSent) {
    await redisClient.del(`otp:registration:${customer.id}`);
    throw new Error('Failed to send OTP. Please try again.');
  }

  return customer;
};

export const verifyCustomerOTPService = async ({ email, otp }) => {
  const customer = await prisma.customer.findUnique({
    where: { email },
  });

  if (!customer) throw new Error('Customer not found');
  if (customer.isVerified) throw new Error('Customer already verified');

  const storedOtp = await redisClient.get(`otp:registration:${customer.id}`);
  if (!storedOtp) throw new Error('OTP expired or not found');
  if (storedOtp !== otp) throw new Error('Invalid OTP');

  await prisma.customer.update({
    where: { id: customer.id },
    data: { isVerified: true },
  });

  await redisClient.del(`otp:registration:${customer.id}`);

  const token = generateToken({
    id: customer.id,
    email: customer.email,
    role: customer.role,
  });

  await sendSMS(customer.phone, `Dear ${customer.name}, your account is verified successfully.`);

  return { customer, token };
};

export const loginCustomerService = async ({ email, password }) => {
  const customer = await prisma.customer.findUnique({
    where: { email },
  });

  if (!customer) throw new Error('Customer not found');
  if (!customer.isVerified) throw new Error('Please verify your account first');

  const isMatch = await comparePassword(password, customer.password);
  if (!isMatch) throw new Error('Invalid credentials');

  if (!customer.isActive) throw new Error('Account is deactivated');

  if (customer.twoFactorEnabled) {
    const otp = generateOTP(6);
    await redisClient.setEx(`otp:2fa-login:${email}`, 300, otp);

    await sendSMS(customer.phone, `Your login OTP is: ${otp}`);

    return { message: '2FA enabled. Verify OTP to complete login.' };
  }

  const token = generateToken({
    id: customer.id,
    email: customer.email,
    role: customer.role,
  });

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    },
    token,
  };
};

export const verify2FALoginService = async ({ email, otp }) => {
  const customer = await prisma.customer.findUnique({
    where: { email },
  });

  if (!customer) throw new Error('Customer not found');

  const storedOtp = await redisClient.get(`otp:2fa-login:${email}`);
  if (!storedOtp) throw new Error('OTP expired or not found');
  if (storedOtp !== otp) throw new Error('Invalid OTP');

  await redisClient.del(`otp:2fa-login:${email}`);

  const token = generateToken({
    id: customer.id,
    email: customer.email,
    role: customer.role,
  });

  await sendSMS(customer.phone, `Dear ${customer.name}, you have logged in successfully.`);

  return { customer, token };
};

export const enable2FAService = async (customerId) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) throw new Error('Customer not found');
  if (customer.twoFactorEnabled) throw new Error('2FA is already enabled.');

  const otp = generateOTP(6);
  await redisClient.setEx(`otp:2fa-enable:${customerId}`, 300, otp);

  await sendSMS(customer.phone, `Your 2FA activation code is ${otp}`);

  return { message: 'OTP sent to your phone for 2FA activation.' };
};

export const verifyEnable2FAService = async ({ customerId, otp }) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) throw new Error('Customer not found');

  const storedOtp = await redisClient.get(`otp:2fa-enable:${customerId}`);
  if (!storedOtp) throw new Error('OTP expired or not found');
  if (storedOtp !== otp) throw new Error('Invalid OTP');

  await prisma.customer.update({
    where: { id: customerId },
    data: { twoFactorEnabled: true },
  });

  await redisClient.del(`otp:2fa-enable:${customerId}`);

  return { message: '2FA enabled successfully.' };
};

export const disable2FAService = async (customerId) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) throw new Error('Customer not found');
  if (!customer.twoFactorEnabled) throw new Error('2FA is already disabled.');

  await prisma.customer.update({
    where: { id: customerId },
    data: { twoFactorEnabled: false },
  });

  await sendSMS(
    customer.phone,
    `Dear ${customer.name}, two-factor authentication has been disabled for your account.`
  );

  return { message: '2FA has been disabled successfully.' };
};

export const deactivateCustomerService = async (id) => {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new Error('Customer not found');
  if (!customer.isActive) throw new Error('Customer already deactivated');

  return prisma.customer.update({
    where: { id },
    data: { isActive: false },
  });
};

export const activateCustomerService = async (id) => {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new Error('Customer not found');
  if (customer.isActive) throw new Error('Customer already active');

  return prisma.customer.update({
    where: { id },
    data: { isActive: true },
  });
};

export const getAllCustomersService = async (limit = 10, cursor) => {
  const customers = await prisma.customer.findMany({
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
      isVerified: true,
      role: true,
      twoFactorEnabled: true,
    },
  });

  const nextCursor = customers.length ? customers[customers.length - 1].id : null;

  return { customers, nextCursor };
};

export const requestPasswordResetService = async (email) => {
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) throw new Error('Customer not found');
  if (!customer.isActive) throw new Error('Your account is deactivated. Contact support.');

  const otp = generateOTP(6);

  await redisClient.setEx(`otp:password-reset:${email}`, 600, otp);

  const smsSent = await sendSMS(
    customer.phone,
    `Dear ${customer.name}, your password reset code is ${otp}`
  );

  if (!smsSent) {
    await redisClient.del(`otp:password-reset:${email}`);
    throw new Error('Failed to send reset code. Please try again.');
  }

  return { message: 'Password reset OTP sent successfully.' };
};

export const resetPasswordService = async ({ email, otp, newPassword }) => {
  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) throw new Error('Customer not found');

  const storedOtp = await redisClient.get(`otp:password-reset:${email}`);
  if (!storedOtp) throw new Error('OTP expired or not found');
  if (storedOtp !== otp) throw new Error('Invalid OTP');

  const newHashed = await hashPassword(newPassword);

  await prisma.customer.update({
    where: { email },
    data: { password: newHashed },
  });

  await redisClient.del(`otp:password-reset:${email}`);

  await sendSMS(
    customer.phone,
    `Dear ${customer.name}, your password has been reset successfully.`
  );

  return { message: 'Password reset successful.' };
};