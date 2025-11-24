import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient();

const createAdmin = async () => {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: process.env.ADMIN_EMAIL }
    });

    if (existingAdmin) {
      console.log('Admin already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    const admin = await prisma.user.create({
      data: {
        name: process.env.ADMIN_NAME,
        email: process.env.ADMIN_EMAIL,
        phone: process.env.ADMIN_PHONE,
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        isActive: true
      }
    });

    console.log('Admin created successfully:', admin);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
};

createAdmin();
