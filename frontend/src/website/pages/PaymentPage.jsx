// src/website/pages/PaymentPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  FaArrowLeft, FaCreditCard, FaMobileAlt, FaMoneyBillWave,
  FaSpinner, FaCheckCircle, FaTimesCircle, FaLock,
  FaShieldAlt, FaClock, FaReceipt, FaRedo, FaInfoCircle,
  FaExclamationTriangle, FaDatabase, FaStore, FaPhone,
  FaShoppingCart, FaQrcode, FaCaretDown, FaCopy, FaCheck,
  FaPaperPlane, FaHourglassHalf, FaUser, FaMapMarkerAlt, FaEnvelope,
  FaListOl, FaKey
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();
  
  // Get order data from location state
  const orderData = location.state?.orderData || {};
  
  const [paymentMethod, setPaymentMethod] = useState('mpesa_till');
  const [paymentPhone, setPaymentPhone] = useState(() => orderData.customerInfo?.phone || '');
  const [mpesaCode, setMpesaCode] = useState('');
  const tillNumber = '451234';
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);
  const [codeSubmitted, setCodeSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Calculate total
  const total = orderData.total || 0;
  
  // Extract real customer data
  const customerInfo = orderData.customerInfo || {};
  const shippingAddress = orderData.shippingAddress || {};
  const cartItems = orderData.cartItems || [];
  const orderId = orderData.orderId;
  const orderNumber = orderData.orderNumber;

  useEffect(() => {
    if (!orderData || !customerInfo || !shippingAddress) {
      navigate('/cart');
    }
  }, [orderData, customerInfo, shippingAddress, navigate]);

  const handlePayViaMpesa = () => {
    setShowPaymentInstructions(true);
    setErrorMessage('');
    setInfoMessage(`📱 Pay via M-PESA to Till Number: ${tillNumber}`);
  };

  const handleSubmitOrder = async () => {
    if (!mpesaCode.trim()) {
      setErrorMessage('Please enter the name used to pay');
      return;
    }

    if (mpesaCode.trim().length < 2) {
      setErrorMessage('Please enter at least two characters for the payer name');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use real order data
      const finalOrderId = orderId || `ORD-${Date.now()}`;
      const finalOrderNumber = orderNumber || finalOrderId;
      const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      // Create order object with REAL data
      const order = {
        id: finalOrderId,
        orderNumber: finalOrderNumber,
        transactionId: transactionId,
        paymentMethod: 'mpesa_till',
        mpesaCode: mpesaCode.trim(),
        paymentPhone: paymentPhone || customerInfo.phone,
        paymentStatus: 'pending_verification',
        orderStatus: 'pending_verification',
        amount: total,
        items: cartItems,
        customerInfo: customerInfo,
        shippingAddress: shippingAddress,
        billingAddress: orderData.billingAddress || shippingAddress,
        tillNumber: tillNumber,
        submittedAt: new Date().toISOString(),
        createdAt: orderData.createdAt || new Date().toISOString(),
        note: 'Awaiting admin verification of M-PESA code',
        // Additional order details
        subtotal: orderData.subtotal || total,
        shippingFee: orderData.shippingFee || 0,
        discount: orderData.discount || 0,
        cartTotal: orderData.cartTotal || total
      };
      
      // Save to localStorage for user history
      const existingOrders = JSON.parse(localStorage.getItem('hnj_orders') || '[]');
      existingOrders.push(order);
      localStorage.setItem('hnj_orders', JSON.stringify(existingOrders));
      
      // Save to pending verifications for admin
      const pendingVerifications = JSON.parse(localStorage.getItem('pending_verifications') || '[]');
      pendingVerifications.push(order);
      localStorage.setItem('pending_verifications', JSON.stringify(pendingVerifications));
      
      // Clear cart
      clearCart();
      
      // Mark as submitted
      setCodeSubmitted(true);
      setPaymentStatus('code_submitted');
      
      // Navigate to pending verification page with ALL real data
      setTimeout(() => {
        navigate('/payment-pending', { 
          state: { 
            orderId: order.id,
            orderNumber: order.orderNumber,
            mpesaCode: order.mpesaCode,
            amount: total,
            customerInfo: customerInfo,
            shippingAddress: shippingAddress,
            cartItems: cartItems,
            tillNumber: tillNumber,
            submittedAt: order.submittedAt,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discount: order.discount,
            cartTotal: order.cartTotal
          }
        });
      }, 1500);
      
    } catch (error) {
      console.error('Failed to submit order:', error);
      setErrorMessage('Failed to submit order. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleCopyTillNumber = () => {
    navigator.clipboard.writeText(tillNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBackToCheckout = () => {
    navigate('/checkout', { state: { orderData } });
  };

  if (paymentStatus === 'code_submitted') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <FaSpinner className="text-4xl text-blue-500 animate-spin mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Redirecting...</h1>
                <p className="text-gray-600">Taking you to order status page</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="mb-6">
                <FaTimesCircle className="text-6xl text-red-500 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
                <p className="text-gray-600 mb-4">{errorMessage}</p>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={() => setPaymentStatus('pending')}
                  className="w-full py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
                
                <button
                  onClick={handleBackToCheckout}
                  className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                >
                  Back to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Complete Payment</h1>
          <button
            onClick={handleBackToCheckout}
            className="inline-flex items-center gap-2 text-red-600 hover:text-red-800"
          >
            <FaArrowLeft /> Back to Checkout
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Payment Methods */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FaLock /> Select Payment Method
              </h2>
              
              <div className="space-y-4">
                {/* M-PESA Till Option */}
                <div className={`p-4 border-2 rounded-lg transition-all ${
                  paymentMethod === 'mpesa_till' ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mpesa_till"
                      checked={paymentMethod === 'mpesa_till'}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        setShowPaymentInstructions(false);
                        setCodeSubmitted(false);
                        setMpesaCode('');
                      }}
                      className="text-green-600 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <FaMobileAlt className="text-green-600 text-xl" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">M-PESA Till Number</div>
                          <p className="text-gray-600 text-sm">Pay via M-PESA Buy Goods</p>
                        </div>
                      </div>
                    </div>
                  </label>
                  
                  {paymentMethod === 'mpesa_till' && (
                    <div className="mt-4 ml-10 pl-4 border-l-2 border-green-200">
                      {/* Pay via M-PESA Button (only shows initially) */}
                      {!showPaymentInstructions && !codeSubmitted && (
                        <button
                          onClick={handlePayViaMpesa}
                          className="w-full py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 mb-4"
                        >
                          <FaMobileAlt /> Pay via M-PESA
                        </button>
                      )}
                      
                      {/* Payment Instructions & Code Input */}
                      {showPaymentInstructions && !codeSubmitted && (
                        <div className="space-y-4">
                          {/* Till Number Display */}
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <FaShoppingCart className="text-green-600" />
                                Pay to Our M-PESA Till
                              </h3>
                              <button
                                onClick={handleCopyTillNumber}
                                className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                              >
                                {copied ? (
                                  <>
                                    <FaCheck /> Copied!
                                  </>
                                ) : (
                                  <>
                                    <FaCopy /> Copy
                                  </>
                                )}
                              </button>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between items-center p-3 bg-white border border-green-300 rounded">
                                <div>
                                  <p className="text-sm text-gray-600 mb-1">Till Number</p>
                                  <p className="text-2xl font-bold text-green-600">{tillNumber}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600 mb-1">Amount to Pay</p>
                                  <p className="text-2xl font-bold text-green-600">
                                    KSh {total.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              
                              {/* M-PESA Steps */}
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <FaListOl className="text-blue-600" />
                                  Follow These Steps:
                                </h4>
                                <ol className="space-y-3">
                                  <li className="flex items-start">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                      <span className="text-blue-600 font-bold">1</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">Go to M-PESA on your phone</p>
                                      <p className="text-sm text-gray-600">Open your M-PESA menu</p>
                                    </div>
                                  </li>
                                  <li className="flex items-start">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                      <span className="text-blue-600 font-bold">2</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">Select "Lipa na M-PESA"</p>
                                      <p className="text-sm text-gray-600">Choose payment option</p>
                                    </div>
                                  </li>
                                  <li className="flex items-start">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                      <span className="text-blue-600 font-bold">3</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">Select "Buy Goods and Services"</p>
                                      <p className="text-sm text-gray-600">Choose this option</p>
                                    </div>
                                  </li>
                                  <li className="flex items-start">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                      <span className="text-blue-600 font-bold">4</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">Enter Till Number</p>
                                      <p className="text-sm text-gray-600">Enter: <strong className="text-green-700">{tillNumber}</strong></p>
                                    </div>
                                  </li>
                                  <li className="flex items-start">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                      <span className="text-blue-600 font-bold">5</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">Enter Amount</p>
                                      <p className="text-sm text-gray-600">Enter: <strong className="text-green-700">KSh {total.toLocaleString()}</strong></p>
                                    </div>
                                  </li>
                                  <li className="flex items-start">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                      <span className="text-blue-600 font-bold">6</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">Enter M-PESA PIN</p>
                                      <p className="text-sm text-gray-600">Confirm with your PIN</p>
                                    </div>
                                  </li>
                                  <li className="flex items-start">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                                      <span className="text-blue-600 font-bold">7</span>
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">Wait for Confirmation SMS</p>
                                      <p className="text-sm text-gray-600">You'll receive an SMS with a transaction code</p>
                                    </div>
                                  </li>
                                </ol>
                              </div>
                            </div>
                          </div>
                          
                          {/* M-PESA Code Input */}
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <FaKey className="text-yellow-600" />
                              Enter the name used to pay (only)
                            </h3>
                            
                            <div className="mb-4">
                              <label className="block text-gray-700 mb-2 font-medium">
                                Payer Name *
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={mpesaCode}
                                  onChange={(e) => setMpesaCode(e.target.value)}
                                  placeholder="Enter payer name exactly as used on payment"
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-lg"
                                  disabled={isProcessing}
                                />
                              </div>
                              <p className="text-gray-500 text-sm mt-1">
                                Enter the name that was used to make the payment (exactly as entered on the payee name)
                              </p>
                            </div>
                            
                            {/* Optional Phone Number */}
                            <div className="mb-4">
                              <label className="block text-gray-700 mb-2 font-medium">
                                Your M-PESA Phone Number (Optional)
                              </label>
                              <div className="relative">
                                <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                  type="tel"
                                  value={paymentPhone}
                                  onChange={(e) => setPaymentPhone(e.target.value)}
                                  placeholder="0712 345 678"
                                  className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                  disabled={isProcessing}
                                />
                              </div>
                              <p className="text-gray-500 text-sm mt-1">
                                The phone number you used to make the payment
                              </p>
                            </div>
                            
                            {/* Complete Order Button */}
                            <div className="flex gap-3">
                              <button
                                onClick={handleSubmitOrder}
                                disabled={isProcessing || !mpesaCode.trim()}
                                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {isProcessing ? (
                                  <>
                                    <FaSpinner className="animate-spin" /> Processing...
                                  </>
                                ) : (
                                  <>
                                    <FaCheckCircle /> Complete Order
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={() => {
                                  setShowPaymentInstructions(false);
                                  setMpesaCode('');
                                }}
                                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                              >
                                Back
                              </button>
                            </div>
                            
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                              <p className="text-sm text-blue-700">
                                <strong>Note:</strong> Your order will be marked as <strong>Pending Verification</strong>. 
                                Our admin team will cross-check this code with our M-PESA statements. 
                                You'll be notified once verification is complete.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Code Submitted Confirmation */}
                      {codeSubmitted && (
                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-3 mb-3">
                            <FaCheckCircle className="text-2xl text-green-600" />
                            <div>
                              <h4 className="font-bold text-green-800">Order Submitted! ✓</h4>
                              <p className="text-green-700 text-sm">Transaction Code: <strong>{mpesaCode}</strong></p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">
                            Your order has been submitted with M-PESA code. Our admin team will now verify the payment.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Card Option (Optional - for future) */}
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="text-blue-600 mr-3"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FaCreditCard className="text-blue-600 text-xl" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Credit/Debit Card</div>
                        <p className="text-gray-600 text-sm">Coming Soon</p>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
              
              {/* Error Message */}
              {errorMessage && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <FaTimesCircle />
                    <span className="font-medium">{errorMessage}</span>
                  </div>
                </div>
              )}
              
              {/* Info Message */}
              {infoMessage && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <FaInfoCircle />
                    <span>{infoMessage}</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Security Assurance */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <FaShieldAlt className="text-2xl text-green-600" />
                <h3 className="font-bold text-gray-900">Secure & Verified</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4">
                  <div className="text-2xl text-green-600 mb-2">📱</div>
                  <p className="text-sm font-medium text-gray-900">M-PESA Secure</p>
                  <p className="text-xs text-gray-600">Official Safaricom payment</p>
                </div>
                <div className="text-center p-4">
                  <div className="text-2xl text-green-600 mb-2">✅</div>
                  <p className="text-sm font-medium text-gray-900">Manual Verification</p>
                  <p className="text-xs text-gray-600">Admin confirms each payment</p>
                </div>
                <div className="text-center p-4">
                  <div className="text-2xl text-green-600 mb-2">🔒</div>
                  <p className="text-sm font-medium text-gray-900">Order Protection</p>
                  <p className="text-xs text-gray-600">Only ship after verification</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b">Order Summary</h2>
              
              {/* Order Items Summary */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FaShoppingCart /> Items ({cartItems.length})
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {cartItems.map((item, index) => (
                    <div key={index} className="flex items-center border-b pb-3 last:border-0">
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center mr-3 flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
                        ) : (
                          <FaShoppingCart className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} × KSh {item.price?.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          KSh {(item.quantity * (item.price || 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Order Totals */}
              <div className="space-y-3 mb-6 pt-4 border-t">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">KSh {(orderData.subtotal || total).toLocaleString()}</span>
                </div>
                
                {orderData.shippingFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">KSh {orderData.shippingFee?.toLocaleString()}</span>
                  </div>
                )}
                
                {orderData.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span className="font-medium">-KSh {orderData.discount?.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-3 border-t">
                  <div>
                    <span className="text-lg font-bold text-gray-900">Total to Pay</span>
                    <p className="text-gray-500 text-sm mt-1">
                      M-PESA Till Number
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-red-600">
                    KSh {total.toLocaleString()}
                  </span>
                </div>
              </div>
              
              {/* Status Display */}
              {showPaymentInstructions && !codeSubmitted && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FaMobileAlt className="text-blue-600" />
                    <span className="font-semibold text-blue-800">Ready to Pay</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Follow the M-PESA steps on the left and enter your transaction code.
                  </p>
                </div>
              )}
              
              {codeSubmitted && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FaCheckCircle className="text-green-600" />
                    <span className="font-semibold text-green-800">Order Submitted</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Your order is now pending admin verification.
                  </p>
                </div>
              )}
              
              {/* Order Details */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FaReceipt /> Order Details
                </h3>
                <div className="space-y-2 text-sm">
                  {orderNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Number:</span>
                      <span className="font-mono font-bold text-gray-900">#{orderNumber}</span>
                    </div>
                  )}
                  {orderId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order ID:</span>
                      <span className="font-mono font-medium text-gray-900">#{orderId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium text-gray-900">{cartItems.length} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Till Number:</span>
                    <span className="font-bold text-green-600">{tillNumber}</span>
                  </div>
                </div>
              </div>
              
              {/* Customer Information */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FaUser /> Customer Information
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Name</p>
                    <p className="font-medium text-gray-900">
                      {customerInfo.firstName} {customerInfo.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Phone</p>
                    <p className="font-medium text-gray-900">
                      {customerInfo.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Email</p>
                    <p className="font-medium text-gray-900">
                      {customerInfo.email}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Shipping Address */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FaMapMarkerAlt /> Shipping Address
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">Address</p>
                    <p className="font-medium text-gray-900">
                      {shippingAddress.street}, {shippingAddress.apartment}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-gray-600 mb-1">City</p>
                      <p className="font-medium text-gray-900">{shippingAddress.city}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-600 mb-1">County</p>
                      <p className="font-medium text-gray-900">{shippingAddress.county}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Button */}
              <div className="mt-6">
                {!showPaymentInstructions && !codeSubmitted && (
                  <button
                    onClick={handlePayViaMpesa}
                    disabled={isProcessing}
                    className={`w-full py-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 ${
                      isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    <FaMobileAlt /> Pay via M-PESA
                  </button>
                )}
                
                <p className="text-gray-500 text-sm mt-3 text-center">
                  {codeSubmitted 
                    ? 'Your order is pending verification'
                    : showPaymentInstructions
                    ? 'Follow the steps to complete payment'
                    : 'Select payment method to continue'
                  }
                </p>
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <p className="text-gray-500 text-sm">
                  Need help? Call us at{' '}
                  <span className="font-semibold text-red-600">0712 345 678</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;