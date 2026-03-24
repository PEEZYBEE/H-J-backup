// src/website/pages/HomePage.jsx - USING API SERVICES
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { 
  FaSearch, 
  FaShoppingCart, 
  FaStar, 
  FaTruck, 
  FaLock, 
  FaUndo, 
  FaHeadset,
  FaBox,
  FaTag,
  FaLayerGroup,
  FaClock,
  FaFilter,
  FaTimes,
  FaHistory,
  FaFire,
  FaGift,
  FaUtensils,
  FaTint,
  FaKey,
  FaUmbrella,
  FaGamepad,
  FaShoppingBag,
  FaHome,
  FaGem,
  FaBroom,
  FaPen,
  FaDog
} from 'react-icons/fa';
import { productsAPI, categoriesAPI } from '../../services/api';

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/600x600?text=No+Image';

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularSearches, setPopularSearches] = useState(['Notebooks', 'Laundry', 'Kitchen', 'Bottles', 'Toys']);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: 'all',
    minPrice: '',
    maxPrice: '',
    inStock: false,
    onSale: false
  });
  
  const searchRef = useRef(null);
  const { addToCart, cartCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    loadRecentSearches();
    
    // Click outside to close suggestions
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      generateSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, products]);

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAllProducts({ limit: 100 });
      console.log('Products response:', response); // Debug log
      // Make sure we're setting an array
      const productsData = response.products || response || [];
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error('Fetch error:', error);
      setProducts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAllCategories();
      setCategories(response.categories || response);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const loadRecentSearches = () => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  };

  const saveRecentSearch = (query) => {
    if (!query.trim()) return;
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const generateSuggestions = () => {
    const query = searchQuery.toLowerCase();
    const matched = [];
    
    // Product name suggestions
    const productMatches = products
      .filter(p => p.name.toLowerCase().includes(query))
      .slice(0, 3)
      .map(p => ({
        type: 'product',
        text: p.name,
        image: p.image_urls?.[0],
        price: getProductPrice(p),
        id: p.id
      }));
    
    // Category suggestions
    const categoryMatches = categories
      .filter(c => c.name.toLowerCase().includes(query))
      .slice(0, 2)
      .map(c => ({
        type: 'category',
        text: c.name,
        id: c.id
      }));
    
    // Brand suggestions (simulated)
    const brands = ['Samsung', 'Apple', 'Nike', 'Adidas', 'LG'];
    const brandMatches = brands
      .filter(b => b.toLowerCase().includes(query))
      .slice(0, 2)
      .map(b => ({
        type: 'brand',
        text: b
      }));
    
    setSuggestions([...productMatches, ...categoryMatches, ...brandMatches].slice(0, 6));
  };

  const getProductPrice = (product) => {
    return product?.selling_price ?? product?.price ?? 0;
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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
      
      // Build URL with filters
      const params = new URLSearchParams();
      params.set('search', searchQuery);
      
      if (filters.category !== 'all') {
        params.set('category', filters.category);
      }
      if (filters.minPrice) {
        params.set('minPrice', filters.minPrice);
      }
      if (filters.maxPrice) {
        params.set('maxPrice', filters.maxPrice);
      }
      if (filters.inStock) {
        params.set('inStock', 'true');
      }
      if (filters.onSale) {
        params.set('onSale', 'true');
      }
      
      navigate(`/shop?${params.toString()}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'product') {
      navigate(`/product/${suggestion.id}`);
    } else if (suggestion.type === 'category') {
      navigate(`/shop?category=${suggestion.id}`);
    } else {
      setSearchQuery(suggestion.text);
      handleSearch(new Event('submit'));
    }
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
  };

  const applyFilter = () => {
    setShowFilters(false);
    if (searchQuery.trim()) {
      handleSearch(new Event('submit'));
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    alert(`${product.name} added to cart!`);
  };

  const handleCategoryClick = (categoryId, categoryName) => {
    navigate(`/shop?category=${categoryId}`);
  };

  // Helper function to navigate to category by code
  const navigateToCategory = (categoryCode) => {
    const normalizedCode = (categoryCode || '').toUpperCase().trim();

    const legacyCodeMap = {
      BTL: 'FBS',
      FLK: 'FBS',
      KEY: 'TPA',
      UMB: 'TPA',
      BAG: 'TPA',
      ACC: 'TPA',
      HOM: 'HOU',
      CLN: 'HOU',
      STA: 'SGI',
      GFT: 'SGI',
    };

    const resolvedCode = legacyCodeMap[normalizedCode] || normalizedCode;

    let category = categories.find(c => (c.code || '').toUpperCase() === resolvedCode);

    if (!category) {
      const keywordMap = {
        KIT: ['kitchen'],
        FBS: ['bottle', 'flask', 'food', 'beverage'],
        TPA: ['travel', 'accessories', 'umbrella', 'key', 'bag'],
        TOY: ['toy', 'games'],
        HOU: ['home', 'organization', 'utility', 'clean'],
        SGI: ['stationery', 'gift'],
        PET: ['pet'],
      };

      const keywords = keywordMap[resolvedCode] || [];
      category = categories.find(c => {
        const text = `${c.name || ''} ${c.description || ''}`.toLowerCase();
        return keywords.some(keyword => text.includes(keyword));
      });
    }

    if (category) {
      navigate(`/shop?category=${category.id}`);
    } else {
      console.warn(`Category with code ${categoryCode} not found`);
      navigate('/shop');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Bar with Search - ENHANCED */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          

            {/* Search Bar with Suggestions - MOBILE OPTIMIZED */}
<div className="flex-1 max-w-3xl w-full relative" ref={searchRef}>
  <form onSubmit={handleSearch} className="flex">
    <div className="relative flex-1">
      <input
        type="text"
        placeholder="Search products..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        className="w-full px-4 py-2 md:py-3 border-2 border-r-0 border-gray-300 rounded-l-lg focus:outline-none focus:border-red-500 text-sm md:text-base pr-8"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={clearSearch}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <FaTimes size={14} />
        </button>
      )}
    </div>
    <button
      type="button"
      onClick={() => setShowFilters(!showFilters)}
      className={`px-3 md:px-4 py-2 md:py-3 border-2 border-gray-300 font-semibold flex items-center gap-1 md:gap-2 text-sm md:text-base ${
        showFilters ? 'bg-red-600 text-white border-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <FaFilter size={14} className="md:hidden" />
      <span className="hidden md:inline">Filter</span>
    </button>
    <button
      type="submit"
      className="bg-red-600 text-white px-4 md:px-8 py-2 md:py-3 rounded-r-lg hover:bg-red-700 font-semibold flex items-center gap-1 md:gap-2 text-sm md:text-base"
    >
      <FaSearch size={14} className="md:hidden" />
      <span className="hidden md:inline">Search</span>
    </button>
  </form>

  {/* Search Suggestions Dropdown */}
  {showSuggestions && (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
      {/* Recent Searches */}
      {recentSearches.length > 0 && !searchQuery && (
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <FaHistory /> Recent Searches
          </div>
          {recentSearches.map((search, index) => (
            <button
              key={index}
              onClick={() => {
                setSearchQuery(search);
                handleSearch(new Event('submit'));
              }}
              className="block w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-gray-700 text-sm"
            >
              {search}
            </button>
          ))}
        </div>
      )}

      {/* Popular Searches */}
      {!searchQuery && (
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <FaFire className="text-red-500" /> Popular Searches
          </div>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((term, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchQuery(term);
                  handleSearch(new Event('submit'));
                }}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs md:text-sm text-gray-700"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="p-3">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center gap-3 text-sm"
            >
              {suggestion.type === 'product' && suggestion.image && (
                <img 
                  src={`/api/uploads/products/${suggestion.image.split('/').pop()}`}
                  alt=""
                  className="w-6 h-6 object-cover rounded"
                />
              )}
              {suggestion.type === 'category' && <FaTag className="text-gray-400 text-xs" />}
              {suggestion.type === 'brand' && <FaBox className="text-gray-400 text-xs" />}
              <div className="flex-1">
                <span className="text-gray-700 text-sm">{suggestion.text}</span>
                {suggestion.type === 'product' && (
                  <span className="text-xs text-gray-500 ml-2">
                    KSh {formatCurrency(suggestion.price)}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 capitalize">
                {suggestion.type}
              </span>
            </button>
          ))}
        </div>
      )}

      {searchQuery && suggestions.length === 0 && (
        <div className="p-6 text-center text-gray-500">
          <p className="text-sm">No results found for "{searchQuery}"</p>
        </div>
      )}
    </div>
  )}

  {/* Filter Panel - MOBILE OPTIMIZED */}
  {showFilters && (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-3 md:p-4 w-full md:w-80">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-900 text-base">Filter</h3>
        <button
          onClick={() => setShowFilters(false)}
          className="text-gray-500 hover:text-gray-700 md:hidden"
        >
          <FaTimes />
        </button>
      </div>
      
      {/* Category Filter */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          value={filters.category}
          onChange={(e) => setFilters({...filters, category: e.target.value})}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Price Range - stacked on mobile */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Price (KSh)
        </label>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Checkbox Filters - horizontal on mobile */}
      <div className="mb-3 flex flex-wrap gap-3">
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={(e) => setFilters({...filters, inStock: e.target.checked})}
            className="rounded text-red-600 focus:ring-red-500"
          />
          <span>In Stock</span>
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={filters.onSale}
            onChange={(e) => setFilters({...filters, onSale: e.target.checked})}
            className="rounded text-red-600 focus:ring-red-500"
          />
          <span>On Sale</span>
        </label>
      </div>

      {/* Filter Actions */}
      <div className="flex gap-2">
        <button
          onClick={applyFilter}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          Apply
        </button>
        <button
          onClick={() => {
            setFilters({
              category: 'all',
              minPrice: '',
              maxPrice: '',
              inStock: false,
              onSale: false
            });
          }}
          className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
        >
          Reset
        </button>
      </div>
    </div>
  )}
</div>

            {/* Cart Icon */}
            <Link to="/cart" className="relative">
              <FaShoppingCart className="text-2xl text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout with Mobile Optimization */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main Content - Right Column - THIS COMES FIRST ON MOBILE */}
          <div className="md:w-4/5 order-1 md:order-2">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg p-6 md:p-10 mb-6 md:mb-8">
  <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4">Shop Smart, Shop HNJ</h1>
  <p className="text-base md:text-xl mb-4 md:mb-6">Where your next favourite thing lives.</p>
  <Link 
    to="/shop" 
    className="inline-block bg-white text-red-600 px-6 md:px-10 py-2 md:py-4 rounded-lg font-bold text-sm md:text-lg hover:bg-gray-100"
  >
    Start Shopping
  </Link>
</div>
            {/* Flash Sale Section - With safety check */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚡</span>
                  <h2 className="text-2xl font-bold text-gray-900">Flash Sale</h2>
                  <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                    <FaClock /> 01:23:45
                  </span>
                </div>
                <Link to="/shop?sort=flashsale" className="text-red-600 text-base hover:underline font-medium">
                  View All →
                </Link>
              </div>
              
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              ) : products && Array.isArray(products) && products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {products.slice(0, 4).map(product => {
                    const price = getProductPrice(product);
                    return (
                      <div key={product.id} className="group cursor-pointer bg-gray-50 rounded-lg p-4 hover:shadow-lg transition-shadow" onClick={() => navigate(`/product/${product.id}`)}>
                        <div className="bg-white rounded-lg p-6 mb-3 flex items-center justify-center h-40">
                          {product.image_urls && product.image_urls.length > 0 ? (
                            <img 
                              src={`/api/uploads/products/${product.image_urls[0]?.split('/').pop()}`}
                              alt={product.name}
                              className="max-h-32 max-w-full object-contain group-hover:scale-110 transition-transform"
                            />
                          ) : (
                            <span className="text-gray-400">No Image</span>
                          )}
                        </div>
                        <h3 className="font-medium text-base mb-2 line-clamp-2 h-12 text-gray-800">{product.name}</h3>
                        <p className="font-bold text-xl text-red-600">KSh {formatCurrency(price)}</p>
                        <div className="mt-2 bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded inline-block">
                          24 sold
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No products available</p>
                </div>
              )}
            </div>

            {/* ===== CATEGORY SHOWCASES SECTION ===== */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Shop by Category</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Kitchen & Dining Ware */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('KIT')}
                >
                  <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaUtensils className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Kitchen & Dining</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('KIT');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-orange-800 text-sm">Pots & Pans</p>
                        <p className="text-orange-600 font-bold">From KSh 450</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-orange-800 text-sm">Utensils</p>
                        <p className="text-orange-600 font-bold">From KSh 120</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-orange-800 text-sm">Plates & Bowls</p>
                        <p className="text-orange-600 font-bold">From KSh 250</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-orange-800 text-sm">Mugs & Cups</p>
                        <p className="text-orange-600 font-bold">From KSh 180</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Water Bottles */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('BTL')}
                >
                  <div className="bg-gradient-to-r from-blue-500 to-blue-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaTint className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Water Bottles</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('BTL');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-blue-800 text-sm">Plastic Bottles</p>
                        <p className="text-blue-600 font-bold">From KSh 150</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-blue-800 text-sm">Stainless Steel</p>
                        <p className="text-blue-600 font-bold">From KSh 450</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-blue-800 text-sm">Sports Bottles</p>
                        <p className="text-blue-600 font-bold">From KSh 250</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-blue-800 text-sm">Kids Bottles</p>
                        <p className="text-blue-600 font-bold">From KSh 180</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vacuum Flasks */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('FLK')}
                >
                  <div className="bg-gradient-to-r from-cyan-500 to-cyan-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaTint className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Vacuum Flasks</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('FLK');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-cyan-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-cyan-800 text-sm">Thermal Flasks</p>
                        <p className="text-cyan-600 font-bold">From KSh 650</p>
                      </div>
                      <div className="bg-cyan-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-cyan-800 text-sm">Food Jars</p>
                        <p className="text-cyan-600 font-bold">From KSh 550</p>
                      </div>
                      <div className="bg-cyan-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-cyan-800 text-sm">Travel Mugs</p>
                        <p className="text-cyan-600 font-bold">From KSh 350</p>
                      </div>
                      <div className="bg-cyan-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-cyan-800 text-sm">Soup Flasks</p>
                        <p className="text-cyan-600 font-bold">From KSh 750</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Chains */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('KEY')}
                >
                  <div className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaKey className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Key Chains</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('KEY');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-yellow-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-yellow-800 text-sm">Metal Keychains</p>
                        <p className="text-yellow-600 font-bold">From KSh 80</p>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-yellow-800 text-sm">Plastic Keychains</p>
                        <p className="text-yellow-600 font-bold">From KSh 50</p>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-yellow-800 text-sm">Novelty Keyrings</p>
                        <p className="text-yellow-600 font-bold">From KSh 120</p>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-yellow-800 text-sm">LED Keychains</p>
                        <p className="text-yellow-600 font-bold">From KSh 150</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Umbrellas */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('UMB')}
                >
                  <div className="bg-gradient-to-r from-purple-500 to-purple-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaUmbrella className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Umbrellas</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('UMB');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-purple-800 text-sm">Foldable</p>
                        <p className="text-purple-600 font-bold">From KSh 350</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-purple-800 text-sm">Straight</p>
                        <p className="text-purple-600 font-bold">From KSh 450</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-purple-800 text-sm">Kids Umbrellas</p>
                        <p className="text-purple-600 font-bold">From KSh 250</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-purple-800 text-sm">Golf Umbrellas</p>
                        <p className="text-purple-600 font-bold">From KSh 850</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toys & Games */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('TOY')}
                >
                  <div className="bg-gradient-to-r from-pink-500 to-pink-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaGamepad className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Toys & Games</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('TOY');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-pink-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-pink-800 text-sm">Soft Toys</p>
                        <p className="text-pink-600 font-bold">From KSh 250</p>
                      </div>
                      <div className="bg-pink-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-pink-800 text-sm">Action Figures</p>
                        <p className="text-pink-600 font-bold">From KSh 350</p>
                      </div>
                      <div className="bg-pink-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-pink-800 text-sm">Board Games</p>
                        <p className="text-pink-600 font-bold">From KSh 650</p>
                      </div>
                      <div className="bg-pink-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-pink-800 text-sm">Puzzles</p>
                        <p className="text-pink-600 font-bold">From KSh 280</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bags & Carry-All */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('BAG')}
                >
                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaShoppingBag className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Bags & Carry-All</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('BAG');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-emerald-800 text-sm">Tote Bags</p>
                        <p className="text-emerald-600 font-bold">From KSh 280</p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-emerald-800 text-sm">Backpacks</p>
                        <p className="text-emerald-600 font-bold">From KSh 650</p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-emerald-800 text-sm">Shopping Bags</p>
                        <p className="text-emerald-600 font-bold">From KSh 120</p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-emerald-800 text-sm">Travel Bags</p>
                        <p className="text-emerald-600 font-bold">From KSh 850</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Home Organization */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('HOM')}
                >
                  <div className="bg-gradient-to-r from-stone-500 to-stone-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaHome className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Home Organization</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('HOM');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-stone-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-stone-800 text-sm">Storage Bins</p>
                        <p className="text-stone-600 font-bold">From KSh 220</p>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-stone-800 text-sm">Hangers</p>
                        <p className="text-stone-600 font-bold">From KSh 80</p>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-stone-800 text-sm">Laundry Baskets</p>
                        <p className="text-stone-600 font-bold">From KSh 350</p>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-stone-800 text-sm">Shoe Racks</p>
                        <p className="text-stone-600 font-bold">From KSh 450</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accessories */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('ACC')}
                >
                  <div className="bg-gradient-to-r from-amber-500 to-amber-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaGem className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Accessories</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('ACC');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-amber-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-amber-800 text-sm">Wallets</p>
                        <p className="text-amber-600 font-bold">From KSh 180</p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-amber-800 text-sm">Belts</p>
                        <p className="text-amber-600 font-bold">From KSh 220</p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-amber-800 text-sm">Sunglasses</p>
                        <p className="text-amber-600 font-bold">From KSh 280</p>
                      </div>
                      <div className="bg-amber-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-amber-800 text-sm">Watches</p>
                        <p className="text-amber-600 font-bold">From KSh 450</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cleaning Supplies */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('CLN')}
                >
                  <div className="bg-gradient-to-r from-lime-500 to-lime-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaBroom className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Cleaning Supplies</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('CLN');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-lime-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-lime-800 text-sm">Brushes</p>
                        <p className="text-lime-600 font-bold">From KSh 50</p>
                      </div>
                      <div className="bg-lime-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-lime-800 text-sm">Dusters</p>
                        <p className="text-lime-600 font-bold">From KSh 80</p>
                      </div>
                      <div className="bg-lime-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-lime-800 text-sm">Buckets</p>
                        <p className="text-lime-600 font-bold">From KSh 150</p>
                      </div>
                      <div className="bg-lime-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-lime-800 text-sm">Mops</p>
                        <p className="text-lime-600 font-bold">From KSh 180</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stationery */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('STA')}
                >
                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaPen className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Stationery</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('STA');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-indigo-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-indigo-800 text-sm">Pens & Pencils</p>
                        <p className="text-indigo-600 font-bold">From KSh 20</p>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-indigo-800 text-sm">Notebooks</p>
                        <p className="text-indigo-600 font-bold">From KSh 80</p>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-indigo-800 text-sm">Folders</p>
                        <p className="text-indigo-600 font-bold">From KSh 60</p>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-indigo-800 text-sm">Art Supplies</p>
                        <p className="text-indigo-600 font-bold">From KSh 120</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gift Items */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('GFT')}
                >
                  <div className="bg-gradient-to-r from-rose-500 to-rose-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaGift className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Gift Items</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('GFT');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-rose-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-rose-800 text-sm">Gift Boxes</p>
                        <p className="text-rose-600 font-bold">From KSh 150</p>
                      </div>
                      <div className="bg-rose-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-rose-800 text-sm">Decorative Items</p>
                        <p className="text-rose-600 font-bold">From KSh 80</p>
                      </div>
                      <div className="bg-rose-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-rose-800 text-sm">Souvenirs</p>
                        <p className="text-rose-600 font-bold">From KSh 120</p>
                      </div>
                      <div className="bg-rose-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-rose-800 text-sm">Gift Wrapping</p>
                        <p className="text-rose-600 font-bold">From KSh 50</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pet Supplies */}
                <div 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-200 cursor-pointer"
                  onClick={() => navigateToCategory('PET')}
                >
                  <div className="bg-gradient-to-r from-teal-500 to-teal-400 text-white px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaDog className="text-white text-xl" />
                      <h3 className="font-bold text-lg">Pet Supplies</h3>
                    </div>
                    <span 
                      className="text-white text-sm hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToCategory('PET');
                      }}
                    >
                      View All →
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-teal-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-teal-800 text-sm">Pet Bowls</p>
                        <p className="text-teal-600 font-bold">From KSh 120</p>
                      </div>
                      <div className="bg-teal-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-teal-800 text-sm">Pet Toys</p>
                        <p className="text-teal-600 font-bold">From KSh 80</p>
                      </div>
                      <div className="bg-teal-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-teal-800 text-sm">Leashes</p>
                        <p className="text-teal-600 font-bold">From KSh 150</p>
                      </div>
                      <div className="bg-teal-50 p-3 rounded-lg text-center">
                        <p className="font-medium text-teal-800 text-sm">Pet Beds</p>
                        <p className="text-teal-600 font-bold">From KSh 450</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>




          
            {/* Featured Products */}
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Featured Products</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map(product => {
                const price = getProductPrice(product);
                const stockStatus = product.stock_quantity === 0 ? 'Out of Stock' : 
                                   product.stock_quantity <= 10 ? `Only ${product.stock_quantity} left` : '';
                
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group cursor-pointer"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    {/* Product Image */}
                    <div className="relative h-64 overflow-hidden">
                      {product.image_urls && product.image_urls.length > 0 ? (
                        <img 
                          src={`/api/uploads/products/${product.image_urls[0]?.split('/').pop()}`}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
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
                      
                      {/* Stock Badge */}
                      {stockStatus && (
                        <div className={`absolute top-3 right-3 text-xs font-bold px-3 py-1.5 rounded-full shadow-md ${
                          product.stock_quantity === 0 ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
                        }`}>
                          {stockStatus}
                        </div>
                      )}
                      
                      {/* Offer Badge */}
                      {product.is_on_offer && (
                        <div className="absolute top-3 left-3 bg-red-600 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-md">
                          -20%
                        </div>
                      )}
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-5">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2 h-14">
                        {product.name}
                      </h3>
                      
                      {/* Rating Stars */}
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} className="text-yellow-400 text-sm" />
                        ))}
                        <span className="text-gray-500 text-sm ml-2">(24)</span>
                      </div>
                      
                      {/* Price */}
                      <p className="font-bold text-2xl text-red-600 mb-4">
                        KSh {formatCurrency(price)}
                      </p>
                      
                      {/* Action Buttons */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        disabled={product.stock_quantity === 0}
                        className={`w-full py-4 rounded-xl text-base font-bold transition-all duration-200 transform hover:scale-[1.02] ${
                          product.stock_quantity === 0
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
                        }`}
                      >
                        {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                      
                      <Link 
                        to={`/product/${product.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block text-center text-red-600 text-sm mt-3 hover:text-red-800 font-medium"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-10">
              <Link 
                to="/shop" 
                className="inline-block bg-red-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-red-700 shadow-lg hover:shadow-xl transition-all"
              >
                Browse All Products →
              </Link>
            </div>
          </div>

          {/* Category Sidebar - Left Column - THIS COMES SECOND ON MOBILE */}
          <div className="md:w-1/5 order-2 md:order-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-24">
              <div className="bg-red-600 text-white px-4 py-3 font-bold flex items-center gap-2 text-lg">
                <FaLayerGroup /> All Categories
              </div>
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                <button
                  onClick={() => navigate('/shop')}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium text-gray-700"
                >
                  <FaBox className="text-gray-400" /> All Products
                </button>
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id, category.name)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-600"
                  >
                    <FaTag className="text-gray-400" /> {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Promo Banner */}
            <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg shadow-md p-6 mt-6">
              <h3 className="font-bold text-xl mb-2">Special Offer!</h3>
              <p className="text-base mb-4">Welcome to HNj Store.</p>
              <button className="bg-white text-red-600 px-4 py-3 rounded-lg text-base font-bold w-full hover:bg-gray-100">
                Shop Now →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white border-t border-gray-200 mt-12 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaTruck className="text-red-600 text-2xl" />
              </div>
              <h4 className="font-bold text-base mb-2">Free Delivery</h4>
              <p className="text-sm text-gray-500">On orders over KSh 5k</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaUndo className="text-red-600 text-2xl" />
              </div>
              <h4 className="font-bold text-base mb-2">7 Days Return</h4>
              <p className="text-sm text-gray-500">Money-back guarantee</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaLock className="text-red-600 text-2xl" />
              </div>
              <h4 className="font-bold text-base mb-2">Secure Payment</h4>
              <p className="text-sm text-gray-500">M-Pesa & Cards</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaHeadset className="text-red-600 text-2xl" />
              </div>
              <h4 className="font-bold text-base mb-2">24/7 Support</h4>
              <p className="text-sm text-gray-500">Live chat & phone</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;