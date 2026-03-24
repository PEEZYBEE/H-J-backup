// src/website/pages/PaymentSuccessPage.jsx - FIXED with safe currency formatting
import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaCheckCircle, FaPrint, FaWhatsapp, FaEnvelope,
  FaHome, FaShoppingBag, FaReceipt, FaPhone, FaTruck
} from 'react-icons/fa';

const PaymentSuccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const {
    orderId,
    transactionId,
    paymentMethod,
    amount,
    customerInfo
  } = location.state || {};

  // ============ HELPER FUNCTIONS FOR SAFE FORMATTING ============
  
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') {
      return '0.00';
    }
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Redirect if no order data
  useEffect(() => {
    if (!orderId) {
      navigate('/');
    }
  }, [orderId, navigate]);

  // Print receipt
  const handlePrint = () => {
    window.print();
  };

  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    const formattedAmount = formatCurrency(amount);
    const message = `I just placed an order on HNJ Store! Order ID: ${orderId}\nAmount: KSh ${formattedAmount}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Download receipt
  const downloadReceipt = () => {
    const formattedAmount = formatCurrency(amount);
    const formattedDate = new Date().toLocaleString();
    const customerName = customerInfo ? `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() : 'N/A';
    const customerPhone = customerInfo?.phone || 'N/A';
    
    const receiptContent = `
      HNJ STORE RECEIPT
      =================
      
      Order ID: ${orderId || 'N/A'}
      Transaction ID: ${transactionId || 'N/A'}
      Date: ${formattedDate}
      
      Customer: ${customerName}
      Phone: ${customerPhone}
      
      Payment Method: ${paymentMethod?.toUpperCase() || 'N/A'}
      Amount Paid: KSh ${formattedAmount}
      
      Thank you for your purchase!
      
      =================
      HNJ Store
      Contact: 0712 345 678
      Email: support@hnjstore.com
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hnj-receipt-${orderId || 'unknown'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadOrderDocument = async (documentType) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const phone = customerInfo?.phone ? `?phone=${encodeURIComponent(customerInfo.phone)}` : '';
      const response = await fetch(
        `/api/orders/orders/${encodeURIComponent(orderId)}/${documentType}${phone}`,
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
      const defaultName = `${documentType}-${orderId || 'order'}.html`;
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

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Success Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="text-center mb-8">
              <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
              <p className="text-gray-600">Thank you for your order</p>
            </div>
            
            {/* Order Details */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FaReceipt /> Order Confirmation
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Order Number</p>
                  <p className="font-bold text-gray-900 text-lg">{orderId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Transaction ID</p>
                  <p className="font-medium text-gray-900">{transactionId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Payment Method</p>
                  <p className="font-medium text-gray-900 capitalize">{paymentMethod || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Amount Paid</p>
                  <p className="font-bold text-red-600 text-xl">
                    KSh {formatCurrency(amount)}
                  </p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-green-200">
                <p className="text-green-700 text-sm">
                  <strong>Note:</strong> A confirmation SMS has been sent to {customerInfo?.phone || 'your phone'}
                </p>
              </div>
            </div>
            
            {/* Next Steps */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">What Happens Next?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Order Processing</p>
                    <p className="text-gray-600 text-sm">We'll prepare your items for shipping</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Shipping Arrangement</p>
                    <p className="text-gray-600 text-sm">We'll contact you to arrange delivery</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Delivery</p>
                    <p className="text-gray-600 text-sm">Your order will be delivered to your specified address</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <button
                onClick={handlePrint}
                className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaPrint className="text-2xl text-gray-700 mb-2" />
                <span className="text-sm font-medium text-gray-900">Print Receipt</span>
              </button>
              
              <button
                onClick={downloadReceipt}
                className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaReceipt className="text-2xl text-gray-700 mb-2" />
                <span className="text-sm font-medium text-gray-900">Download Receipt</span>
              </button>

              <button
                onClick={() => downloadOrderDocument('invoice')}
                className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaReceipt className="text-2xl text-gray-700 mb-2" />
                <span className="text-sm font-medium text-gray-900">Download Invoice</span>
              </button>

              <button
                onClick={() => downloadOrderDocument('delivery-note')}
                className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaTruck className="text-2xl text-gray-700 mb-2" />
                <span className="text-sm font-medium text-gray-900">Delivery Note</span>
              </button>
              
              <button
                onClick={shareViaWhatsApp}
                className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaWhatsapp className="text-2xl text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Share on WhatsApp</span>
              </button>
              
              <Link
                to="/shop"
                className="flex flex-col items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FaShoppingBag className="text-2xl text-red-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Continue Shopping</span>
              </Link>
            </div>
            
            {/* Customer Support */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-4">Need Help?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FaPhone className="text-gray-600" />
                    <span className="font-medium text-gray-900">Call Us</span>
                  </div>
                  <p className="text-gray-600 text-sm">0712 345 678</p>
                  <p className="text-gray-500 text-xs">Mon-Sun, 8AM-8PM</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FaEnvelope className="text-gray-600" />
                    <span className="font-medium text-gray-900">Email Us</span>
                  </div>
                  <p className="text-gray-600 text-sm">support@hnjstore.com</p>
                  <p className="text-gray-500 text-xs">Response within 2 hours</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              <FaShoppingBag /> Continue Shopping
            </Link>
            
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FaHome /> Go to Homepage
            </Link>
            
            <Link
              to="/orders"
              className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FaReceipt /> View My Orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;