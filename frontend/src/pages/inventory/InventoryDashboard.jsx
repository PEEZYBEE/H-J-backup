import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, AlertCircle, TrendingUp, RefreshCw, DollarSign, Users } from 'lucide-react';
import { productsAPI, receivingAPI } from '../../services/api';

const InventoryDashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    pendingBatches: 0,
    inventoryValue: 0,
    activeSuppliers: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentBatches, setRecentBatches] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      
      // Fetch products
      const productsRes = await productsAPI.getAllProducts();
      const products = productsRes.products || productsRes.data?.products || [];
      
      // Fetch pending batches
      const batchesRes = await receivingAPI.getPendingBatches();
      const batches = batchesRes.batches || [];
      
      // Fetch suppliers
      const suppliersRes = await receivingAPI.getSuppliers();
      const suppliers = suppliersRes.suppliers || [];
      
      // Fetch recent batches
      const myBatchesRes = await receivingAPI.getMyBatches();
      const myBatches = myBatchesRes.batches || [];
      
      // Calculate statistics
      const totalProducts = products.length;
      const lowStock = products.filter(p => (p.stock_quantity || 0) <= (p.min_stock_level || 5)).length;
      const pendingBatches = batches.length;
      const activeSuppliers = suppliers.filter(s => s.is_active).length;
      
      // Calculate inventory value
      const inventoryValue = products.reduce((total, product) => {
        const price = parseFloat(product.price) || 0;
        const quantity = product.stock_quantity || 0;
        return total + (price * quantity);
      }, 0);
      
      setStats({
        totalProducts,
        lowStock,
        pendingBatches,
        inventoryValue,
        activeSuppliers
      });
      
      // Get recent batches (last 5)
      setRecentBatches(myBatches.slice(0, 5) || []);
      
      // Get low stock products
      const lowStockItems = products
        .filter(p => (p.stock_quantity || 0) <= (p.min_stock_level || 5))
        .slice(0, 5);
      setLowStockProducts(lowStockItems);
      
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'pending_review': return 'text-yellow-600 bg-yellow-100';
      case 'submitted': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-gray-600">Manage stock, receiving, and inventory operations</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '...' : stats.totalProducts}
                </p>
              </div>
              <Package className="text-blue-600 w-8 h-8" />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Across all categories
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-red-600">
                  {loading ? '...' : stats.lowStock}
                </p>
              </div>
              <AlertCircle className="text-red-600 w-8 h-8" />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Needs reordering
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Pending Batches</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {loading ? '...' : stats.pendingBatches}
                </p>
              </div>
              <Truck className="text-yellow-600 w-8 h-8" />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Awaiting review
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold text-green-600">
                  {loading ? '...' : `KSh ${stats.inventoryValue.toLocaleString()}`}
                </p>
              </div>
              <DollarSign className="text-green-600 w-8 h-8" />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Total stock value
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Suppliers</p>
                <p className="text-2xl font-bold text-purple-600">
                  {loading ? '...' : stats.activeSuppliers}
                </p>
              </div>
              <Users className="text-purple-600 w-8 h-8" />
            </div>
            <div className="mt-2 text-sm text-gray-500">
              Active suppliers
            </div>
          </div>
        </div>

        {/* Quick Actions & Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Actions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => window.location.href = '/inventory/receiving'}
                  className="p-4 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Truck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Create Batch</p>
                      <p className="text-sm text-gray-600">Receive new stock</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => window.location.href = '/inventory/approval'}
                  className="p-4 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Review Batches</p>
                      <p className="text-sm text-gray-600">
                        {stats.pendingBatches} pending
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => window.location.href = '/dashboard/products'}
                  className="p-4 border border-green-200 rounded-lg hover:bg-green-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Manage Products</p>
                      <p className="text-sm text-gray-600">View/edit products</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={fetchInventoryData}
                  className="p-4 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Refresh Data</p>
                      <p className="text-sm text-gray-600">Update statistics</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Low Stock Products */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Low Stock Products</h2>
                <button
                  onClick={() => window.location.href = '/dashboard/products?filter=low_stock'}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View All
                </button>
              </div>
              
              {lowStockProducts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">All products are well-stocked</p>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.map(product => (
                    <div key={product.id} className="border border-red-200 rounded-lg p-4 hover:bg-red-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-600">
                            SKU: {product.sku} • Min: {product.min_stock_level || 5}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">
                            {product.stock_quantity || 0} left
                          </p>
                          <p className="text-sm text-gray-900">
                            KSh {parseFloat(product.price || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Batches */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Recent Batches</h2>
                <button
                  onClick={() => window.location.href = '/inventory/approval'}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View All
                </button>
              </div>
              
              {recentBatches.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No batches found</p>
              ) : (
                <div className="space-y-3">
                  {recentBatches.map(batch => (
                    <div key={batch.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900">{batch.batch_number}</p>
                          <p className="text-sm text-gray-600">
                            Supplier: {batch.supplier_name || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(batch.status)}`}>
                            {batch.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <p className="text-sm font-bold text-gray-900 mt-1">
                            KSh {parseFloat(batch.total_value || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(batch.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Inventory Health</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Stock Coverage</span>
                    <span className="text-sm font-bold text-gray-900">
                      {stats.totalProducts > 0 
                        ? `${Math.round((stats.totalProducts - stats.lowStock) / stats.totalProducts * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ 
                        width: stats.totalProducts > 0 
                          ? `${(stats.totalProducts - stats.lowStock) / stats.totalProducts * 100}%`
                          : '0%' 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.totalProducts - stats.lowStock} of {stats.totalProducts} products well-stocked
                  </p>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Value Distribution</span>
                    <span className="text-sm font-bold text-gray-900">
                      {stats.inventoryValue > 0 ? '100%' : '0%'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Total inventory value: KSh {stats.inventoryValue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">System Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Database</span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">API Server</span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Storage</span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Normal</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Barcode System</span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Ready</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
              <div className="space-y-2">
                <a 
                  href="/dashboard/inventory" 
                  className="block p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <p className="font-medium text-gray-900">Inventory Management</p>
                  <p className="text-sm text-gray-600">View and adjust stock levels</p>
                </a>
                <a 
                  href="/dashboard/reports" 
                  className="block p-3 bg-gray-50 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <p className="font-medium text-gray-900">Generate Reports</p>
                  <p className="text-sm text-gray-600">Create inventory reports</p>
                </a>
                <a 
                  href="/dashboard/suppliers" 
                  className="block p-3 bg-gray-50 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <p className="font-medium text-gray-900">Supplier Management</p>
                  <p className="text-sm text-gray-600">Manage supplier information</p>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;


