import { prisma } from '../config/env.js';
import { sendSMS } from '../utils/sendSMS.js';

export const createOrderService = async (customer, items, shippingAddress) => {
  if (!items || items.length === 0) throw new Error("No items in the order");

  let totalAmount = 0;
  const orderItemsData = [];

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
    });

    if (!product) throw new Error(`Product not found: ${item.productId}`);

    const quantity = item.quantity || 1;
    if (product.stock < quantity) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { stock: product.stock - quantity },
    });

    totalAmount += product.price * quantity;

    orderItemsData.push({
      productId: product.id,
      quantity,
      price: product.price,
    });
  }

  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      totalAmount,
      shippingAddress,
      paymentStatus: 'pending',
      orderStatus: 'pending',
      items: {
        create: orderItemsData,
      },
    },
    include: { items: true },
  });

  return order;
};

export const getOrdersByCustomerService = async (customerId) => {
  return await prisma.order.findMany({
    where: { customerId },
    include: {
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getAllOrdersService = async () => {
  return await prisma.order.findMany({
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      items: { include: { product: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateOrderStatusService = async (user, orderId, newStatus) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order) throw new Error('Order not found');

  if (user.role !== 'admin') {
    throw new Error('You are not authorized to update this order');
  }

  if (order.orderStatus === newStatus) {
    throw new Error(`Order is already in '${newStatus}' status`);
  }

  const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!allowedStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: newStatus },
    include: { customer: true, items: { include: { product: true } } },
  });

  if (updatedOrder.customer?.phone) {
    const smsSent = await sendSMS(
      updatedOrder.customer.phone,
      `Your order status has been updated to: ${newStatus}`
    );
    if (!smsSent) console.warn(`Failed to send SMS to ${updatedOrder.customer.phone}`);
  }

  return updatedOrder;
};