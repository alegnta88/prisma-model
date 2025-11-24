import { prisma } from '../config/prisma.js';

export const createCategoryService = async (user, { name, description }) => {
  if (user.role !== 'admin') {
    throw new Error('Only admin can create categories');
  }

  const existing = await prisma.category.findUnique({
    where: { name: name.trim() },
  });

  if (existing) {
    throw new Error('Category already exists');
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      description: description || '',
    },
  });

  return category;
};

export const getAllCategoriesService = async () => {
  const categories = await prisma.category.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return categories;
};