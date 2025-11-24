import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

export default async function adminOrUserAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.headers.token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. Login again.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) } 
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin' || user.role === 'user') {
      req.user = user;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. Only admins or users can perform this action.'
    });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}