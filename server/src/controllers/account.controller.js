import { asyncHandler } from '../middleware/asyncHandler.js';
import { publicUser } from '../services/auth.service.js';
import * as account from '../services/account.service.js';
import { User } from '../models/index.js';

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  res.json({ success: true, data: publicUser(user) });
});

export const putProfile = asyncHandler(async (req, res) => {
  const user = await account.updateProfile(req.user._id, req.body);
  res.json({ success: true, data: publicUser(user) });
});

export const getAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('addresses').lean();
  res.json({ success: true, data: user.addresses });
});

export const postAddress = asyncHandler(async (req, res) => {
  const data = await account.addAddress(req.user._id, req.body);
  res.status(201).json({ success: true, data });
});

export const putAddress = asyncHandler(async (req, res) => {
  const data = await account.updateAddress(req.user._id, req.params.id, req.body);
  res.json({ success: true, data });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const data = await account.deleteAddress(req.user._id, req.params.id);
  res.json({ success: true, data });
});

export const getWishlist = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await account.getWishlist(req.user._id) });
});

export const putWishlist = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await account.setWishlist(req.user._id, req.body.productIds) });
});

export const getOrders = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await account.listOrders(req.user._id) });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await account.getOrderForUser(req.user._id, req.params.orderNumber);
  res.json({ success: true, data: order });
});
