import axios from "axios";
import { prisma } from "../config/prisma.js";

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const BASE_URL = process.env.BASE_URL;

export const initializePaymentService = async ({
  amount,
  email,
  first_name,
  last_name,
  tx_ref,
}) => {
  const response = await axios.post(
    "https://api.chapa.co/v1/transaction/initialize",
    {
      amount,
      currency: "ETB",
      email,
      first_name,
      last_name,
      tx_ref,
      callback_url: `${BASE_URL}/api/v1/payment/verify/${tx_ref}`,
    },
    {
      headers: {
        Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
};

export const verifyPaymentService = async (tx_ref) => {
  const response = await axios.get(
    `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
    {
      headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` },
    }
  );

  const paymentData = response.data.data;

  if (response.data.status !== "success" || paymentData.status !== "success") {
    return null;
  }
  
  const payment = await prisma.payment.upsert({
    where: { tx_ref: paymentData.tx_ref },
    update: {
      reference: paymentData.reference,
      status: paymentData.status,
      amount: Number(paymentData.amount),
      charge: Number(paymentData.charge),
      currency: paymentData.currency,
      email: paymentData.email,
      first_name: paymentData.first_name,
      last_name: paymentData.last_name,
      method: paymentData.method,
      mode: paymentData.mode,
      type: paymentData.type,
      updated_at: new Date(),
    },
    create: {
      tx_ref: paymentData.tx_ref,
      reference: paymentData.reference,
      status: paymentData.status,
      amount: Number(paymentData.amount),
      charge: Number(paymentData.charge),
      currency: paymentData.currency,
      email: paymentData.email,
      first_name: paymentData.first_name,
      last_name: paymentData.last_name,
      method: paymentData.method,
      mode: paymentData.mode,
      type: paymentData.type,
      updated_at: new Date(),
    },
  });

  return payment;
};