// src/services/api.js - COMPLETE FIXED VERSION WITH VIDEO UPLOADS
import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// ========== AUTH API ==========
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  googleAuth: async (payload) => {
    const response = await api.post('/auth/google', payload);
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  getAllUsers: async (params = {}) => {
    const response = await api.get('/auth/users', { params });
    return response.data;
  },
  createUser: async (userData) => {
    const response = await api.post('/auth/users', userData);
    return response.data;
  },
  getUser: async (userId) => {
    const response = await api.get(`/auth/users/${userId}`);
    return response.data;
  },
  updateUser: async (userId, userData) => {
    const response = await api.put(`/auth/users/${userId}`, userData);
    return response.data;
  },
  deleteUser: async (userId) => {
    const response = await api.delete(`/auth/users/${userId}`);
    return response.data;
  },
  toggleUserActive: async (userId) => {
    const response = await api.post(`/auth/users/${userId}/toggle-active`);
    return response.data;
  },
  getUserStats: async () => {
    const response = await api.get('/auth/users/stats');
    return response.data;
  },
  changePassword: async (passwordData) => {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  },
};

// ========== DASHBOARD API ==========
export const dashboardAPI = {
  getDashboardStats: async () => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
  getRecentActivities: async () => {
    const response = await api.get('/dashboard/activities');
    return response.data;
  },
  getSalesOverview: async (period = 'monthly') => {
    const response = await api.get(`/dashboard/sales-overview?period=${period}`);
    return response.data;
  },
};

