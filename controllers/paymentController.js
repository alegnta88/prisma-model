import { validatePaymentInput } from "../validators/paymentValidator.js";
import {
  initializePaymentService,
  verifyPaymentService,
} from "../services/paymentService.js";

export const initializePayment = async (req, res) => {
  try {
    const error = validatePaymentInput(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const response = await initializePaymentService(req.body);

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error(
      "[initializePayment] Error:",
      error?.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: error?.response?.data || error.message,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { tx_ref } = req.params;

    if (!tx_ref) {
      return res.status(400).json({
        success: false,
        message: "tx_ref is required",
      });
    }

    const payment = await verifyPaymentService(tx_ref);

    if (!payment) {
      return res.status(400).json({
        success: false,
        message: "Payment not successful",
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error(
      "[verifyPayment] Error:",
      error?.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: error?.response?.data || error.message,
    });
  }
};