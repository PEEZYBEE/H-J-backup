// src/pages/Orders.jsx - Admin Orders Management (WITH CUSTOMER DATA FIX)
import React, { useState, useEffect } from 'react';
import {
  FaSearch, FaFilter, FaEye, FaCheckCircle, FaTimesCircle,
  FaClock, FaShoppingBag, FaUser, FaPhone, FaMapMarkerAlt,
  FaMoneyBillWave, FaReceipt, FaCopy, FaQrcode, FaCalendarAlt,
  FaSortAmountDown, FaSortAmountUp, FaDownload, FaPrint,
  FaEnvelope, FaWhatsapp, FaTrash, FaEdit, FaExclamationTriangle,
  FaDatabase, FaSync, FaList, FaTable, FaBoxOpen, FaBug
} from 'react-icons/fa';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    paid: 0,
    cancelled: 0,
    totalAmount: 0
  });

  // Sample data with safety checks
  const sampleOrders = [
    {
      id: 'ORD-001',
      orderNumber: 'ORD-001',
      customer: {
        name: 'John Doe',
        phone: '0712345678',
        email: 'john@example.com'
      },
      items: [
        { name: 'iPhone 15 Pro', quantity: 1, price: 150000 },
        { name: 'AirPods Pro', quantity: 1, price: 25000 }
      ],
      amount: 175000,
      subtotal: 175000,
      shippingFee: 500,
      discount: 0,
      total: 175500,
      paymentMethod: 'mpesa_till',
      paymentStatus: 'pending_verification',
      mpesaCode: 'ABC123XY78',
      paymentPhone: '0712345678',
      tillNumber: '451234',
      orderStatus: 'pending_verification',
      shippingAddress: {
        street: '123 Main Street',
        apartment: 'Apartment 4B',
        city: 'Nairobi',
        county: 'Nairobi',
        deliveryNotes: 'Leave at gate'
      },
      submittedAt: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-15T10:30:00Z',
      verifiedAt: null,
      notes: 'Awaiting M-PESA code verification',
      rawCustomerInfo: {
        firstName: 'John',
        lastName: 'Doe',
        phone: '0712345678',
        email: 'john@example.com'
      },
      rawShippingAddress: {
        street: '123 Main Street',
        apartment: 'Apartment 4B',
        city: 'Nairobi',
        county: 'Nairobi',
        deliveryNotes: 'Leave at gate'
      }
    }
  ];

  async function loadOrders() {
    setLoading(true);
    try {
      // Try fetching admin orders from backend first
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const res = await fetch('/api/orders/all', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        const apiOrders = (data.orders || []).map(o => {
          return {
            id: o.id,
            orderNumber: o.order_number || o.orderNumber || o.order_number,
            customer: {
              name: o.customer?.name || o.customer_name || 'Customer',
              phone: o.customer?.phone || o.customer_phone || 'No Phone',
              email: o.customer?.email || o.customer_email || ''
            },
            items: (o.order_items || []).map(it => ({
              name: it.product?.name || it.product_name || 'Product',
              quantity: it.quantity || 1,
              price: it.unit_price || it.total_price || 0,
              image: it.product?.image_urls?.[0] || null
            })),
            subtotal: o.subtotal || o.subtotal || 0,
            shippingFee: o.shipping_cost || o.shipping_cost || 0,
            discount: o.discount_amount || 0,
            total: o.total_amount || o.total_amount || 0,
            paymentMethod: o.payment_method || 'mpesa_till',
            paymentStatus: o.payment_status || o.paymentStatus || 'pending_verification',
            mpesaCode: (o.payments && o.payments[0] && o.payments[0].transaction_id) || 'N/A',
            paymentPhone: (o.payments && o.payments[0] && o.payments[0].phone_number) || (o.customer && o.customer.phone) || 'No Phone',
            tillNumber: (o.payments && o.payments[0] && o.payments[0].transaction_id) || null,
            orderStatus: o.order_status || 'pending',
            submittedAt: o.created_at || new Date().toISOString(),
            createdAt: o.created_at || new Date().toISOString(),
            verifiedAt: null,
            notes: o.notes || '',
            rawOrder: o,
            payments: o.payments || []
          };
        });

        const combined = [...sampleOrders, ...apiOrders];
        setOrders(combined);
        calculateStats(combined);
        setLoading(false);
        return;
      }

      // Fallback: read from localStorage (existing behavior)
      const savedOrders = JSON.parse(localStorage.getItem('pending_verifications') || '[]');
      const hnjOrders = JSON.parse(localStorage.getItem('hnj_orders') || '[]');
      const allSavedOrders = [...savedOrders, ...hnjOrders];
      const processedOrders = allSavedOrders.map(order => {
        const customerInfo = order.customerInfo || order.customer || {};
        const shippingAddress = order.shippingAddress || {};
        const items = order.items || [];
        return {
          id: order.id || `ORD-${Date.now()}`,
          orderNumber: order.orderNumber || order.id || `ORD-${Date.now()}`,
          customer: {
            name: customerInfo.firstName && customerInfo.lastName 
              ? `${customerInfo.firstName} ${customerInfo.lastName}`
              : customerInfo.name || customerInfo.fullName || 'Customer',
            phone: customerInfo.phone || order.paymentPhone || 'No Phone',
            email: customerInfo.email || 'No Email'
          },
          items: items.map(item => ({
            name: item.name || 'Unnamed Product',
            quantity: item.quantity || 1,
            price: item.price || 0,
            image: item.image || null
          })),
          amount: order.amount || order.total || 0,
          subtotal: order.subtotal || order.total || 0,
          shippingFee: order.shippingFee || 0,
          discount: order.discount || 0,
          total: order.total || order.amount || 0,
          paymentMethod: order.paymentMethod || 'mpesa_till',
          paymentStatus: order.paymentStatus || 'pending_verification',
          mpesaCode: order.mpesaCode || 'N/A',
          paymentPhone: order.paymentPhone || customerInfo.phone || 'No Phone',
          tillNumber: order.tillNumber || '451234',
          orderStatus: order.orderStatus || 'pending_verification',
          shippingAddress: {
            street: shippingAddress.street || 'Not specified',
            apartment: shippingAddress.apartment || 'N/A',
            city: shippingAddress.city || 'Nairobi',
            county: shippingAddress.county || 'Nairobi',
            deliveryNotes: shippingAddress.deliveryNotes || ''
          },
          submittedAt: order.submittedAt || order.createdAt || new Date().toISOString(),
          createdAt: order.createdAt || new Date().toISOString(),
          verifiedAt: order.verifiedAt || null,
          notes: order.notes || 'Awaiting verification',
          rawCustomerInfo: customerInfo,
          rawShippingAddress: shippingAddress,
          rawItems: items,
          rawOrder: order
        };
      });

      const allOrders = [...sampleOrders, ...processedOrders];
      const uniqueOrders = allOrders.filter((order, index, self) =>
        index === self.findIndex((o) => o.orderNumber === order.orderNumber)
      );

      setOrders(uniqueOrders);
      calculateStats(uniqueOrders);
      setLoading(false);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders(sampleOrders);
      calculateStats(sampleOrders);
      setLoading(false);
    }
  }

  async function exportReports() {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const res = await fetch('/api/orders/reports/all', {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to generate report' }));
        alert(err.error || 'Failed to generate report');
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      let filename = 'hnj-orders-report.pdf';
      const match = disposition.match(/filename=([^;]+)/i);
      if (match && match[1]) filename = match[1].replace(/"/g, '').trim();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('❌ Error exporting reports', e);
      alert('Error exporting reports');
    }
  }

  const calculateStats = (ordersList) => {
    const stats = {
      total: ordersList.length,
      pending: ordersList.filter(o => o.paymentStatus === 'pending_verification').length,
      verified: ordersList.filter(o => o.paymentStatus === 'verified').length,
      paid: ordersList.filter(o => (o.paymentStatus === 'paid' || o.paymentStatus === 'completed')).length,
      cancelled: ordersList.filter(o => o.orderStatus === 'cancelled').length,
      totalAmount: ordersList.reduce((sum, order) => sum + (order.total || 0), 0)
    };
    setStats(stats);
  };

  function filterAndSortOrders() {
    let filtered = [...orders];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => {
        const customerName = order.customer?.name || 
          (order.rawCustomerInfo?.firstName && order.rawCustomerInfo?.lastName 
            ? `${order.rawCustomerInfo.firstName} ${order.rawCustomerInfo.lastName}`
            : '');
        const phone = order.customer?.phone || order.rawCustomerInfo?.phone || '';
        const email = order.customer?.email || order.rawCustomerInfo?.email || '';
        
        return (
          (order.orderNumber || '').toLowerCase().includes(term) ||
          customerName.toLowerCase().includes(term) ||
          phone.includes(term) ||
          email.toLowerCase().includes(term) ||
          (order.mpesaCode || '').toLowerCase().includes(term)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.orderStatus === statusFilter);
    }

    // Apply payment filter
    if (paymentFilter !== 'all') {
      if (paymentFilter === 'paid') {
        filtered = filtered.filter(order => order.paymentStatus === 'paid' || order.paymentStatus === 'completed');
      } else {
        filtered = filtered.filter(order => order.paymentStatus === paymentFilter);
      }
    }

    // Show pending only
    if (showPendingOnly) {
      filtered = filtered.filter(order => order.paymentStatus === 'pending_verification');
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.submittedAt || a.createdAt) - new Date(b.submittedAt || b.createdAt));
        break;
      case 'amount_high':
        filtered.sort((a, b) => (b.total || 0) - (a.total || 0));
        break;
      case 'amount_low':
        filtered.sort((a, b) => (a.total || 0) - (b.total || 0));
        break;
      default:
        filtered.sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt));
    }

    setFilteredOrders(filtered);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterAndSortOrders();
  }, [orders, searchTerm, statusFilter, paymentFilter, sortBy, showPendingOnly]);

  const handleVerifyPayment = (orderId) => {
    (async () => {
      try {
        const order = orders.find(o => o.id === orderId);
        if (!order) return alert('Order not found');

        const payment = order.payments && order.payments[0];
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const body = payment
          ? { payment_id: payment.id, confirmed: true }
          : { order_id: order.id, confirmed: true };

        const res = await fetch('/api/payments/till/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          alert('Payment confirmed successfully');
          loadOrders();
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Failed to confirm payment');
        }
      } catch (e) {
        console.error(e);
        alert('Error while confirming payment');
      }
    })();
  };

  const handleMarkAsPaid = (orderId) => {
    (async () => {
      try {
        const order = orders.find(o => o.id === orderId);
        if (!order) return alert('Order not found');
        const payment = order.payments && order.payments[0];
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const body = payment
          ? { payment_id: payment.id, confirmed: true }
          : { order_id: order.id, confirmed: true };

        const res = await fetch('/api/payments/till/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          alert('Order marked as paid');
          loadOrders();
        } else {
          const err = await res.json().catch(() => ({}));
          alert(err.error || 'Failed to mark as paid');
        }
      } catch (e) {
        console.error(e);
        alert('Error while marking order as paid');
      }
    })();
  };

  const handleCancelOrder = (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            paymentStatus: 'cancelled',
            orderStatus: 'cancelled',
            notes: 'Order cancelled by admin'
          };
        }
        return order;
      });
      
      setOrders(updatedOrders);
      alert(`Order ${orderId} has been cancelled.`);
    }
  };

  const handleCopyMpesaCode = (code) => {
    if (code && code !== 'N/A') {
      navigator.clipboard.writeText(code);
      alert(`Copied M-PESA code: ${code}`);
    }
  };

  const handleRefreshOrders = () => {
    setLoading(true);
    setTimeout(() => {
      loadOrders();
      alert('Orders refreshed!');
    }, 1000);
  };

  

  const downloadOrderDocument = async (order, documentType) => {
    try {
      const orderNumber = order?.orderNumber || order?.id;
      if (!orderNumber) {
        alert('Order number is missing for this order.');
        return;
      }

      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const phone = order?.customer?.phone ? `?phone=${encodeURIComponent(order.customer.phone)}` : '';
      const response = await fetch(
        `/api/orders/orders/${encodeURIComponent(orderNumber)}/${documentType}${phone}`,
        {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to download ${documentType}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const defaultName = `${documentType}-${orderNumber}.html`;
      const fileNameMatch = disposition.match(/filename=([^;]+)/i);
      const fileName = fileNameMatch ? fileNameMatch[1].replace(/"/g, '').trim() : defaultName;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Document download failed:', error);
      alert(error.message || 'Failed to download document');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending_verification':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <FaClock /> Pending Verification
          </span>
        );
      case 'verified':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
            <FaCheckCircle /> Verified
          </span>
        );
      case 'paid':
      case 'completed':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800 flex items-center gap-1">
            <FaCheckCircle /> Completed
          </span>
        );
      case 'confirmed':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
            <FaCheckCircle /> Confirmed
          </span>
        );
      case 'processing':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 flex items-center gap-1">
            <FaSync className="animate-spin" /> Processing
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 flex items-center gap-1">
            <FaTimesCircle /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const getPaymentMethodBadge = (method) => {
    if (method === 'mpesa_till') {
      return (
        <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800 flex items-center gap-1">
          <FaMoneyBillWave /> M-PESA Till
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">
        {method || 'Unknown'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
            <p className="text-gray-600">Manage customer orders and payment verifications</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefreshOrders}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <FaSync /> Refresh Orders
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FaShoppingBag className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Verification</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <FaClock className="text-yellow-600 text-xl" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified Orders</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified + stats.paid}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-red-600">KSh {stats.totalAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FaMoneyBillWave className="text-red-600 text-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders by ID, customer name, phone, email, or M-PESA code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-10"
              >
                <option value="all">All Status</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <FaFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            <div className="relative">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-10"
              >
                <option value="all">All Payments</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="verified">Verified</option>
                <option value="paid">Paid</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <FaMoneyBillWave className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-10"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="amount_high">Amount (High to Low)</option>
                <option value="amount_low">Amount (Low to High)</option>
              </select>
              {sortBy.includes('amount') ? (
                <FaSortAmountDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              ) : (
                <FaSortAmountUp className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mt-4">
          
          
          
          <button onClick={exportReports} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 flex items-center gap-2">
            <FaDownload /> Reports
          </button>
          
          
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    <FaBoxOpen className="text-4xl mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium">No orders found</p>
                    <p className="text-sm">Try adjusting your filters or search terms</p>
                    
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FaShoppingBag className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{order.orderNumber || 'N/A'}</p>
                            <p className="text-sm text-gray-600">
                              <FaCalendarAlt className="inline mr-1" />
                              {formatDate(order.submittedAt || order.createdAt)}
                            </p>
                            {order.mpesaCode && order.mpesaCode !== 'N/A' && (
                              <div className="mt-1 flex items-center gap-1">
                                <FaQrcode className="text-green-600" />
                                <span className="text-xs font-mono text-gray-700">{order.mpesaCode}</span>
                                <button
                                  onClick={() => handleCopyMpesaCode(order.mpesaCode)}
                                  className="text-blue-600 hover:text-blue-800 ml-2"
                                >
                                  <FaCopy size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          {getPaymentMethodBadge(order.paymentMethod)}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <p className="font-medium text-gray-900">
                          {order.customer?.name || 
                           (order.rawCustomerInfo?.firstName && order.rawCustomerInfo?.lastName 
                             ? `${order.rawCustomerInfo.firstName} ${order.rawCustomerInfo.lastName}`
                             : 'Customer')}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <FaPhone /> {order.customer?.phone || order.rawCustomerInfo?.phone || 'No Phone'}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <FaEnvelope /> {order.customer?.email || order.rawCustomerInfo?.email || 'No Email'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <FaMapMarkerAlt /> 
                          {order.shippingAddress?.city || order.rawShippingAddress?.city || 'N/A'}
                        </p>
                        
                        {/* Show raw data if enabled */}
                        {showRawData && order.rawCustomerInfo && (
                          <div className="mt-2 p-2 bg-gray-100 rounded border">
                            <p className="text-xs text-gray-600">Raw Customer Data:</p>
                            <pre className="text-xs text-gray-700 overflow-x-auto">
                              {JSON.stringify(order.rawCustomerInfo, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <p className="font-bold text-gray-900 text-lg">
                          KSh {(order.total || 0).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {(order.items?.length || 0)} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                        </p>
                        {(order.discount || 0) > 0 && (
                          <p className="text-xs text-green-600">
                            Discount: KSh {(order.discount || 0).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      {getStatusBadge(order.paymentStatus)}
                      {order.paymentStatus === 'pending_verification' && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600">Till: {order.tillNumber || 'N/A'}</p>
                          <p className="text-xs text-gray-600">Phone: {order.paymentPhone || 'N/A'}</p>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      {getStatusBadge(order.orderStatus)}
                      {order.verifiedAt && (
                        <p className="text-xs text-gray-600 mt-1">
                          Verified: {formatDate(order.verifiedAt)}
                        </p>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1 text-sm"
                        >
                          <FaEye /> View
                        </button>
                        
                        {order.paymentStatus === 'pending_verification' && (
                          <>
                            <button
                              onClick={() => handleVerifyPayment(order.id)}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 flex items-center gap-1 text-sm"
                            >
                              <FaCheckCircle /> Verify Payment
                            </button>
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1 text-sm"
                            >
                              <FaTimesCircle /> Cancel
                            </button>
                          </>
                        )}
                        
                        {order.paymentStatus === 'verified' && (
                          <button
                            onClick={() => handleMarkAsPaid(order.id)}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-1 text-sm"
                            >
                            <FaMoneyBillWave /> Mark as Paid
                          </button>
                        )}
                        
                        <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1 text-sm">
                          <FaEdit />
                          <span onClick={() => setEditingOrder(order)} className="ml-1">Edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 border rounded text-gray-700 hover:bg-gray-50">
                Previous
              </button>
              <button className="px-3 py-1 border rounded bg-blue-600 text-white">
                1
              </button>
              <button className="px-3 py-1 border rounded text-gray-700 hover:bg-gray-50">
                2
              </button>
              <button className="px-3 py-1 border rounded text-gray-700 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order Details</h2>
                  <p className="text-gray-600">{selectedOrder.orderNumber || 'N/A'}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              {/* Order Info Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Order Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-3">Order Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Number:</span>
                      <span className="font-bold text-gray-900">{selectedOrder.orderNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="text-gray-900">{formatDate(selectedOrder.submittedAt || selectedOrder.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-bold text-green-600">M-PESA Till</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Till Number:</span>
                      <span className="font-bold text-gray-900">{selectedOrder.tillNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">M-PESA Code:</span>
                      <span className="font-mono font-bold text-gray-900">{selectedOrder.mpesaCode || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Phone:</span>
                      <span className="text-gray-900">{selectedOrder.paymentPhone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Payment Status */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-3">Payment & Order Status</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-600 mb-1">Payment Status</p>
                      <div className="inline-block">
                        {getStatusBadge(selectedOrder.paymentStatus)}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Order Status</p>
                      <div className="inline-block">
                        {getStatusBadge(selectedOrder.orderStatus)}
                      </div>
                    </div>
                    {selectedOrder.verifiedAt && (
                      <div>
                        <p className="text-gray-600 mb-1">Verified At</p>
                        <p>{formatDate(selectedOrder.verifiedAt)}</p>
                      </div>
                    )}
                    {selectedOrder.notes && (
                      <div>
                        <p className="text-gray-600 mb-1">Notes</p>
                        <p className="text-sm text-gray-700">{selectedOrder.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Customer Information */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Full Name</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.customer?.name || 
                         (selectedOrder.rawCustomerInfo?.firstName && selectedOrder.rawCustomerInfo?.lastName 
                           ? `${selectedOrder.rawCustomerInfo.firstName} ${selectedOrder.rawCustomerInfo.lastName}`
                           : 'Customer')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Phone Number</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.customer?.phone || selectedOrder.rawCustomerInfo?.phone || 'No Phone'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Email Address</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.customer?.email || selectedOrder.rawCustomerInfo?.email || 'No Email'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Order Value</p>
                      <p className="font-bold text-red-600 text-lg">
                        KSh {(selectedOrder.total || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Show all customer info if available */}
                  {selectedOrder.rawCustomerInfo && Object.keys(selectedOrder.rawCustomerInfo).length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-gray-600 text-sm mb-2">All Customer Data:</p>
                      <div className="bg-white p-3 rounded border">
                        <pre className="text-xs text-gray-700 overflow-x-auto">
                          {JSON.stringify(selectedOrder.rawCustomerInfo, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Shipping Address */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Shipping Address</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Street Address</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.shippingAddress?.street || 
                         selectedOrder.rawShippingAddress?.street || 
                         'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">Apartment/Suite</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.shippingAddress?.apartment || 
                         selectedOrder.rawShippingAddress?.apartment || 
                         'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">City</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.shippingAddress?.city || 
                         selectedOrder.rawShippingAddress?.city || 
                         'Nairobi'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm mb-1">County</p>
                      <p className="font-medium text-gray-900">
                        {selectedOrder.shippingAddress?.county || 
                         selectedOrder.rawShippingAddress?.county || 
                         'Not specified'}
                      </p>
                    </div>
                    {(selectedOrder.shippingAddress?.deliveryNotes || selectedOrder.rawShippingAddress?.deliveryNotes) && (
                      <div className="col-span-2">
                        <p className="text-gray-600 text-sm mb-1">Delivery Notes</p>
                        <p className="font-medium text-sm">
                          {selectedOrder.shippingAddress?.deliveryNotes || selectedOrder.rawShippingAddress?.deliveryNotes}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Show all shipping info if available */}
                  {selectedOrder.rawShippingAddress && Object.keys(selectedOrder.rawShippingAddress).length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-gray-600 text-sm mb-2">All Shipping Data:</p>
                      <div className="bg-white p-3 rounded border">
                        <pre className="text-xs text-gray-700 overflow-x-auto">
                          {JSON.stringify(selectedOrder.rawShippingAddress, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Order Items */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-900 mb-3">Order Items ({selectedOrder.items?.length || 0})</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-4">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="flex items-center border-b pb-4 last:border-0">
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center mr-4">
                          {item.image ? (
                            <img src={item.image} alt={item.name || 'Product'} className="w-full h-full object-cover rounded" />
                          ) : (
                            <FaBoxOpen className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name || 'Unnamed Product'}</p>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity || 1}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            KSh {(item.price || 0).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Total: KSh {((item.quantity || 1) * (item.price || 0)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Order Totals */}
                    <div className="pt-4 border-t">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="text-gray-900 font-medium">KSh {(selectedOrder.subtotal || selectedOrder.total || 0).toLocaleString()}</span>
                        </div>
                        {(selectedOrder.shippingFee || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Shipping Fee</span>
                            <span className="text-gray-900">KSh {(selectedOrder.shippingFee || 0).toLocaleString()}</span>
                          </div>
                        )}
                        {(selectedOrder.discount || 0) > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span>-KSh {(selectedOrder.discount || 0).toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                          <span className="text-gray-900">Total Amount</span>
                          <span className="text-gray-900 font-bold">
                            KSh {(selectedOrder.total || selectedOrder.amount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                
                {selectedOrder.paymentStatus === 'pending_verification' && (
                  <button
                    onClick={() => {
                      handleVerifyPayment(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <FaCheckCircle /> Verify Payment
                  </button>
                )}
                
                <button
                  onClick={() => downloadOrderDocument(selectedOrder, 'invoice')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <FaPrint /> Download Invoice
                </button>

                <button
                  onClick={() => downloadOrderDocument(selectedOrder, 'delivery-note')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <FaDownload /> Delivery Note
                </button>
                
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                  <FaWhatsapp /> WhatsApp Customer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Edit Order</h2>
                <button onClick={() => setEditingOrder(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Customer Name</label>
                  <input
                    className="w-full mt-1 p-2 border rounded"
                    value={editingOrder.customer?.name || editingOrder.customer_name || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customer: { ...(editingOrder.customer||{}), name: e.target.value }, customer_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Phone</label>
                  <input
                    className="w-full mt-1 p-2 border rounded"
                    value={editingOrder.customer?.phone || editingOrder.customer_phone || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customer: { ...(editingOrder.customer||{}), phone: e.target.value }, customer_phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Email</label>
                  <input
                    className="w-full mt-1 p-2 border rounded"
                    value={editingOrder.customer?.email || editingOrder.customer_email || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, customer: { ...(editingOrder.customer||{}), email: e.target.value }, customer_email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Notes</label>
                  <textarea
                    className="w-full mt-1 p-2 border rounded"
                    rows={3}
                    value={editingOrder.notes || ''}
                    onChange={(e) => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-gray-600">Order Status</label>
                    <select className="w-full mt-1 p-2 border rounded"
                      value={editingOrder.orderStatus || editingOrder.order_status || 'pending'}
                      onChange={(e) => setEditingOrder({ ...editingOrder, orderStatus: e.target.value, order_status: e.target.value })}
                    >
                      <option value="pending">pending</option>
                      <option value="pending_verification">pending_verification</option>
                      <option value="confirmed">confirmed</option>
                      <option value="processing">processing</option>
                      <option value="shipped">shipped</option>
                      <option value="delivered">delivered</option>
                      <option value="cancelled">cancelled</option>
                      <option value="completed">completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-600">Payment Status</label>
                    <select className="w-full mt-1 p-2 border rounded"
                      value={editingOrder.paymentStatus || editingOrder.payment_status || 'pending_verification'}
                      onChange={(e) => setEditingOrder({ ...editingOrder, paymentStatus: e.target.value, payment_status: e.target.value })}
                    >
                      <option value="pending_verification">pending_verification</option>
                      <option value="verified">verified</option>
                      <option value="paid">paid</option>
                      <option value="failed">failed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setEditingOrder(null)} className="px-4 py-2 border rounded text-gray-700">Cancel</button>
                <button onClick={async () => {
                  try {
                    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
                    const payload = {
                      customer_name: editingOrder.customer_name || editingOrder.customer?.name,
                      customer_phone: editingOrder.customer_phone || editingOrder.customer?.phone,
                      customer_email: editingOrder.customer_email || editingOrder.customer?.email,
                      notes: editingOrder.notes,
                      order_status: editingOrder.order_status || editingOrder.orderStatus,
                      payment_status: editingOrder.payment_status || editingOrder.paymentStatus
                    };

                    const res = await fetch(`/api/orders/${editingOrder.id}`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err.error || 'Failed to save');
                    }

                    const body = await res.json();
                    // update local orders list
                    const updatedOrder = body.order;
                    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? ({...o, ...updatedOrder}) : o));
                    setSelectedOrder(updatedOrder);
                    setEditingOrder(null);
                    alert('Order updated');
                  } catch (e) {
                    console.error(e);
                    alert(e.message || 'Failed to update order');
                  }
                }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;