// ========== PRODUCTS API ==========
export const productsAPI = {
  getAllProducts: async (params = {}) => {
    const response = await api.get('/products/products', { params });
    return response.data;
  },
  getProduct: async (productId) => {
    const response = await api.get(`/products/products/${productId}`);
    return response.data;
  },
  createProduct: async (productData) => {
    const response = await api.post('/products/staff/products', productData);
    return response.data;
  },
  updateProduct: async (productId, productData) => {
    const response = await api.put(`/products/staff/products/${productId}`, productData);
    return response.data;
  },
  deleteProduct: async (productId) => {
    const response = await api.delete(`/products/staff/products/${productId}`);
    return response.data;
  },
  searchProducts: async (query) => {
    const response = await api.get('/products/products/search', { params: { q: query } });
    return response.data;
  },
  getProductsByCategory: async (categoryId) => {
    const response = await api.get(`/products/products/category/${categoryId}`);
    return response.data;
  },
  getProductsBySubcategory: async (subcategoryId) => {
    const response = await api.get(`/products/products/subcategory/${subcategoryId}`);
    return response.data;
  },
  getTopSellingProducts: async (limit = 10) => {
    const response = await api.get(`/products/top-selling?limit=${limit}`);
    return response.data;
  },
  getLowStockProducts: async (threshold = 10) => {
    const response = await api.get(`/products/low-stock?threshold=${threshold}`);
    return response.data;
  },
  updateInventory: async (productId, adjustment, notes) => {
    const response = await api.post('/products/staff/inventory/update', {
      product_id: productId,
      adjustment,
      notes
    });
    return response.data;
  },
  classifyProduct: async (classificationData) => {
    const response = await api.post('/products/products/classify', classificationData);
    return response.data;
  },
  
  // ===== NEW: VIDEO UPLOAD METHODS =====
  uploadVideo: async (videoFile, folder = 'product_videos') => {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('folder', folder);
    
    const response = await api.post('/products/upload/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadVideos: async (videoFiles, folder = 'product_videos') => {
    const formData = new FormData();
    videoFiles.forEach(file => {
      formData.append('videos', file);
    });
    formData.append('folder', folder);
    
    const response = await api.post('/products/upload/videos', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// ========== INVENTORY API ==========
export const inventoryAPI = {
  getAllInventory: async () => {
    const response = await api.get('/inventory');
    return response.data;
  },
  getInventoryItem: async (productId) => {
    const response = await api.get(`/inventory/${productId}`);
    return response.data;
  },
  updateInventory: async (productId, inventoryData) => {
    const response = await api.put(`/inventory/${productId}`, inventoryData);
    return response.data;
  },
  getInventoryHistory: async (productId) => {
    const response = await api.get(`/inventory/${productId}/history`);
    return response.data;
  },
  bulkUpdateInventory: async (updates) => {
    const response = await api.post('/inventory/bulk-update', updates);
    return response.data;
  },
};

// ========== INVENTORY RECEIVING API ==========
export const receivingAPI = {
  getSuppliers: async () => {
    const response = await api.get('/suppliers');
    return response.data;
  },
  createSupplier: async (supplierData) => {
    const response = await api.post('/suppliers', supplierData);
    return response.data;
  },
  createBatch: async (batchData) => {
    const response = await api.post('/receiving/batches', batchData);
    return response.data;
  },
  getMyBatches: async () => {
    const response = await api.get('/receiving/my-batches');
    return response.data;
  },
  getBatch: async (batchId) => {
    const response = await api.get(`/receiving/batches/${batchId}`);
    return response.data;
  },
  submitBatch: async (batchId) => {
    const response = await api.post(`/receiving/batches/${batchId}/submit`);
    return response.data;
  },
  getPendingBatches: async () => {
    const response = await api.get('/receiving/batches/pending');
    return response.data;
  },
  completeBatch: async (batchId) => {
    const response = await api.post(`/receiving/batches/${batchId}/complete`);
    return response.data;
  },
  addBatchItem: async (batchId, itemData) => {
    const response = await api.post(`/receiving/batches/${batchId}/items`, itemData);
    return response.data;
  },
  approveBatchItem: async (batchId, itemId, action, data = {}) => {
    const response = await api.post(`/receiving/batches/${batchId}/items/${itemId}/approve`, {
      action,
      ...data
    });
    return response.data;
  },
  updateBatchItem: async (batchId, itemId, itemData) => {
    const response = await api.put(`/receiving/batches/${batchId}/items/${itemId}`, itemData);
    return response.data;
  },
  deleteBatchItem: async (batchId, itemId) => {
    const response = await api.delete(`/receiving/batches/${batchId}/items/${itemId}`);
    return response.data;
  },
  generateBarcode: async (barcodeData) => {
    const response = await api.post('/barcode/generate', barcodeData);
    return response.data;
  },
  scanBarcode: async (barcodeData) => {
    const response = await api.post('/barcode/scan', barcodeData);
    return response.data;
  },
  getQRCode: async (productId) => {
    const response = await api.get(`/qrcode/${productId}`);
    return response.data;
  },
  getInventoryTransactions: async () => {
    const response = await api.get('/inventory/transactions');
    return response.data;
  },
};

// ========== INVENTORY TRANSACTIONS API ==========
export const transactionsAPI = {
  getAllTransactions: async () => {
    const response = await api.get('/inventory/transactions');
    return response.data;
  },
  getTransaction: async (transactionId) => {
    const response = await api.get(`/inventory/transactions/${transactionId}`);
    return response.data;
  },
  createTransaction: async (transactionData) => {
    const response = await api.post('/inventory/transactions', transactionData);
    return response.data;
  },
  getTransactionSummary: async (startDate, endDate) => {
    const response = await api.get('/inventory/transactions/summary', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },
  exportTransactions: async (filters = {}) => {
    const response = await api.get('/inventory/transactions/export', {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  },
  getTransactionTypes: async () => {
    const response = await api.get('/inventory/transactions/types');
    return response.data;
  },
};

// ========== SALES API ==========
export const salesAPI = {
  getAllSales: async (params = {}) => {
    const response = await api.get('/sales', { params });
    return response.data;
  },
  getSale: async (saleId) => {
    const response = await api.get(`/sales/${saleId}`);
    return response.data;
  },
  createSale: async (saleData) => {
    const response = await api.post('/sales', saleData);
    return response.data;
  },
  updateSale: async (saleId, saleData) => {
    const response = await api.put(`/sales/${saleId}`, saleData);
    return response.data;
  },
  deleteSale: async (saleId) => {
    const response = await api.delete(`/sales/${saleId}`);
    return response.data;
  },
  getTodaySales: async () => {
    const response = await api.get('/sales/today');
    return response.data;
  },
  getRecentSales: async (limit = 10) => {
    const response = await api.get(`/sales/recent?limit=${limit}`);
    return response.data;
  },
  getSalesByDateRange: async (startDate, endDate) => {
    const response = await api.get('/sales/date-range', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },
  generateInvoice: async (saleId) => {
    const response = await api.get(`/sales/${saleId}/invoice`, {
      responseType: 'blob'
    });
    return response.data;
  },
};

// ========== CUSTOMERS API ==========
export const customersAPI = {
  getAllCustomers: async () => {
    const response = await api.get('/customers');
    return response.data;
  },
  getCustomer: async (customerId) => {
    const response = await api.get(`/customers/${customerId}`);
    return response.data;
  },
  createCustomer: async (customerData) => {
    const response = await api.post('/customers', customerData);
    return response.data;
  },
  updateCustomer: async (customerId, customerData) => {
    const response = await api.put(`/customers/${customerId}`, customerData);
    return response.data;
  },
  deleteCustomer: async (customerId) => {
    const response = await api.delete(`/customers/${customerId}`);
    return response.data;
  },
  getCustomerHistory: async (customerId) => {
    const response = await api.get(`/customers/${customerId}/history`);
    return response.data;
  },
  searchCustomers: async (query) => {
    const response = await api.get('/customers/search', { params: { q: query } });
    return response.data;
  },
  getTopCustomers: async (limit = 10) => {
    const response = await api.get(`/customers/top?limit=${limit}`);
    return response.data;
  },
};

// ========== CATEGORIES API ==========
export const categoriesAPI = {
  getAllCategories: async () => {
    const response = await api.get('/products/categories');
    return response.data;
  },
  getCategory: async (categoryId) => {
    const response = await api.get(`/products/categories/${categoryId}`);
    return response.data;
  },
  createCategory: async (categoryData) => {
    const response = await api.post('/products/staff/categories', categoryData);
    return response.data;
  },
  updateCategory: async (categoryId, categoryData) => {
    const response = await api.put(`/products/staff/categories/${categoryId}`, categoryData);
    return response.data;
  },
  deleteCategory: async (categoryId) => {
    const response = await api.delete(`/products/staff/categories/${categoryId}`);
    return response.data;
  },
  getCategoryProducts: async (categoryId) => {
    const response = await api.get(`/products/products/category/${categoryId}`);
    return response.data;
  },
  getSubcategories: async (categoryId) => {
    const response = await api.get(`/products/categories/${categoryId}/subcategories`);
    return response.data;
  },
  createSubcategory: async (categoryId, subcategoryData) => {
    const response = await api.post(`/products/staff/categories/${categoryId}/subcategories`, subcategoryData);
    return response.data;
  },
  updateSubcategory: async (subcategoryId, subcategoryData) => {
    const response = await api.put(`/products/staff/subcategories/${subcategoryId}`, subcategoryData);
    return response.data;
  },
  deleteSubcategory: async (subcategoryId) => {
    const response = await api.delete(`/products/staff/subcategories/${subcategoryId}`);
    return response.data;
  },
  getSubcategoryProducts: async (subcategoryId) => {
    const response = await api.get(`/products/products/subcategory/${subcategoryId}`);
    return response.data;
  },
  classifyProduct: async (classificationData) => {
    const response = await api.post('/products/products/classify', classificationData);
    return response.data;
  },
  getCategorySalesReport: async (startDate, endDate) => {
    const response = await api.get('/products/reports/category-sales', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },
  getCategoryStockReport: async () => {
    const response = await api.get('/products/reports/category-stock');
    return response.data;
  },
};

// ========== REPORTS API ==========
export const reportsAPI = {
  generateSalesReport: async (startDate, endDate) => {
    const response = await api.get('/reports/sales', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },
  generateInventoryReport: async () => {
    const response = await api.get('/reports/inventory');
    return response.data;
  },
  generateCustomerReport: async () => {
    const response = await api.get('/reports/customers');
    return response.data;
  },
  generateFinancialReport: async (startDate, endDate) => {
    const response = await api.get('/reports/financial', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },
  getProfitLoss: async (startDate, endDate) => {
    const response = await api.get('/reports/profit-loss', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },
};

// ========== SETTINGS API ==========
export const settingsAPI = {
  getStoreSettings: async () => {
    const response = await api.get('/settings/store');
    return response.data;
  },
  updateStoreSettings: async (settings) => {
    const response = await api.put('/settings/store', settings);
    return response.data;
  },
  getTaxRates: async () => {
    const response = await api.get('/settings/tax-rates');
    return response.data;
  },
  updateTaxRate: async (taxId, taxData) => {
    const response = await api.put(`/settings/tax-rates/${taxId}`, taxData);
    return response.data;
  },
  getPaymentMethods: async () => {
    const response = await api.get('/settings/payment-methods');
    return response.data;
  },
};

// ========== INDIVIDUAL EXPORTS FOR ALL COMPONENTS ==========

// Auth exports
export const login = authAPI.login;
export const googleAuth = authAPI.googleAuth;
export const register = authAPI.register;
export const getCurrentUser = authAPI.getCurrentUser;
export const logout = authAPI.logout;
export const getAllUsers = authAPI.getAllUsers;
export const createUser = authAPI.createUser;
export const updateUser = authAPI.updateUser;
export const deleteUser = authAPI.deleteUser;
export const toggleUserActive = authAPI.toggleUserActive;
export const getUserStats = authAPI.getUserStats;
export const changePassword = authAPI.changePassword;

// Dashboard exports
export const getDashboardStats = dashboardAPI.getDashboardStats;
export const getRecentActivities = dashboardAPI.getRecentActivities;
export const getSalesOverview = dashboardAPI.getSalesOverview;

// Products exports
export const getAllProducts = productsAPI.getAllProducts;
export const getProduct = productsAPI.getProduct;
export const createProduct = productsAPI.createProduct;
export const updateProduct = productsAPI.updateProduct;
export const deleteProduct = productsAPI.deleteProduct;
export const searchProducts = productsAPI.searchProducts;
export const getProductsByCategory = productsAPI.getProductsByCategory;
export const getProductsBySubcategory = productsAPI.getProductsBySubcategory;
export const getTopSellingProducts = productsAPI.getTopSellingProducts;
export const getLowStockProducts = productsAPI.getLowStockProducts;
export const updateInventory = productsAPI.updateInventory;
export const classifyProduct = productsAPI.classifyProduct;
// ===== NEW: Video upload exports =====
export const uploadVideo = productsAPI.uploadVideo;
export const uploadVideos = productsAPI.uploadVideos;

// Inventory exports
export const getAllInventory = inventoryAPI.getAllInventory;
export const getInventoryItem = inventoryAPI.getInventoryItem;
export const getInventoryHistory = inventoryAPI.getInventoryHistory;
export const bulkUpdateInventory = inventoryAPI.bulkUpdateInventory;

// Receiving exports
export const getSuppliers = receivingAPI.getSuppliers;
export const createSupplier = receivingAPI.createSupplier;
export const createBatch = receivingAPI.createBatch;
export const getMyBatches = receivingAPI.getMyBatches;
export const getBatch = receivingAPI.getBatch;
export const submitBatch = receivingAPI.submitBatch;
export const getPendingBatches = receivingAPI.getPendingBatches;
export const completeBatch = receivingAPI.completeBatch;
export const addBatchItem = receivingAPI.addBatchItem;
export const approveBatchItem = receivingAPI.approveBatchItem;
export const updateBatchItem = receivingAPI.updateBatchItem;
export const deleteBatchItem = receivingAPI.deleteBatchItem;
export const generateBarcode = receivingAPI.generateBarcode;
export const scanBarcode = receivingAPI.scanBarcode;
export const getQRCode = receivingAPI.getQRCode;
export const getInventoryTransactions = receivingAPI.getInventoryTransactions;

// Transactions exports
export const getAllTransactions = transactionsAPI.getAllTransactions;
export const getTransaction = transactionsAPI.getTransaction;
export const createTransaction = transactionsAPI.createTransaction;
export const getTransactionSummary = transactionsAPI.getTransactionSummary;
export const exportTransactions = transactionsAPI.exportTransactions;
export const getTransactionTypes = transactionsAPI.getTransactionTypes;

// Sales exports
export const getAllSales = salesAPI.getAllSales;
export const getSale = salesAPI.getSale;
export const createSale = salesAPI.createSale;
export const updateSale = salesAPI.updateSale;
export const deleteSale = salesAPI.deleteSale;
export const getTodaySales = salesAPI.getTodaySales;
export const getRecentSales = salesAPI.getRecentSales;
export const getSalesByDateRange = salesAPI.getSalesByDateRange;
export const generateInvoice = salesAPI.generateInvoice;

// Customers exports
export const getAllCustomers = customersAPI.getAllCustomers;
export const getCustomer = customersAPI.getCustomer;
export const createCustomer = customersAPI.createCustomer;
export const updateCustomer = customersAPI.updateCustomer;
export const deleteCustomer = customersAPI.deleteCustomer;
export const getCustomerHistory = customersAPI.getCustomerHistory;
export const searchCustomers = customersAPI.searchCustomers;
export const getTopCustomers = customersAPI.getTopCustomers;

// Categories exports
export const getAllCategories = categoriesAPI.getAllCategories;
export const getCategory = categoriesAPI.getCategory;
export const createCategory = categoriesAPI.createCategory;
export const updateCategory = categoriesAPI.updateCategory;
export const deleteCategory = categoriesAPI.deleteCategory;
export const getCategoryProducts = categoriesAPI.getCategoryProducts;
export const getSubcategories = categoriesAPI.getSubcategories;
export const createSubcategory = categoriesAPI.createSubcategory;
export const updateSubcategory = categoriesAPI.updateSubcategory;
export const deleteSubcategory = categoriesAPI.deleteSubcategory;
export const getSubcategoryProducts = categoriesAPI.getSubcategoryProducts;
export const getCategorySalesReport = categoriesAPI.getCategorySalesReport;
export const getCategoryStockReport = categoriesAPI.getCategoryStockReport;

// Reports exports
export const generateSalesReport = reportsAPI.generateSalesReport;
export const generateInventoryReport = reportsAPI.generateInventoryReport;
export const generateCustomerReport = reportsAPI.generateCustomerReport;
export const generateFinancialReport = reportsAPI.generateFinancialReport;
export const getProfitLoss = reportsAPI.getProfitLoss;

// Settings exports
export const getStoreSettings = settingsAPI.getStoreSettings;
export const updateStoreSettings = settingsAPI.updateStoreSettings;
export const getTaxRates = settingsAPI.getTaxRates;
export const updateTaxRate = settingsAPI.updateTaxRate;
export const getPaymentMethods = settingsAPI.getPaymentMethods;


// ========== NOTIFICATIONS API ==========
export const notificationsAPI = {
  getNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },
  markAsRead: async (notificationId) => {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },
  getLowStockAlerts: async () => {
    const response = await api.get('/notifications/low-stock');
    return response.data;
  },
};

export const getNotifications = notificationsAPI.getNotifications;
export const markNotificationRead = notificationsAPI.markAsRead;
export const markAllNotificationsRead = notificationsAPI.markAllRead;
export const getLowStockAlerts = notificationsAPI.getLowStockAlerts;


// ========== ERRAND & DROPSHIPPING API ==========
export const errandAPI = {
  // Delivery Agents
  getDeliveryAgents: async () => {
    const response = await api.get('/delivery-agents');
    return response.data;
  },
  createDeliveryAgent: async (agentData) => {
    const response = await api.post('/delivery-agents', agentData);
    return response.data;
  },
  updateDeliveryAgent: async (agentId, agentData) => {
    const response = await api.put(`/delivery-agents/${agentId}`, agentData);
    return response.data;
  },
  getAgentBranches: async (agentId) => {
    const response = await api.get(`/delivery-agents/${agentId}/branches`);
    return response.data;
  },

  // Errands
  getErrands: async (params = {}) => {
    const response = await api.get('/errands', { params });
    return response.data;
  },
  getMyErrands: async () => {
    const response = await api.get('/errands/my');
    return response.data;
  },
  getPendingErrands: async () => {
    const response = await api.get('/errands/pending');
    return response.data;
  },
  getErrand: async (errandId) => {
    const response = await api.get(`/errands/${errandId}`);
    return response.data;
  },
  createErrand: async (errandData) => {
    const response = await api.post('/errands', errandData);
    return response.data;
  },
  assignErrand: async (errandId, runnerId) => {
    const response = await api.post(`/errands/${errandId}/assign`, { runner_id: runnerId });
    return response.data;
  },
  acceptErrand: async (errandId) => {
    const response = await api.post(`/errands/${errandId}/accept`);
    return response.data;
  },
  startErrand: async (errandId) => {
    const response = await api.post(`/errands/${errandId}/start`);
    return response.data;
  },
  setErrandDeadline: async (errandId, deadline) => {
    const response = await api.post(`/errands/${errandId}/deadline`, { deadline });
    return response.data;
  },

  // Submissions
  submitErrand: async (errandId, formData) => {
    const response = await api.post(`/errands/${errandId}/submissions`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  deleteSubmission: async (submissionId) => {
    const response = await api.delete(`/submissions/${submissionId}`);
    return response.data;
  },

  // Approvals
  approveSubmission: async (submissionId, adjustedFee = null) => {
    const data = adjustedFee ? { adjusted_fee: adjustedFee } : {};
    const response = await api.post(`/submissions/${submissionId}/approve`, data);
    return response.data;
  },
  rejectSubmission: async (submissionId, reason, comments = '') => {
    const response = await api.post(`/submissions/${submissionId}/reject`, {
      rejection_reason: reason,
      rejection_comments: comments
    });
    return response.data;
  },
  getErrandApprovals: async (errandId) => {
    const response = await api.get(`/errands/${errandId}/approvals`);
    return response.data;
  },

  // Rejected Errands
  getMyRejectedErrands: async () => {
    const response = await api.get('/errands/my-rejected');
    return response.data;
  },

  // Notifications (errand-specific)
  getMyNotifications: async (params = {}) => {
    const response = await api.get('/errand-notifications', { params });
    return response.data;
  },

  // Runner Stats
  getRunnerStats: async () => {
    const response = await api.get('/stats/runner');
    return response.data;
  },
};

// ========== INDIVIDUAL EXPORTS FOR ERRANDS ==========
export const getDeliveryAgents = errandAPI.getDeliveryAgents;
export const createDeliveryAgent = errandAPI.createDeliveryAgent;
export const updateDeliveryAgent = errandAPI.updateDeliveryAgent;
export const getAgentBranches = errandAPI.getAgentBranches;

export const getErrands = errandAPI.getErrands;
export const getMyErrands = errandAPI.getMyErrands;
export const getPendingErrands = errandAPI.getPendingErrands;
export const getErrand = errandAPI.getErrand;
export const createErrand = errandAPI.createErrand;
export const assignErrand = errandAPI.assignErrand;
export const acceptErrand = errandAPI.acceptErrand;
export const startErrand = errandAPI.startErrand;
export const setErrandDeadline = errandAPI.setErrandDeadline;

export const submitErrand = errandAPI.submitErrand;
export const deleteSubmission = errandAPI.deleteSubmission;

export const approveSubmission = errandAPI.approveSubmission;
export const rejectSubmission = errandAPI.rejectSubmission;
export const getErrandApprovals = errandAPI.getErrandApprovals;

export const getMyRejectedErrands = errandAPI.getMyRejectedErrands;

export const getMyNotifications = errandAPI.getMyNotifications;

export const getRunnerStats = errandAPI.getRunnerStats;


// Default export
export default api;
// ========== REJECTED BATCHES ==========
export const getMyRejectedBatches = async () => {
  const response = await api.get('/receiving/my-rejected-batches');
  return response.data;
};

export const getBatchRejectionDetails = async (batchId) => {
  const response = await api.get(`/receiving/batches/${batchId}/rejection-details`);
  return response.data;
};