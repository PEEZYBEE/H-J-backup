import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaBoxOpen, 
  FaTruck, 
  FaClipboardCheck, 
  FaCashRegister, 
  FaChartBar,
  FaUsers,
  FaShoppingBag,
  FaExclamationTriangle,
  FaArrowUp,
  FaArrowDown,
  FaShoppingCart,
  FaUserFriends,
  FaWarehouse,
  FaFileAlt,
  FaMotorcycle, // NEW: for errand runner
  FaCheckCircle, // NEW: for completed errands
  FaTimesCircle, // NEW: for rejected errands
  FaClock, // NEW: for pending errands
  FaCamera
} from 'react-icons/fa';
import { toast } from '../components/ui/ToastContainer';
import { notificationsAPI } from '../services/api';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    products: [],
    todaySales: [],
    totalUsers: 0,
    pendingBatches: 0,
    lowStockItems: 0,
    totalSales: 0,
    monthlyRevenue: 0,
    activeCashiers: 0,
    todayRevenue: 0,
    pendingApprovals: 0,
    myPendingBatches: 0,
    totalBatches: 0,
    todayTransactions: 0,
    rejectedCount: 0,
    // NEW: Errand stats
    pendingErrands: 0,
    inProgressErrands: 0,
    submittedErrands: 0,
    rejectedErrands: 0,
    completedErrands: 0,
    totalEarnings: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Helper function to add auth token to requests - FIXED: using relative URLs
  const fetchWithAuth = async (url) => {
    const token = localStorage.getItem('token');
    return fetch(url, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    }).then(res => res.json()).catch(() => ({}));
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');
    console.log('Dashboard - User:', userData);
    console.log('Dashboard - Token exists:', !!token);
    setUser(userData);
    
    if (userData.role) {
      fetchDashboardData(userData.role);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchDashboardData = async (role) => {
    try {
      setLoading(true);
      
      // Common data fetch - FIXED: using relative URLs
      const [productsRes, todaySalesRes] = await Promise.all([
        fetchWithAuth('/api/products/products?limit=5'),
        fetchWithAuth('/api/sales/recent?limit=5')
      ]);

      let roleSpecificStats = {};
      
      switch(role) {
        case 'admin':
          roleSpecificStats = await fetchAdminStats();
          break;
        case 'manager':
          roleSpecificStats = await fetchManagerStats();
          break;
        case 'senior':
          roleSpecificStats = await fetchSeniorStats();
          break;
        case 'receiver':
          roleSpecificStats = await fetchReceiverStats();
          break;
        case 'cashier':
          roleSpecificStats = await fetchCashierStats();
          break;
        case 'errand': // NEW: Errand runner role
          roleSpecificStats = await fetchErrandStats();
          break;
        default:
          roleSpecificStats = {
            pendingOrders: 0,
            lowStockItems: []
          };
      }

      // Extract products data correctly
      let productsData = [];
      if (productsRes.products && Array.isArray(productsRes.products)) {
        productsData = productsRes.products;
      } else if (productsRes.data?.products && Array.isArray(productsRes.data.products)) {
        productsData = productsRes.data.products;
      } else if (Array.isArray(productsRes)) {
        productsData = productsRes;
      }

      // Extract sales data correctly
      let salesData = [];
      if (todaySalesRes.sales && Array.isArray(todaySalesRes.sales)) {
        salesData = todaySalesRes.sales;
      } else if (todaySalesRes.data?.sales && Array.isArray(todaySalesRes.data.sales)) {
        salesData = todaySalesRes.data.sales;
      } else if (Array.isArray(todaySalesRes)) {
        salesData = todaySalesRes;
      }

      setStats({
        products: productsData,
        todaySales: salesData,
        ...roleSpecificStats
      });

      // Show toast alerts for low stock when user is staff, but only once per session
      if (['admin', 'manager', 'senior', 'receiver'].includes(role)) {
        try {
          const alreadyShown = sessionStorage.getItem('saw_low_stock_toast');
          const alertData = await notificationsAPI.getLowStockAlerts();
          // Only show toasts if not already shown in this session
          if (!alreadyShown) {
            if (alertData.out_of_stock_count > 0) {
              toast(`${alertData.out_of_stock_count} product(s) are out of stock!`, 'error', 8000);
            }
            if (alertData.low_stock_count > 0) {
              toast(`${alertData.low_stock_count} product(s) running low on stock`, 'warning', 6000);
            }
            sessionStorage.setItem('saw_low_stock_toast', String(Date.now()));
          }
        } catch (e) {
          // Silently fail - toasts are non-critical
        }
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      // FIXED: using relative URLs
      const [usersRes, pendingRes, lowStockRes] = await Promise.all([
        fetchWithAuth('/api/auth/users/stats'),
        fetchWithAuth('/api/receiving/batches/pending'),
        notificationsAPI.getLowStockAlerts()
      ]);

      const lowCount = (lowStockRes.low_stock_count || 0) + (lowStockRes.out_of_stock_count || 0);

      return {
        totalUsers: usersRes.stats?.total_users || usersRes.data?.stats?.total_users || 0,
        pendingBatches: pendingRes.batches?.length || pendingRes.data?.batches?.length || 0,
        lowStockItems: lowCount,
        totalSales: 0,
        totalProducts: 0,
        monthlyRevenue: 25430
      };
    } catch (error) {
      return { totalUsers: 0, pendingBatches: 0, lowStockItems: 0, totalSales: 0, totalProducts: 0, monthlyRevenue: 25430 };
    }
  };

  const fetchManagerStats = async () => {
    try {
      // FIXED: using relative URLs
      const [pendingRes, lowStockRes, staffRes, salesRes] = await Promise.all([
        fetchWithAuth('/api/receiving/batches/pending'),
        notificationsAPI.getLowStockAlerts(),
        fetchWithAuth('/api/auth/users?role=cashier'),
        fetchWithAuth('/api/sales/recent?limit=20')
      ]);

      const lowCount = (lowStockRes.low_stock_count || 0) + (lowStockRes.out_of_stock_count || 0);

      return {
        pendingBatches: pendingRes.batches?.length || pendingRes.data?.batches?.length || 0,
        lowStockItems: lowCount,
        activeCashiers: staffRes.users?.filter(u => u.is_active).length || staffRes.data?.users?.filter(u => u.is_active).length || 0,
        todaySales: salesRes.sales?.length || salesRes.data?.sales?.length || 0,
        todayRevenue: salesRes.sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 
                     salesRes.data?.sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
      };
    } catch (error) {
      return { pendingBatches: 0, lowStockItems: 0, activeCashiers: 0, todaySales: 0, todayRevenue: 0 };
    }
  };

  const fetchSeniorStats = async () => {
    try {
      // FIXED: using relative URLs
      const [pendingRes, lowStockRes] = await Promise.all([
        fetchWithAuth('/api/receiving/batches/pending'),
        notificationsAPI.getLowStockAlerts()
      ]);
      
      const lowCount = (lowStockRes.low_stock_count || 0) + (lowStockRes.out_of_stock_count || 0);

      return {
        pendingApprovals: pendingRes.batches?.length || pendingRes.data?.batches?.length || 0,
        lowStockItems: lowCount
      };
    } catch (error) {
      return { pendingApprovals: 0, lowStockItems: 0 };
    }
  };

  const fetchReceiverStats = async () => {
    try {
      // FIXED: using relative URLs
      const batchesRes = await fetchWithAuth('/api/receiving/my-batches');
      console.log('My batches response:', batchesRes);
      
      const batches = batchesRes.batches || batchesRes.data?.batches || [];
      const pendingBatches = batches.filter(b => 
        ['draft', 'submitted'].includes(b.status)
      ).length || 0;

      let rejectedCount = 0;
      try {
        const rejectedRes = await fetchWithAuth('/api/receiving/my-rejected-batches');
        console.log('Rejected batches response:', rejectedRes);
        const rejectedBatches = rejectedRes.batches || rejectedRes.data?.batches || [];
        rejectedCount = rejectedBatches.length || 0;
      } catch (err) {
        console.error('Failed to fetch rejected batches count:', err);
      }

      return {
        myPendingBatches: pendingBatches,
        totalBatches: batches.length || 0,
        rejectedCount: rejectedCount
      };
    } catch (error) {
      console.error('Failed to fetch receiver stats:', error);
      return { 
        myPendingBatches: 0, 
        totalBatches: 0,
        rejectedCount: 0 
      };
    }
  };

  const fetchCashierStats = async () => {
    try {
      // FIXED: using relative URLs
      const salesRes = await fetchWithAuth('/api/sales/recent?limit=20');
      const sales = salesRes.sales || salesRes.data?.sales || [];
      return {
        todayTransactions: sales.length || 0,
        todayRevenue: sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
      };
    } catch (error) {
      return { todayTransactions: 0, todayRevenue: 0 };
    }
  };

  // NEW: Fetch errand runner stats
  const fetchErrandStats = async () => {
    try {
      // FIXED: using relative URLs
      const statsRes = await fetchWithAuth('/api/stats/runner');
      console.log('Errand stats response:', statsRes);
      
      if (statsRes.success && statsRes.stats) {
        return {
          pendingErrands: statsRes.stats.pending || 0,
          inProgressErrands: statsRes.stats.in_progress || 0,
          submittedErrands: statsRes.stats.submitted || 0,
          rejectedErrands: statsRes.stats.rejected || 0,
          completedErrands: statsRes.stats.completed || 0,
          totalEarnings: statsRes.stats.total_earnings || 0
        };
      }
      
      // Fallback to fetching my errands manually
      const errandsRes = await fetchWithAuth('/api/errands/my');
      const errands = errandsRes.errands || errandsRes.data?.errands || [];
      
      const pending = errands.filter(e => e.status === 'pending').length;
      const inProgress = errands.filter(e => ['accepted', 'in_progress'].includes(e.status)).length;
      const submitted = errands.filter(e => e.status === 'submitted').length;
      const rejected = errands.filter(e => e.status === 'rejected').length;
      const completed = errands.filter(e => ['approved', 'completed', 'paid'].includes(e.status)).length;
      
      // Calculate earnings from completed errands
      const totalEarnings = errands
        .filter(e => ['approved', 'completed', 'paid'].includes(e.status))
        .reduce((sum, e) => sum + (e.errand_fee || 0), 0);
      
      return {
        pendingErrands: pending,
        inProgressErrands: inProgress,
        submittedErrands: submitted,
        rejectedErrands: rejected,
        completedErrands: completed,
        totalEarnings: totalEarnings
      };
    } catch (error) {
      console.error('Failed to fetch errand stats:', error);
      return { 
        pendingErrands: 0, 
        inProgressErrands: 0, 
        submittedErrands: 0,
        rejectedErrands: 0,
        completedErrands: 0,
        totalEarnings: 0 
      };
    }
  };

  const getDashboardTitle = () => {
    if (!user) return 'Dashboard';
    
    const titles = {
      admin: 'Administrator Dashboard',
      manager: 'Manager Dashboard',
      senior: 'Senior Staff Dashboard',
      receiver: 'Receiver Dashboard',
      cashier: 'Cashier Dashboard',
      errand: 'Errand Runner Dashboard', // NEW
      customer: 'Customer Dashboard'
    };
    
    return titles[user.role] || 'Dashboard';
  };

  const getWelcomeMessage = () => {
    if (!user) return 'Welcome!';
    
    const messages = {
      admin: 'You have full system access and administrative privileges.',
      manager: 'Manage inventory, staff, and generate reports.',
      senior: 'Review and approve inventory batches for quality control.',
      receiver: 'Receive inventory batches from suppliers.',
      cashier: 'Process sales transactions and assist customers.',
      errand: 'View and manage your assigned errands and deliveries.', // NEW
      customer: 'Browse products and place orders.'
    };
    
    return messages[user.role] || 'Welcome to your dashboard!';
  };

  const StatsCard = ({ title, value, icon, color, trend, description, onClick }) => {
    const colorClasses = {
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800',
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <div 
        onClick={onClick}
        className="bg-white rounded-xl shadow p-6 cursor-pointer transform transition-transform hover:scale-105"
      >
        <div className="flex justify-between items-center mb-4">
          <div className={`p-3 rounded-lg ${colorClasses[color] || 'bg-gray-100 text-gray-800'}`}>
            {icon}
          </div>
          <div className="text-right">
            <span className={`text-sm font-medium ${trend?.includes('+') ? 'text-green-600' : trend?.toLowerCase().includes('need') ? 'text-red-600' : 'text-gray-600'}`}>
              {trend}
            </span>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
        <p className="text-gray-700 font-medium mb-1">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    );
  };

  const getStatsCards = () => {
    if (!user) return [];

    const roleCards = {
      admin: [
        {
          title: "Total Users",
          value: stats.totalUsers?.toLocaleString() || '0',
          icon: <FaUsers className="text-2xl" />,
          color: "purple",
          trend: "+8.7%",
          description: "System users",
          action: () => navigate('/dashboard/staff')
        },
        {
          title: "Pending Approvals",
          value: stats.pendingBatches?.toLocaleString() || '0',
          icon: <FaClipboardCheck className="text-2xl" />,
          color: "orange",
          trend: stats.pendingBatches > 0 ? "+New" : "All clear",
          description: "Batches awaiting review",
          action: () => navigate('/inventory/approval')
        },
        {
          title: "Low Stock Items",
          value: stats.lowStockItems?.toLocaleString() || '0',
          icon: <FaExclamationTriangle className="text-2xl" />,
          color: "red",
          trend: stats.lowStockItems > 0 ? "Needs attention" : "Good",
          description: "Items need restocking",
          action: () => navigate('/dashboard/products?filter=low-stock')
        },
        {
          title: "Monthly Revenue",
          value: `KSh ${(stats.monthlyRevenue || 0).toLocaleString()}`,
          icon: <FaChartBar className="text-2xl" />,
          color: "green",
          trend: "+15.3%",
          description: "Current month"
        }
      ],
      manager: [
        {
          title: "Pending Batches",
          value: stats.pendingBatches?.toLocaleString() || '0',
          icon: <FaClipboardCheck className="text-2xl" />,
          color: "orange",
          trend: stats.pendingBatches > 0 ? "Needs review" : "All clear",
          description: "Awaiting approval",
          action: () => navigate('/inventory/approval')
        },
        {
          title: "Active Cashiers",
          value: stats.activeCashiers?.toLocaleString() || '0',
          icon: <FaCashRegister className="text-2xl" />,
          color: "green",
          trend: "On duty",
          description: "Staff available",
          action: () => navigate('/dashboard/staff')
        },
        {
          title: "Low Stock Items",
          value: stats.lowStockItems?.toLocaleString() || '0',
          icon: <FaExclamationTriangle className="text-2xl" />,
          color: "red",
          trend: stats.lowStockItems > 0 ? "Reorder needed" : "Good",
          description: "Items below threshold",
          action: () => navigate('/dashboard/products?filter=low-stock')
        },
        {
          title: "Today's Revenue",
          value: `KSh ${(stats.todayRevenue || 0).toLocaleString()}`,
          icon: <FaShoppingCart className="text-2xl" />,
          color: "blue",
          trend: "+12.5%",
          description: "From sales"
        }
      ],
      senior: [
        {
          title: "Batches to Review",
          value: stats.pendingApprovals?.toLocaleString() || '0',
          icon: <FaClipboardCheck className="text-2xl" />,
          color: "orange",
          trend: stats.pendingApprovals > 0 ? "Needs attention" : "All clear",
          description: "Awaiting your approval",
          action: () => navigate('/inventory/approval'),
          priority: true
        },
        {
          title: "Low Stock Items",
          value: stats.lowStockItems?.toLocaleString() || '0',
          icon: <FaExclamationTriangle className="text-2xl" />,
          color: "red",
          trend: "Monitor",
          description: "Items need attention",
          action: () => navigate('/inventory')
        },
        {
          title: "Inventory Overview",
          value: "View",
          icon: <FaWarehouse className="text-2xl" />,
          color: "blue",
          trend: "",
          description: "Check stock levels",
          action: () => navigate('/inventory')
        },
        {
          title: "Transaction Log",
          value: "Review",
          icon: <FaFileAlt className="text-2xl" />,
          color: "purple",
          trend: "",
          description: "View recent activity",
          action: () => navigate('/inventory/transactions')
        }
      ],
      receiver: [
        {
          title: "My Pending Batches",
          value: stats.myPendingBatches?.toLocaleString() || '0',
          icon: <FaTruck className="text-2xl" />,
          color: "green",
          trend: stats.myPendingBatches > 0 ? "In progress" : "Clear",
          description: "Need submission",
          action: () => navigate('/inventory/receiving'),
          priority: stats.myPendingBatches > 0
        },
        {
          title: "Rejected Batches",
          value: stats.rejectedCount?.toLocaleString() || '0',
          icon: <FaExclamationTriangle className="text-2xl" />,
          color: "red",
          trend: stats.rejectedCount > 0 ? "Needs attention" : "All clear",
          description: "Batches requiring revision",
          action: () => navigate('/inventory/rejected-batches'),
          priority: stats.rejectedCount > 0
        },
        {
          title: "Total Batches",
          value: stats.totalBatches?.toLocaleString() || '0',
          icon: <FaBoxOpen className="text-2xl" />,
          color: "blue",
          trend: "All time",
          description: "Batches created",
          action: () => navigate('/inventory/receiving')
        },
        {
          title: "Create New Batch",
          value: "Start",
          icon: <FaTruck className="text-2xl" />,
          color: "orange",
          trend: "",
          description: "Receive inventory",
          action: () => navigate('/inventory/receiving?new=true')
        }
      ],
      cashier: [
        {
          title: "Today's Transactions",
          value: stats.todayTransactions?.toLocaleString() || '0',
          icon: <FaCashRegister className="text-2xl" />,
          color: "green",
          trend: "Today",
          description: "Sales processed"
        },
        {
          title: "Today's Revenue",
          value: `KSh ${(stats.todayRevenue || 0).toLocaleString()}`,
          icon: <FaChartBar className="text-2xl" />,
          color: "blue",
          trend: "Sales total",
          description: "From transactions"
        },
        {
          title: "New Sale",
          value: "Start",
          icon: <FaShoppingCart className="text-2xl" />,
          color: "orange",
          trend: "",
          description: "Process transaction",
          action: () => navigate('/dashboard/sales?new=true')
        },
        {
          title: "Product Lookup",
          value: "Search",
          icon: <FaBoxOpen className="text-2xl" />,
          color: "purple",
          trend: "",
          description: "Find products",
          action: () => navigate('/dashboard/products')
        }
      ],
      // NEW: Errand runner stats cards
      errand: [
        {
          title: "Available Errands",
          value: stats.pendingErrands?.toLocaleString() || '0',
          icon: <FaMotorcycle className="text-2xl" />,
          color: "blue",
          trend: stats.pendingErrands > 0 ? `${stats.pendingErrands} available` : "None",
          description: "Errands waiting to be accepted",
          action: () => navigate('/errands/available'),
          priority: stats.pendingErrands > 0
        },
        {
          title: "In Progress",
          value: stats.inProgressErrands?.toLocaleString() || '0',
          icon: <FaClock className="text-2xl" />,
          color: "orange",
          trend: stats.inProgressErrands > 0 ? "Active" : "None",
          description: "Errands you're working on",
          action: () => navigate('/errands/active'),
          priority: stats.inProgressErrands > 0
        },
        {
          title: "Pending Approval",
          value: stats.submittedErrands?.toLocaleString() || '0',
          icon: <FaClipboardCheck className="text-2xl" />,
          color: "purple",
          trend: stats.submittedErrands > 0 ? "Awaiting review" : "None",
          description: "Submitted for approval",
          action: () => navigate('/errands/submitted')
        },
        {
          title: "Rejected",
          value: stats.rejectedErrands?.toLocaleString() || '0',
          icon: <FaTimesCircle className="text-2xl" />,
          color: "red",
          trend: stats.rejectedErrands > 0 ? "Needs attention" : "All clear",
          description: "Errands needing revision",
          action: () => navigate('/errands/rejected'),
          priority: stats.rejectedErrands > 0
        },
        {
          title: "Completed",
          value: stats.completedErrands?.toLocaleString() || '0',
          icon: <FaCheckCircle className="text-2xl" />,
          color: "green",
          trend: "Done",
          description: "Successfully completed",
          action: () => navigate('/errands/completed')
        },
        {
          title: "Total Earnings",
          value: `KSh ${(stats.totalEarnings || 0).toLocaleString()}`,
          icon: <FaChartBar className="text-2xl" />,
          color: "green",
          trend: stats.completedErrands > 0 ? "Paid" : "No earnings",
          description: "From completed errands",
          action: () => navigate('/errands/earnings')
        }
      ]
    };

    return roleCards[user?.role] || [];
  };

  const getQuickActions = () => {
    if (!user) return [];

    const actions = {
      admin: [
        { 
          label: 'Manage Staff', 
          icon: <FaUsers />, 
          path: '/dashboard/staff',
          description: 'Add/remove staff members'
        },
        { 
          label: 'Review Batches', 
          icon: <FaClipboardCheck />, 
          path: '/inventory/approval',
          description: 'Approve inventory'
        },
        { 
          label: 'System Reports', 
          icon: <FaChartBar />, 
          path: '/dashboard/reports',
          description: 'View analytics'
        }
      ],
      manager: [
        { 
          label: 'Review Batches', 
          icon: <FaClipboardCheck />, 
          path: '/inventory/approval',
          description: 'Approve inventory batches'
        },
        { 
          label: 'Manage Staff', 
          icon: <FaUsers />, 
          path: '/dashboard/staff',
          description: 'View/update staff'
        },
        { 
          label: 'Sales Reports', 
          icon: <FaChartBar />, 
          path: '/dashboard/reports',
          description: 'View sales analytics'
        }
      ],
      senior: [
        { 
          label: 'Approve Batches', 
          icon: <FaClipboardCheck />, 
          path: '/inventory/approval',
          description: 'Review pending batches',
          priority: true
        },
        { 
          label: 'View Inventory', 
          icon: <FaWarehouse />, 
          path: '/inventory',
          description: 'Check stock levels'
        },
        { 
          label: 'Transactions', 
          icon: <FaFileAlt />, 
          path: '/inventory/transactions',
          description: 'View activity log'
        }
      ],
      receiver: [
        { 
          label: 'Create Batch', 
          icon: <FaTruck />, 
          path: '/inventory/receiving?new=true',
          description: 'Receive new inventory',
          priority: true
        },
        { 
          label: 'My Batches', 
          icon: <FaBoxOpen />, 
          path: '/inventory/receiving',
          description: 'View your batches'
        },
        { 
          label: 'Rejected Batches', 
          icon: <FaExclamationTriangle />, 
          path: '/inventory/rejected-batches',
          description: 'View rejected batches',
          priority: stats.rejectedCount > 0
        }
      ],
      cashier: [
        { 
          label: 'New Sale', 
          icon: <FaCashRegister />, 
          path: '/dashboard/sales?new=true',
          description: 'Process transaction',
          priority: true
        },
        { 
          label: 'View Products', 
          icon: <FaBoxOpen />, 
          path: '/dashboard/products',
          description: 'Browse inventory'
        },
        { 
          label: 'Customers', 
          icon: <FaUserFriends />, 
          path: '/dashboard/customers',
          description: 'Manage customers'
        }
      ],
      // NEW: Errand runner quick actions
      errand: [
        { 
          label: 'Available Errands', 
          icon: <FaMotorcycle />, 
          path: '/errands/available',
          description: 'View and accept new errands',
          priority: stats.pendingErrands > 0
        },
        { 
          label: 'My Active Errands', 
          icon: <FaClock />, 
          path: '/errands/active',
          description: 'Continue working on errands',
          priority: stats.inProgressErrands > 0
        },
        { 
          label: 'Submit Proof', 
          icon: <FaCamera />, 
          path: '/errands/submit',
          description: 'Upload photos and receipts',
          priority: stats.submittedErrands === 0 && stats.inProgressErrands > 0
        },
        { 
          label: 'Rejected', 
          icon: <FaTimesCircle />, 
          path: '/errands/rejected',
          description: 'Fix and resubmit',
          priority: stats.rejectedErrands > 0
        },
        { 
          label: 'My Earnings', 
          icon: <FaChartBar />, 
          path: '/errands/earnings',
          description: `KSh ${(stats.totalEarnings || 0).toLocaleString()} total`
        }
      ]
    };

    return actions[user.role] || [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statsCards = getStatsCards();
  const quickActions = getQuickActions();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{getDashboardTitle()}</h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {user?.full_name || user?.username}! {getWelcomeMessage()}
        </p>
        
        {/* Role Badge */}
        {user?.role && (
          <span className={`inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full ${
            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
            user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
            user.role === 'senior' ? 'bg-orange-100 text-orange-800' :
            user.role === 'receiver' ? 'bg-green-100 text-green-800' :
            user.role === 'cashier' ? 'bg-emerald-100 text-emerald-800' :
            user.role === 'errand' ? 'bg-yellow-100 text-yellow-800' : // NEW
            'bg-gray-100 text-gray-800'
          }`}>
            {user.role === 'errand' ? 'Errand Runner' : (user.role?.charAt(0).toUpperCase() + user.role?.slice(1))}
          </span>
        )}
      </div>

      {/* Stats Grid */}
      {statsCards.length > 0 && (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${statsCards.length === 6 ? '3' : '4'} gap-6`}>
          {statsCards.map((card, index) => (
            <StatsCard
              key={index}
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              trend={card.trend}
              description={card.description}
              onClick={card.action}
            />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className={`p-4 border rounded-lg text-left hover:bg-gray-50 transition-colors ${
                  action.priority ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className={`p-2 rounded-lg ${
                    action.priority ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {action.icon}
                  </span>
                  <h3 className="font-medium text-gray-900">{action.label}</h3>
                </div>
                <p className="text-sm text-gray-500">{action.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Section - Only show for non-errand roles */}
      {user?.role !== 'errand' && (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <button 
              onClick={() => window.location.reload()}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Recent Products */}
            {stats.products && stats.products.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-2">Recently Added Products</h3>
                <div className="space-y-2">
                  {stats.products.slice(0, 3).map((product, index) => (
                    <div key={product.id || index} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{product.name || `Product ${index + 1}`}</p>
                        <p className="text-sm text-gray-500">SKU: {product.sku || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">KSh {parseFloat(product.price || 0).toLocaleString()}</p>
                        <p className={`text-sm ${(product.stock_quantity || 0) <= (product.min_stock_level || 10) ? 'text-red-600' : 'text-green-600'}`}>
                          Stock: {product.stock_quantity || 0}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Today's Sales for Cashiers/Managers */}
            {(user?.role === 'cashier' || user?.role === 'manager') && stats.todaySales && stats.todaySales.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-2">Today's Sales</h3>
                <div className="space-y-2">
                  {stats.todaySales.slice(0, 3).map((sale, index) => (
                    <div key={sale.id || index} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">Sale #{sale.id || index + 1}</p>
                        <p className="text-sm text-gray-500">{sale.customer_name || 'Walk-in customer'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">KSh {parseFloat(sale.total_amount || 0).toLocaleString()}</p>
                        <p className="text-sm text-gray-500">
                          {sale.created_at ? new Date(sale.created_at).toLocaleTimeString() : 'Today'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Batches for Senior/Manager */}
            {(user?.role === 'senior' || user?.role === 'manager' || user?.role === 'admin') && stats.pendingBatches > 0 && (
              <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaExclamationTriangle className="text-yellow-600" />
                  <h3 className="font-medium text-yellow-800">Action Required</h3>
                </div>
                <p className="text-yellow-700">
                  You have {stats.pendingBatches} batch{stats.pendingBatches !== 1 ? 'es' : ''} pending review.
                </p>
                <button
                  onClick={() => navigate('/inventory/approval')}
                  className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                >
                  Review Now
                </button>
              </div>
            )}

            {/* Empty State */}
            {(!stats.products || stats.products.length === 0) && 
             (!stats.todaySales || stats.todaySales.length === 0) && 
             stats.pendingBatches === 0 && (
              <div className="border rounded-lg p-8 text-center">
                <FaChartBar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">No Recent Activity</h3>
                <p className="text-gray-500 mb-4">Start by creating your first batch or making a sale</p>
                <button
                  onClick={() => navigate(user?.role === 'receiver' ? '/inventory/receiving?new=true' : '/dashboard/products')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;