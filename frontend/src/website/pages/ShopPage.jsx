// src/website/pages/ShopPage.jsx - FIXED with relative URLs and safe price handling
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FaSearch, FaFilter, FaShoppingCart, 
  FaStar, FaStarHalfAlt, FaBox, FaTag, FaLayerGroup
} from 'react-icons/fa';
import { useCart } from '../context/CartContext';

// Local placeholder data URI (no external dependencies)
const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'200\' viewBox=\'0 0 300 200\'%3E%3Crect width=\'300\' height=\'200\' fill=\'%23f0f0f0\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-family=\'Arial\' font-size=\'18\' fill=\'%23999\'%3ENo Image%3C/text%3E%3C/svg%3E';

const ShopPage = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  // ============ HELPER FUNCTIONS FOR SAFE PRICE HANDLING ============
  
  const getProductPrice = (product) => {
    if (!product) return 0;
    // Check for offer price first
    if (product.is_on_offer && product.offer_price) {
      return parseFloat(product.offer_price) || 0;
    }
    // Then check for selling_price (new field)
    if (product.selling_price) {
      return parseFloat(product.selling_price) || 0;
    }
    // Then check for price (old field)
    if (product.price) {
      return parseFloat(product.price) || 0;
    }
    return 0;
  };

  const getRegularPrice = (product) => {
    if (!product) return 0;
    // Get the regular price (not offer price)
    if (product.selling_price) {
      return parseFloat(product.selling_price) || 0;
    }
    if (product.price) {
      return parseFloat(product.price) || 0;
    }
    return 0;
  };

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

  const calculateSavings = (product) => {
    if (!product || !product.is_on_offer) return 0;
    const regular = getRegularPrice(product);
    const current = getProductPrice(product);
    return Math.max(0, regular - current);
  };

  const hasOffer = (product) => {
    return product.is_on_offer && getProductPrice(product) < getRegularPrice(product);
  };

  const getProductCategoryId = (product) => {
    if (!product) return null;
    if (product.category_id !== undefined && product.category_id !== null) {
      return Number(product.category_id);
    }
    if (product.category?.id !== undefined && product.category?.id !== null) {
      return Number(product.category.id);
    }
    return null;
  };

  // Get URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get('search');
    const category = params.get('category');
    
    if (search) setSearchQuery(search);
    if (category) setSelectedCategory(category);
  }, [location]);

  // Fetch products and categories - FIXED: using relative URLs
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Apply filters whenever dependencies change
  useEffect(() => {
    applyFilters();
  }, [products, searchQuery, selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // FIXED: using relative URL
      const response = await fetch('/api/products/products?limit=100');
      const data = await response.json();
      const productsData = data.products || data;
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // FIXED: using relative URL
      const response = await fetch('/api/products/categories');
      const data = await response.json();
      setCategories(data.categories || data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      const selectedCategoryId = parseInt(selectedCategory);
      filtered = filtered.filter(product => 
        getProductCategoryId(product) === selectedCategoryId
      );
    }

    setFilteredProducts(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    navigate(`/shop?${params.toString()}`);
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    alert(`${product.name} added to cart!`);
  };

  // Pagination
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Calculate product stats
  const totalProducts = products.length;
  const filteredCount = filteredProducts.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-1/4`}>
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
              {/* Search Input */}
              <div className="mb-6">
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-600"
                  >
                    <FaSearch />
                  </button>
                </form>
              </div>

              {/* Categories List */}
              <div className="mb-6">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      value="all"
                      checked={selectedCategory === 'all'}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="text-red-600"
                    />
                    <span className="text-gray-800">All Products ({totalProducts})</span>
                  </label>
                  {categories.map(category => (
                    <label key={category.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        value={category.id}
                        checked={selectedCategory === category.id.toString()}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="text-red-600"
                      />
                      <span className="text-gray-800">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {/* Stats Bar */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-gray-600">
                  Showing <span className="font-bold">{filteredCount}</span> of {totalProducts} products
                  {searchQuery && ` for "${searchQuery}"`}
                  {selectedCategory !== 'all' && categories.find(c => c.id == selectedCategory) && 
                    ` in "${categories.find(c => c.id == selectedCategory)?.name}"`
                  }
                </div>
              </div>

              {/* Active Filters */}
              {(searchQuery || selectedCategory !== 'all') && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {searchQuery && (
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                        Search: "{searchQuery}"
                      </span>
                    )}
                    {selectedCategory !== 'all' && categories.find(c => c.id == selectedCategory) && (
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        Category: {categories.find(c => c.id == selectedCategory)?.name}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
                    <div className="h-48 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <FaSearch className="text-6xl mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600">No products found</h3>
                  <p className="text-gray-500 mt-2">
                    {searchQuery ? 'Try a different search term' : 'Try selecting a different category'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    navigate('/shop');
                  }}
                  className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                >
                  Show All Products
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {currentProducts.map(product => {
                    const currentPrice = getProductPrice(product);
                    const regularPrice = getRegularPrice(product);
                    const productHasOffer = hasOffer(product);
                    const savings = calculateSavings(product);
                    
                    return (
                      <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                        {/* Product Image */}
                        <div className="h-48 bg-gray-100 relative overflow-hidden">
                          <a href={`/product/${product.id}`}>
                            {product.image_urls && product.image_urls.length > 0 ? (
                              <img 
                                // FIXED: Changed from localhost to relative URL
                                src={`/api/uploads/products/${product.image_urls[0]?.split('/').pop()}`}
                                alt={product.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = PLACEHOLDER_IMAGE;
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                <span className="text-gray-400">No Image</span>
                              </div>
                            )}
                          </a>
                          
                          {/* Offer Badge - FIXED */}
                          {productHasOffer && (
                            <div className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-pink-600 text-white px-2 py-1 rounded text-xs font-bold">
                              OFFER
                            </div>
                          )}
                          
                          {/* Stock Badge */}
                          <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${
                            product.stock_quantity === 0 
                              ? 'bg-red-100 text-red-800' 
                              : product.stock_quantity <= 10 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {product.stock_quantity === 0 
                              ? 'Out of Stock' 
                              : product.stock_quantity <= 10 
                              ? `Only ${product.stock_quantity} left` 
                              : 'In Stock'}
                          </div>
                        </div>
                        
                        {/* Product Info */}
                        <div className="p-4">
                          <a href={`/product/${product.id}`} className="block">
                            <h3 className="font-bold text-lg text-gray-900 mb-1 hover:text-red-600 line-clamp-1">
                              {product.name}
                            </h3>
                            {product.description && (
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                {product.description}
                              </p>
                            )}
                          </a>
                          
                          {/* Price - FIXED with safe formatting */}
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              {productHasOffer ? (
                                <>
                                  <span className="font-bold text-lg text-red-600">
                                    KSh {formatCurrency(currentPrice)}
                                  </span>
                                  <span className="text-gray-400 text-sm line-through ml-2">
                                    KSh {formatCurrency(regularPrice)}
                                  </span>
                                  {product.discount_percentage && (
                                    <span className="text-green-600 text-sm font-bold ml-2">
                                      ({product.discount_percentage}% OFF)
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="font-bold text-lg text-red-600">
                                  KSh {formatCurrency(currentPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Savings Badge - FIXED */}
                          {productHasOffer && savings > 0 && (
                            <div className="mb-2">
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                                Save KSh {formatCurrency(savings)}
                              </span>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAddToCart(product)}
                              disabled={product.stock_quantity === 0}
                              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                                product.stock_quantity === 0
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                              }`}
                            >
                              {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                            </button>
                            <a
                              href={`/product/${product.id}`}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
                              title="View Details"
                            >
                              <FaSearch />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => paginate(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => paginate(pageNum)}
                            className={`w-10 h-10 rounded-lg ${
                              currentPage === pageNum
                                ? 'bg-red-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => paginate(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;