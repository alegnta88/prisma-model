import { prisma } from '../config/prisma.js';
import { uploadImage, deleteImage } from './cloudinaryService.js';

export const createProduct = async (data, files, user) => {
  const { name, price, description, category, subcategory, sizes, bestseller, stock } = data;

  if (!name || !price || !description || !category || stock == null) {
    throw new Error("Please provide all required fields.");
  }

  if (isNaN(price) || price <= 0) throw new Error("Invalid product price.");
  if (isNaN(stock) || stock < 0) throw new Error("Stock must be a non-negative number");
  console.log("Category received:", category, "Type:", typeof category);

  const categoryId = Number(category);
  if (isNaN(categoryId)) throw new Error("Invalid category ID");

  const categoryDoc = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!categoryDoc) throw new Error("The selected category does not exist. Please choose a valid category.");

  const imageArray = [];
  if (files?.length > 0) {
    for (const file of files) {
      const url = await uploadImage(file.path);
      imageArray.push(url);
    }
  }
  if (imageArray.length === 0) throw new Error("At least one product image is required.");

  let parsedSizes = [];
  if (sizes) {
    try {
      parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
      if (!Array.isArray(parsedSizes)) parsedSizes = [parsedSizes];
    } catch {
      parsedSizes = Array.isArray(sizes) ? sizes : [sizes];
    }
  }

  const productStatus = user?.role === "admin" ? "approved" : "pending";

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      price: Number(price),
      description: description.trim(),
      image: imageArray,
      categoryId,
      subcategory: subcategory?.trim() || "",
      sizes: parsedSizes,
      bestseller: bestseller === true || bestseller === "true",
      stock: Number(stock),
      status: productStatus,
      addedById: user?.id,
    },
  });

  return product;
};

export const getProducts = async (queryParams, user) => {
  const limit = parseInt(queryParams.limit) || 8;
  const cursor = queryParams.cursor ? { id: Number(queryParams.cursor) } : undefined;

  const where = {};
  if (user?.role !== "admin") where.status = 'approved';
  else if (queryParams.status) where.status = queryParams.status;

  if (queryParams.category) where.categoryId = Number(queryParams.category);

  const products = await prisma.product.findMany({
    where,
    orderBy: { id: 'desc' },
    take: limit + 1,
    cursor,
    skip: cursor ? 1 : 0,
  });

  const hasMore = products.length > limit;
  const resultProducts = hasMore ? products.slice(0, limit) : products;
  const nextCursor = hasMore ? resultProducts[resultProducts.length - 1].id : null;

  return { products: resultProducts, nextCursor, hasMore };
};

export const getProductById = async (id) => {
  const productId = Number(id);
  if (isNaN(productId)) throw new Error("Invalid product ID");

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');
  return product;
};

export const deleteProduct = async (id) => {
  const productId = Number(id);
  if (isNaN(productId)) throw new Error("Invalid product ID");

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');

  if (product.image?.length > 0) {
    for (const imageUrl of product.image) {
      await deleteImage(imageUrl);
    }
  }

  await prisma.product.delete({ where: { id: productId } });
  return true;
};

export const approveProductById = async (id) => {
  const productId = Number(id);
  if (isNaN(productId)) throw new Error("Invalid product ID");

  const product = await prisma.product.update({
    where: { id: productId },
    data: { status: 'approved' },
  });
  if (!product) throw new Error('Product not found');
  return product;
};

export const rejectProductById = async (id) => {
  const productId = Number(id);
  if (isNaN(productId)) throw new Error("Invalid product ID");

  const product = await prisma.product.update({
    where: { id: productId },
    data: { status: 'rejected' },
  });
  if (!product) throw new Error('Product not found');
  return product;
};

export const updateStockById = async (id, stock) => {
  const productId = Number(id);
  if (isNaN(productId)) throw new Error("Invalid product ID");
  if (stock == null || stock < 0) throw new Error('Stock must be a non-negative number');

  const product = await prisma.product.update({
    where: { id: productId },
    data: { stock: Number(stock) },
  });

  if (!product) throw new Error('Product not found');
  return product;
};