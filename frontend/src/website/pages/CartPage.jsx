// src/website/pages/CartPage.jsx - FIXED with safe price handling
import React, { useState, useEffect } from 'react';
import { FaTrash, FaShoppingCart, FaArrowLeft, FaCreditCard } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

// Local placeholder data URI (no external dependencies)
const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\' viewBox=\'0 0 80 80\'%3E%3Crect width=\'80\' height=\'80\' fill=\'%23f0f0f0\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'Arial\' font-size=\'12\' fill=\'%23999\'%3ENo Image%3C/text%3E%3C/svg%3E';

const CartPage = () => {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getUniqueItems, getTotalItems } = useCart();

  // Helper function to safely get the best price for an item
  const getItemPrice = (item) => {
    // Check for offer price first (if item is on offer)
    if (item.is_on_offer && item.offer_price) {
      return parseFloat(item.offer_price) || 0;
    }
    // Then check for selling_price (new field)
    if (item.selling_price) {
      return parseFloat(item.selling_price) || 0;
    }
    // Then check for price (old field)
    if (item.price) {
      return parseFloat(item.price) || 0;
    }
    // If all else fails, return 0
    return 0;
  };

  // Helper function to get original/regular price for display
  const getRegularPrice = (item) => {
    if (item.selling_price) {
      return parseFloat(item.selling_price) || 0;
    }
    if (item.price) {
      return parseFloat(item.price) || 0;
    }
    return 0;
  };

  // Helper function to safely format currency
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

  // Calculate product total safely
  const calculateProductTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = getItemPrice(item);
      const quantity = item.quantity || 1;
      return total + (price * quantity);
    }, 0);
  };

  const handleQuantityChange = (productId, change) => {
    const item = cartItems.find(item => item.id === productId);
    if (item) {
      const newQuantity = item.quantity + change;
      if (newQuantity > 0) {
        updateQuantity(productId, newQuantity);
      } else {
        removeFromCart(productId);
      }
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Shopping Cart</h1>
          
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-6">
              <FaShoppingCart className="text-6xl text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
              <p className="text-gray-500 mb-6">Looks like you haven't added any items to your cart yet.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                <FaArrowLeft /> Continue Shopping
              </Link>
              
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const uniqueItemCount = getUniqueItems();
  const productTotal = calculateProductTotal();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Simple header with item count */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Shopping Cart</h1>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Items in cart:</span>
            <span className="text-2xl font-bold text-red-600">{uniqueItemCount}</span>
          </div>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Cart Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b bg-gray-50">
                <div className="col-span-5 font-semibold text-gray-700">Product</div>
                <div className="col-span-2 font-semibold text-gray-700 text-center">Price</div>
                <div className="col-span-3 font-semibold text-gray-700 text-center">Quantity</div>
                <div className="col-span-2 font-semibold text-gray-700 text-center">Total</div>
              </div>
              
              {/* Cart Items List */}
              {cartItems.map(item => {
                const price = getItemPrice(item);
                const regularPrice = getRegularPrice(item);
                const itemTotal = price * (item.quantity || 1);
                
                return (
                  <div key={item.id} className="p-4 border-b hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Product Image and Info */}
                      <div className="md:w-5/12 flex items-center gap-4">
                        <div className="w-20 h-20 flex-shrink-0">
                          {item.image_urls && item.image_urls.length > 0 ? (
                            <img 
                              // FIXED: Changed from localhost to relative URL
                              src={`/api/uploads/products/${item.image_urls[0]?.split('/').pop()}`}
                              alt={item.name}
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = PLACEHOLDER_IMAGE;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded">
                              <span className="text-gray-400 text-xs">No Image</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 hover:text-red-600">
                            <Link to={`/product/${item.id}`}>{item.name}</Link>
                          </h3>
                          {item.description && (
                            <p className="text-gray-500 text-sm mt-1 line-clamp-1">{item.description}</p>
                          )}
                          
                          {/* Stock Status */}
                          <div className={`inline-flex items-center gap-1 mt-2 text-xs px-2 py-1 rounded-full ${
                            item.stock_quantity === 0 
                              ? 'bg-red-100 text-red-800' 
                              : item.stock_quantity <= 10 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {item.stock_quantity === 0 
                              ? 'Out of Stock' 
                              : item.stock_quantity <= 10 
                              ? `Only ${item.stock_quantity} left` 
                              : 'In Stock'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Price - FIXED with safe formatting */}
                      <div className="md:w-2/12">
                        <div className="md:hidden text-sm text-gray-500 mb-1">Price:</div>
                        <div className="text-right md:text-center">
                          <div className="font-semibold text-red-600">
                            KSh {formatCurrency(price)}
                          </div>
                          {item.is_on_offer && regularPrice > price && (
                            <div className="text-gray-400 text-sm line-through">
                              KSh {formatCurrency(regularPrice)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Quantity with vertical buttons */}
                      <div className="md:w-3/12">
                        <div className="md:hidden text-sm text-gray-500 mb-1">Quantity:</div>
                        <div className="flex items-center justify-center">
                          <div className="flex flex-col items-center border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                            <button
                              onClick={() => handleQuantityChange(item.id, 1)}
                              className="w-12 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed border-b border-gray-300 transition-colors"
                              disabled={item.quantity >= item.stock_quantity}
                              title="Increase quantity"
                            >
                              <span className="text-xl font-bold text-gray-700">+</span>
                            </button>
                            
                            <div className="w-12 h-12 flex items-center justify-center bg-white">
                              <span className="font-bold text-xl text-red-600">
                                {item.quantity}
                              </span>
                            </div>
                            
                            <button
                              onClick={() => handleQuantityChange(item.id, -1)}
                              className="w-12 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed border-t border-gray-300 transition-colors"
                              disabled={item.quantity <= 1}
                              title="Decrease quantity"
                            >
                              <span className="text-xl font-bold text-gray-700">−</span>
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 text-center mt-2">
                          Stock: {item.stock_quantity} available
                        </div>
                      </div>
                      
                      {/* Total - FIXED with safe formatting */}
                      <div className="md:w-2/12">
                        <div className="md:hidden text-sm text-gray-500 mb-1">Total:</div>
                        <div className="flex items-center justify-between md:justify-center">
                          <div className="font-bold text-gray-800">
                            KSh {formatCurrency(itemTotal)}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-500 hover:text-red-700 md:ml-4"
                            title="Remove item"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Cart Footer Actions */}
              <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 text-red-600 hover:text-red-800"
                >
                  <FaArrowLeft /> Continue Shopping
                </Link>
                
                <button
                  onClick={clearCart}
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800"
                >
                  <FaTrash /> Clear Cart
                </button>
              </div>
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b">Order Summary</h2>
              
              {/* Product Total Only */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items ({getTotalItems()})</span>
                  <span className="font-semibold text-gray-900">KSh {formatCurrency(productTotal)}</span>
                </div>
                
                
              </div>
              
              {/* Total (Products Only) */}
              <div className="py-4 border-t border-b">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-red-600">
                    KSh {formatCurrency(productTotal)}
                  </span>
                </div>
                
              </div>
              
              <div className="mt-6">
                <Link
                  to="/checkout"
                  className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 ${
                    cartItems.some(item => item.stock_quantity === 0)
                      ? 'bg-gray-400 cursor-not-allowed pointer-events-none'
                      : 'bg-gray-900 hover:bg-black'
                  }`}
                >
                  <FaCreditCard /> Proceed to Checkout
                </Link>
                
                {cartItems.some(item => item.stock_quantity === 0) && (
                  <p className="text-red-500 text-sm mt-2 text-center">
                    Please remove out-of-stock items before checkout
                  </p>
                )}
                
                <p className="text-gray-500 text-sm mt-4 text-center">
                  You'll see shipping costs at checkout
                </p>
              </div>
              
              {/* Payment Methods */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-3">We Accept</h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-700">MPESA</span>
                  </div>
                  <div className="w-12 h-8 bg-blue-50 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-700">VISA</span>
                  </div>
                  <div className="w-12 h-8 bg-yellow-50 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-yellow-700">M-CARD</span>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Need to Know</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Prices include any applicable discounts</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Shipping paid separately to delivery agent</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recommended Products (Optional) */}
        <RecommendedSuggestions
          cartItems={cartItems}
          getItemPrice={getItemPrice}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  );
};

export default CartPage;

// Small helper subcomponent to fetch and render suggestions
const RecommendedSuggestions = ({ cartItems, getItemPrice, formatCurrency }) => {
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        if (!cartItems || cartItems.length === 0) {
          setSuggestedProducts([]);
          return;
        }

        setLoading(true);

        const subcategoryIds = Array.from(new Set(cartItems
          .map(i => i.subcategory_id || i.subcategoryId || (i.subcategory && i.subcategory.id))
          .filter(Boolean)
        ));

        const categoryIds = Array.from(new Set(cartItems
          .map(i => i.category_id || i.categoryId || (i.category && i.category.id))
          .filter(Boolean)
        ));

        if (subcategoryIds.length === 0 && categoryIds.length === 0) {
          setSuggestedProducts([]);
          return;
        }

        const { getSubcategoryProducts, getProductsByCategory } = await import('../../services/api');

        const cartIds = new Set(cartItems.map(i => Number(i.id)));
        const seen = new Set();
        const results = [];

        // Try subcategories first
        for (const subId of subcategoryIds) {
          try {
            const data = await getSubcategoryProducts(subId);
            const products = Array.isArray(data) ? data : (data.products || data.data || []);
            for (const p of products) {
              if (results.length >= 8) break;
              if (!p || cartIds.has(Number(p.id))) continue;
              if (seen.has(Number(p.id))) continue;
              seen.add(Number(p.id));
              results.push(p);
            }
            if (results.length >= 8) break;
          } catch (err) {
            console.warn('Subcategory fetch failed', subId, err);
          }
        }

        // Fallback to categories
        if (results.length < 8) {
          for (const catId of categoryIds) {
            try {
              const data = await getProductsByCategory(catId);
              const products = Array.isArray(data) ? data : (data.products || data.data || []);
              for (const p of products) {
                if (results.length >= 8) break;
                if (!p || cartIds.has(Number(p.id))) continue;
                if (seen.has(Number(p.id))) continue;
                seen.add(Number(p.id));
                results.push(p);
              }
              if (results.length >= 8) break;
            } catch (err) {
              console.warn('Category fetch failed', catId, err);
            }
          }
        }

        setSuggestedProducts(results.slice(0, 4));
      } catch (err) {
        console.error('Failed to fetch suggestions', err);
        setSuggestedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [cartItems]);

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">You might also like</h2>

      {loading ? (
        <div className="text-center text-gray-500">Loading suggestions...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {suggestedProducts && suggestedProducts.length > 0 ? (
            suggestedProducts.map(p => (
              <a
                href={`/product/${p.id}`}
                key={p.id}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow flex flex-col items-center text-center"
              >
                <div className="w-full h-32 mb-3 overflow-hidden rounded">
                  {p.image_urls && p.image_urls[0] ? (
                    // relative URL
                    <img
                      src={`/api/uploads/products/${p.image_urls[0].split('/').pop()}`}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\' viewBox=\'0 0 80 80\'%3E%3Crect width=\'80\' height=\'80\' fill=\'%23f0f0f0\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'Arial\' font-size=\'12\' fill=\'%23999\'%3ENo Image%3C/text%3E%3C/svg%3E'; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400">No Image</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 w-full">
                  <p className="font-medium text-gray-900 line-clamp-2">{p.name}</p>
                  <p className="text-sm text-gray-600 mt-2">KSh {formatCurrency(getItemPrice(p))}</p>
                </div>
              </a>
            ))
          ) : (
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <p className="text-gray-500">Suggested products will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};