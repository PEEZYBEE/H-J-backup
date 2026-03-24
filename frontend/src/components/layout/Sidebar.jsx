import React, { useState } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { 
  FaHome, 
  FaShoppingCart, 
  FaBoxOpen, 
  FaChartBar, 
  FaCog, 
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaCashRegister,
  FaUsers,
  FaUserFriends,
  FaWarehouse,
  FaUserCog,
  FaBell,
  FaDollarSign,
  FaFileAlt,
  FaLayerGroup,
  FaShoppingBag,
  FaTruck,
  FaClipboardCheck,
  FaBarcode,
  FaTags,
  FaMotorcycle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaCamera,
  FaExclamationTriangle,
  FaPlusCircle,
  FaListAlt,
  FaHistory,
  FaUserTie
} from 'react-icons/fa';

const Sidebar = () => {
  // Sidebar open state handling: pinned (manual), hovered (auto), mobile overlay
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const open = isPinned || isHovered || mobileOpen;
  const navigate = useNavigate();
  const location = useLocation();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role || 'customer';

  // Role-based navigation items
  const getNavItems = () => {
    const baseItems = [
      { 
        id: 'dashboard', 
        label: 'Dashboard', 
        icon: <FaHome />, 
        path: '/dashboard',
        roles: ['customer', 'cashier', 'manager', 'admin', 'receiver', 'senior', 'errand']
      },
      { 
        id: 'orders',
        label: 'Orders', 
        icon: <FaShoppingBag />, 
        path: '/dashboard/orders',
        roles: ['cashier', 'manager', 'admin', 'senior']
      },
      { 
        id: 'products', 
        label: 'Products', 
        icon: <FaBoxOpen />, 
        path: '/dashboard/products',
        roles: ['customer', 'cashier', 'manager', 'admin', 'receiver', 'senior']
      },
    ];

    // ============ ERRAND SYSTEM LINKS ============
    
    // For Errand Runners
    if (userRole === 'errand') {
      baseItems.push(
        { 
          id: 'errand-dashboard', 
          label: 'Errand Dashboard', 
          icon: <FaMotorcycle />, 
          path: '/errands',
          roles: ['errand']
        },
        { 
          id: 'my-errands',
          label: 'My Errands', 
          icon: <FaListAlt />, 
          path: '/errands/my',
          roles: ['errand']
        },
        { 
          id: 'errand-available', 
          label: 'Available Errands', 
          icon: <FaClock />, 
          path: '/errands?tab=available',
          roles: ['errand']
        },
        { 
          id: 'errand-active', 
          label: 'In Progress', 
          icon: <FaCamera />, 
          path: '/errands?tab=inprogress',
          roles: ['errand']
        },
        { 
          id: 'errand-pending-runner', 
          label: 'Pending Approval', 
          icon: <FaClipboardCheck />, 
          path: '/errands?tab=pending',
          roles: ['errand']
        },
        { 
          id: 'errand-rejected', 
          label: 'Rejected', 
          icon: <FaTimesCircle />, 
          path: '/errands?tab=rejected',
          roles: ['errand']
        },
        { 
          id: 'errand-history', 
          label: 'History', 
          icon: <FaHistory />, 
          path: '/errands?tab=history',
          roles: ['errand']
        },
        { 
          id: 'create-runner-errand', 
          label: 'Create Errand', 
          icon: <FaPlusCircle />, 
          path: '/errands/create-runner',
          roles: ['errand']
        }
      );
    }

    // For Admin/Manager/Senior to manage errands
    if (userRole === 'admin' || userRole === 'manager' || userRole === 'senior') {
      baseItems.push(
        { 
          id: 'create-errand', 
          label: 'Create Errand', 
          icon: <FaPlusCircle />, 
          path: '/errands/create',
          roles: ['admin', 'manager', 'senior']
        },
        { 
          id: 'errand-management', 
          label: 'Errand Management', 
          icon: <FaMotorcycle />, 
          path: '/errands',
          roles: ['admin', 'manager', 'senior']
        },
        { 
          id: 'runner-performance',
          label: 'Runner Performance', 
          icon: <FaChartBar />,
          path: '/errands/runner-performance',
          roles: ['admin', 'manager', 'senior']
        },
        { 
          id: 'errand-pending', 
          label: 'Pending Approvals', 
          icon: <FaClipboardCheck />, 
          path: '/errands?tab=pending',
          roles: ['admin', 'senior', 'manager']
        },
        { 
          id: 'errand-rejected-admin', 
          label: 'Rejected Errands', 
          icon: <FaTimesCircle />, 
          path: '/errands?tab=rejected',
          roles: ['admin', 'senior', 'manager']
        },
        { 
          id: 'delivery-agents', 
          label: 'Delivery Agents', 
          icon: <FaTruck />, 
          path: '/settings/delivery-agents',
          roles: ['admin', 'manager']
        }
      );
    }

    // ============ INVENTORY RECEIVING SYSTEM LINKS ============
    
    // For Receiving Employees
    if (userRole === 'receiver' || userRole === 'admin' || userRole === 'manager') {
      baseItems.push(
        { 
          id: 'batch-receiving', 
          label: 'Batch Receiving', 
          icon: <FaTruck />, 
          path: '/inventory/receiving',
          roles: ['receiver', 'admin', 'manager']
        },
        { 
          id: 'rejected-batches', 
          label: 'Rejected Batches', 
          icon: <FaTimesCircle />, 
          path: '/inventory/rejected-batches',
          roles: ['receiver', 'admin', 'manager']
        }
      );
    }

    // For Senior Staff (Approval)
    if (userRole === 'senior' || userRole === 'admin' || userRole === 'manager') {
      baseItems.push(
        { 
          id: 'batch-approval', 
          label: 'Batch Approval', 
          icon: <FaClipboardCheck />, 
          path: '/inventory/approval',
          roles: ['senior', 'admin', 'manager']
        }
      );
    }

    // Inventory Management (for managers/admins)
    if (userRole === 'manager' || userRole === 'admin' || userRole === 'senior') {
      baseItems.push(
        { 
          id: 'inventory', 
          label: 'Inventory', 
          icon: <FaWarehouse />, 
          path: '/inventory',
          roles: ['manager', 'admin', 'senior']
        },
        { 
          id: 'inventory-transactions', 
          label: 'Transactions', 
          icon: <FaFileAlt />, 
          path: '/inventory/transactions',
          roles: ['manager', 'admin', 'senior']
        }
      );
    }

    // ============ EXISTING SALES & MANAGEMENT LINKS ============
    
    if (userRole === 'cashier' || userRole === 'manager' || userRole === 'admin' || userRole === 'senior') {
      baseItems.push(
        { 
          id: 'sales', 
          label: 'Sales', 
          icon: <FaCashRegister />, 
          path: '/dashboard/sales',
          roles: ['cashier', 'manager', 'admin', 'senior']
        },
        { 
          id: 'customers', 
          label: 'Customers', 
          icon: <FaUsers />, 
          path: '/dashboard/customers',
          roles: ['cashier', 'manager', 'admin', 'senior']
        }
      );
    }

    if (userRole === 'manager' || userRole === 'admin') {
      baseItems.push(
        { 
          id: 'reports', 
          label: 'Reports', 
          icon: <FaChartBar />, 
          path: '/dashboard/reports',
          roles: ['manager', 'admin']
        },
        { 
          id: 'staff', 
          label: 'Staff', 
          icon: <FaUserFriends />, 
          path: '/dashboard/staff',
          roles: ['manager', 'admin']
        }
      );
    }

    if (userRole === 'admin') {
      baseItems.push(
        { 
          id: 'system', 
          label: 'System', 
          icon: <FaUserCog />, 
          path: '/dashboard/system',
          roles: ['admin']
        },
        { 
          id: 'analytics', 
          label: 'Analytics', 
          icon: <FaLayerGroup />, 
          path: '/dashboard/analytics',
          roles: ['admin']
        }
      );
    }

    // Settings available for all roles
    baseItems.push(
      { 
        id: 'settings', 
        label: 'Settings', 
        icon: <FaCog />, 
        path: '/dashboard/settings',
        roles: ['customer', 'cashier', 'manager', 'admin', 'receiver', 'senior', 'errand']
      }
    );

    return baseItems.filter(item => item.roles.includes(userRole));
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const getUserInitial = () => {
    return user.full_name?.charAt(0) || user.username?.charAt(0) || 'U';
  };

  const getUserName = () => {
    return user.full_name || user.username || 'User';
  };

  const getUserRoleBadge = () => {
    const roles = {
      admin: { label: 'Admin', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
      manager: { label: 'Manager', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
      senior: { label: 'Senior Staff', color: 'bg-gradient-to-r from-orange-500 to-red-500' },
      receiver: { label: 'Receiver', color: 'bg-gradient-to-r from-green-500 to-emerald-500' },
      cashier: { label: 'Cashier', color: 'bg-gradient-to-r from-green-500 to-emerald-500' },
      errand: { label: 'Errand Runner', color: 'bg-gradient-to-r from-yellow-500 to-amber-500' },
      customer: { label: 'Customer', color: 'bg-gradient-to-r from-gray-600 to-gray-800' }
    };
    return roles[userRole] || roles.customer;
  };

  const roleBadge = getUserRoleBadge();

  // Group items by category for better organization
  const getItemsByCategory = () => {
    const mainNav = navItems.filter(item => 
      !['batch-receiving', 'batch-approval', 'inventory', 'inventory-transactions', 
        'rejected-batches', 'errand-dashboard', 'errand-available', 'errand-active', 
        'errand-rejected', 'errand-management', 'errand-pending', 'errand-pending-runner',
        'errand-rejected-admin', 'delivery-agents', 'create-errand', 'create-runner-errand',
        'my-errands', 'errand-history', 'runner-performance'].includes(item.id)
    );

    const inventoryNav = navItems.filter(item => 
      ['batch-receiving', 'batch-approval', 'inventory', 'inventory-transactions', 
       'rejected-batches'].includes(item.id)
    );

    const errandNav = navItems.filter(item => 
      ['errand-dashboard', 'my-errands', 'errand-available', 'errand-active', 
       'errand-pending-runner', 'errand-rejected', 'errand-history',
       'errand-management', 'errand-pending', 'errand-rejected-admin',
       'delivery-agents', 'create-errand', 'create-runner-errand',
       'runner-performance'].includes(item.id)
    );

    return { mainNav, inventoryNav, errandNav };
  };

  const { mainNav, inventoryNav, errandNav } = getItemsByCategory();

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && window.innerWidth < 768 && (
        <div 
          className="hnj-sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Toggle Button */}
      <button
        className="hnj-sidebar-toggle-mobile"
        onClick={() => setMobileOpen(prev => !prev)}
        aria-label={mobileOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {mobileOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Glassmorphic Sidebar */}
      <aside
        className={`hnj-sidebar ${open ? 'open' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="hnj-sidebar-inner">
          
          {/* Header */}
          <header className="hnj-sidebar-header">
            <button
              className="hnj-sidebar-toggle"
              onClick={() => setIsPinned(prev => !prev)}
              aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {open ? <FaTimes /> : <FaBars />}
            </button>
            
            {open && (
              <div className="hnj-sidebar-logo">
                <div className="hnj-logo-icon">H&J</div>
                <div>
                  <h2>H&J Store</h2>
                  <span className="hnj-store-badge">Management System</span>
                </div>
              </div>
            )}
          </header>

          {/* User Info */}
          {open && (
            <div className="hnj-user-info">
              <div className="hnj-user-avatar">
                {getUserInitial()}
              </div>
              <div className="hnj-user-details">
                <p className="hnj-user-name">{getUserName()}</p>
                <span className={`hnj-user-role ${roleBadge.color}`}>
                  {roleBadge.label}
                </span>
                <div className="hnj-user-status">
                  <span className="hnj-status-dot"></span>
                  <span>Online</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="hnj-sidebar-nav">
            
            {/* Main Navigation */}
            <div className="hnj-nav-section">
              {mainNav.map((item, index) => (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={({ isActive }) => `
                    hnj-nav-item
                    ${isActive ? 'active' : ''}
                  `}
                  onClick={() => window.innerWidth < 768 && setMobileOpen(false)}
                  style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                >
                  <span className="hnj-nav-icon">{item.icon}</span>
                  {open && <span className="hnj-nav-label">{item.label}</span>}
                  
                  {/* Tooltip for collapsed state */}
                  {!open && (
                    <div className="hnj-nav-tooltip">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Errand System Section */}
            {errandNav.length > 0 && open && (
              <div className="hnj-nav-separator">
                <span>Errand System</span>
              </div>
            )}

            {/* Errand Navigation */}
            {errandNav.length > 0 && (
              <div className="hnj-nav-section">
                {errandNav.map((item, index) => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) => `
                      hnj-nav-item
                      ${isActive ? 'active' : ''}
                      ${item.id.includes('errand') ? 'hnj-nav-errand' : ''}
                      ${item.id.includes('pending') ? 'hnj-nav-pending' : ''}
                      ${item.id.includes('rejected') ? 'hnj-nav-rejected' : ''}
                      ${item.id === 'create-errand' || item.id === 'create-runner-errand' ? 'hnj-nav-create' : ''}
                      ${item.id === 'my-errands' ? 'hnj-nav-my-errands' : ''}
                      ${item.id === 'errand-history' ? 'hnj-nav-history' : ''}
                      ${item.id === 'runner-performance' ? 'hnj-nav-performance' : ''}
                    `}
                    onClick={() => window.innerWidth < 768 && setMobileOpen(false)}
                    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  >
                    <span className="hnj-nav-icon">{item.icon}</span>
                    {open && <span className="hnj-nav-label">{item.label}</span>}
                    
                    {/* Tooltip for collapsed state */}
                    {!open && (
                      <div className="hnj-nav-tooltip">
                        {item.label}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            )}

            {/* Inventory Section */}
            {inventoryNav.length > 0 && open && (
              <div className="hnj-nav-separator">
                <span>Inventory System</span>
              </div>
            )}

            {/* Inventory Navigation */}
            {inventoryNav.length > 0 && (
              <div className="hnj-nav-section">
                {inventoryNav.map((item, index) => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) => `
                      hnj-nav-item
                      ${isActive ? 'active' : ''}
                      ${item.id === 'batch-receiving' ? 'hnj-nav-receiving' : ''}
                      ${item.id === 'batch-approval' ? 'hnj-nav-approval' : ''}
                      ${item.id === 'rejected-batches' ? 'hnj-nav-rejected' : ''}
                    `}
                    onClick={() => window.innerWidth < 768 && setMobileOpen(false)}
                    style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                  >
                    <span className="hnj-nav-icon">{item.icon}</span>
                    {open && <span className="hnj-nav-label">{item.label}</span>}
                    
                    {/* Tooltip for collapsed state */}
                    {!open && (
                      <div className="hnj-nav-tooltip">
                        {item.label}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </nav>

          {/* Footer */}
          <footer className="hnj-sidebar-footer">
            <button
              onClick={handleLogout}
              className="hnj-nav-item hnj-logout-btn"
            >
              <span className="hnj-nav-icon">
                <FaSignOutAlt />
              </span>
              {open && <span className="hnj-nav-label">Logout</span>}
              
              {!open && (
                <div className="hnj-nav-tooltip">
                  Logout
                </div>
              )}
            </button>

            {open && (
              <div className="hnj-sidebar-footer-info">
                <p className="hnj-version">v1.2.0</p>
                <p className="hnj-copyright">© {new Date().getFullYear()} H&J Store</p>
              </div>
            )}
          </footer>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;