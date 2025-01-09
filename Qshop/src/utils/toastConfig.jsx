// src/utils/toastConfig.js
import { toast } from 'react-toastify';

// Default toast configuration
const defaultConfig = {
  position: "top-right",
  autoClose: 2000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "light",
};

// Custom styled toasts
export const toastSuccess = (message) => toast.success(message, {
  ...defaultConfig,
  style: {
    background: '#fff',
    border: '1px solid #22c55e',
    borderLeft: '4px solid #22c55e',
  },
});

export const toastError = (message) => toast.error(message, {
  ...defaultConfig,
  autoClose: 3000,
  style: {
    background: '#fff',
    border: '1px solid #ef4444',
    borderLeft: '4px solid #ef4444',
  },
});

export const toastInfo = (message) => toast.info(message, {
  ...defaultConfig,
  style: {
    background: '#fff',
    border: '1px solid #3b82f6',
    borderLeft: '4px solid #3b82f6',
  },
});

export const toastWarning = (message) => toast.warning(message, {
  ...defaultConfig,
  style: {
    background: '#fff',
    border: '1px solid #f97316',
    borderLeft: '4px solid #f97316',
  },
});

// Custom toast configurations for specific actions
export const authToasts = {
  loginSuccess: () => toastSuccess("Successfully logged in"),
  loginError: () => toastError("Login failed. Please try again."),
  logoutSuccess: () => toastInfo("Successfully logged out"),
  signupSuccess: () => toastSuccess("Account created successfully"),
  signupError: () => toastError("Failed to create account"),
};

export const cartToasts = {
  addSuccess: (name) => toastSuccess(`${name} added to cart`),
  removeSuccess: (name) => toastInfo(`${name} removed from cart`),
  updateSuccess: () => toastSuccess("Cart updated successfully"),
  clearSuccess: () => toastInfo("Cart cleared successfully"),
  error: () => toastError("Failed to update cart"),
};

export const wishlistToasts = {
  addSuccess: (name) => toastSuccess(`${name} added to wishlist`),
  removeSuccess: (name) => toastInfo(`${name} removed from wishlist`),
  moveToCart: (name) => toastSuccess(`${name} moved to cart`),
  error: () => toastError("Failed to update wishlist"),
};

export const productToasts = {
  loadError: () => toastError("Failed to load product details"),
  shareSuccess: () => toastSuccess("Link copied to clipboard!"),
  updateSuccess: () => toastSuccess("Product updated successfully"),
  deleteSuccess: () => toastSuccess("Product deleted successfully"),
  error: () => toastError("An error occurred"),
};
export const shopToasts = {
  loadError: () => toastError("Failed to load shop data"),
  statsError: () => toastError("Failed to load shop statistics"),
  updateSuccess: () => toastSuccess("Shop settings updated successfully"),
  updateError: () => toastError("Failed to update shop settings"),
  addProductSuccess: () => toastSuccess("Product added successfully"),
  addProductError: () => toastError("Failed to add product"),
  deleteProductSuccess: () => toastSuccess("Product deleted successfully"),
  deleteProductError: () => toastError("Failed to delete product"),
  statusUpdateSuccess: (status) => toastSuccess(`Product marked as ${status}`),
  statusUpdateError: () => toastError("Failed to update product status"),
};