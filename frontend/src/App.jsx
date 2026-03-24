// src/App.jsx - COMPLETE UPDATED VERSION WITH REJECTED BATCHES AND ERRAND SYSTEM
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Existing Admin System
import AuthPage from './components/AuthPage';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import AddProduct from './pages/AddProduct';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Orders from './pages/Orders';

// Staff Management
import StaffManagement from './pages/StaffManagement';

// Inventory Receiving System
import BatchReceiving from './pages/inventory/BatchReceiving';
import BatchApproval from './pages/inventory/BatchApproval';
import InventoryDashboard from './pages/inventory/InventoryDashboard';
import InventoryTransactions from './pages/inventory/InventoryTransactions';
import RejectedBatches from './pages/inventory/RejectedBatches';

// ===== ERRAND SYSTEM IMPORTS =====
import ErrandDashboard from './pages/errand/ErrandDashboard';
import CreateErrand from './pages/errand/CreateErrand';
import CreateRunnerErrand from './pages/errand/CreateRunnerErrand';
import ErrandSubmit from './pages/errand/ErrandSubmit';
import ErrandApproval from './pages/errand/ErrandApproval';
import MyErrands from './pages/errand/MyErrands';
import RunnerPerformance from './pages/errand/RunnerPerformance';  
import ErrandDetails from './pages/errand/ErrandDetails';
// =================================

// Website System
import { CartProvider } from './website/context/CartContext';
import WebsiteLayout from './website/layout/WebsiteLayout';
import HomePage from './website/pages/HomePage';
import ShopPage from './website/pages/ShopPage';
import ProductDetailPage from './website/pages/ProductDetailPage';
import CartPage from './website/pages/CartPage';
import CheckoutPage from './website/pages/CheckoutPage';
import TrackOrderPage from './website/pages/TrackOrderPage';
import OrderConfirmationPage from './website/pages/OrderConfirmationPage';
import PaymentPage from './website/pages/PaymentPage';
import PaymentSuccessPage from './website/pages/PaymentSuccessPage';
import PaymentPendingPage from './website/pages/PaymentPendingPage';

// CSS imports for Vite
import './index.css';

import ToastContainer from './components/ui/ToastContainer';

// Helper component to check user role and redirect
const DashboardOrRedirect = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // If user is errand runner, redirect to errands page
  if (user.role === 'errand') {
    return <Navigate to="/errands" replace />;
  }
  
  // Otherwise show the regular dashboard
  return <Dashboard />;
};

function App() {
  return (
    <CartProvider>
      <ToastContainer />
      <Router>
        <Routes>
          {/* === WEBSITE (Public) === */}
          <Route path="/" element={<WebsiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="product/:id" element={<ProductDetailPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="order-confirmation/:orderId" element={<OrderConfirmationPage />} />
            <Route path="track-order" element={<TrackOrderPage />} />
            <Route path="deals" element={<ShopPage />} />
            <Route path="about" element={<div className="container mx-auto px-4 py-8"><h1>About</h1></div>} />
            <Route path="contact" element={<div className="container mx-auto px-4 py-8"><h1>Contact</h1></div>} />
            <Route path="payment" element={<PaymentPage />} />
            <Route path="payment-success" element={<PaymentSuccessPage />} />
            <Route path="payment-pending" element={<PaymentPendingPage />} />
          </Route>

          {/* === ADMIN AUTH === */}
          <Route path="/auth" element={<AuthPage />} />

          {/* === ADMIN DASHBOARD === */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardOrRedirect />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<AddProduct />} />
            <Route path="orders" element={<Orders />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="sales" element={<Sales />} />
            <Route path="customers" element={<Customers />} />
            <Route path="reports" element={<Reports />} />
            <Route path="staff" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <StaffManagement />
              </ProtectedRoute>
            } />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* === INVENTORY RECEIVING SYSTEM === */}
          <Route path="/inventory" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<InventoryDashboard />} />
            <Route path="receiving" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'receiver']}>
                <BatchReceiving />
              </ProtectedRoute>
            } />
            <Route path="approval" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'senior']}>
                <BatchApproval />
              </ProtectedRoute>
            } />
            <Route path="transactions" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'senior']}>
                <InventoryTransactions />
              </ProtectedRoute>
            } />
            <Route path="rejected-batches" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'receiver']}>
                <RejectedBatches />
              </ProtectedRoute>
            } />
          </Route>

          {/* === ERRAND SYSTEM === */}
          <Route path="/errands" element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'senior', 'errand']}>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ErrandDashboard />} />
            
            {/* My Errands page for runners */}
            <Route path="my" element={
              <ProtectedRoute allowedRoles={['errand']}>
                <MyErrands />
              </ProtectedRoute>
            } />
            
            {/* RUNNER PERFORMANCE - FOR ADMINS */}
            <Route path="runner-performance" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'senior']}>
                <RunnerPerformance />
              </ProtectedRoute>
            } />
            
            {/*  ERRAND DETAILS */}
            <Route path="details/:errandId" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'senior', 'errand']}>
                <ErrandDetails />
              </ProtectedRoute>
             } />

            {/* Admin/Senior create errand */}
            <Route path="create" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'senior']}>
                <CreateErrand />
              </ProtectedRoute>
            } />
            
            {/* Runner create their own errand */}
            <Route path="create-runner" element={
              <ProtectedRoute allowedRoles={['errand']}>
                <CreateRunnerErrand />
              </ProtectedRoute>
            } />
            
            <Route path="submit/:errandId" element={
              <ProtectedRoute allowedRoles={['errand', 'admin', 'manager', 'senior']}>
                <ErrandSubmit />
              </ProtectedRoute>
            } />
            
            <Route path="approval/:errandId" element={
              <ProtectedRoute allowedRoles={['admin', 'senior', 'manager']}>
                <ErrandApproval />
              </ProtectedRoute>
            } />
          </Route>

          {/* === REDIRECTS === */}
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;