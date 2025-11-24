import {
  createOrderService,
  getOrdersByCustomerService,
  getAllOrdersService,
  updateOrderStatusService,
} from '../services/orderService.js';
import { prisma } from '../config/prisma.js';
import logger from '../utils/logger.js';

export const createOrder = async (req, res) => {
  try {
    const customerId = req.user.id;
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new Error('Customer not found');

    const order = await createOrderService(customer, req.body.items, req.body.shippingAddress);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order,
    });
  } catch (error) {
    logger.error("Error creating order: %o", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await getOrdersByCustomerService(req.user.id);
    res.status(200).json({ success: true, orders });
  } catch (error) {
    logger.error("Error fetching customer orders: %o", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await getAllOrdersService();
    res.status(200).json({ success: true, orders });
  } catch (error) {
    logger.error("Error fetching all orders: %o", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) throw new Error("Order ID is required");
    if (!status) throw new Error("New status is required");

    const order = await updateOrderStatusService(req.user, id, status);

    res.status(200).json({ success: true, message: 'Order status updated', order });
  } catch (error) {
    logger.error("Error updating order status: %o", error);
    res.status(400).json({ success: false, message: error.message });
  }
};