import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaEye, FaEdit, FaTrash, FaPlus, FaSearch, FaFilter, 
  FaBoxOpen, FaTimes, FaSave, FaTag, FaPercent, FaUpload, FaImage, FaVideo, FaPlay
} from 'react-icons/fa';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [categories, setCategories] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const toMediaPreviewUrl = (url, folder) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
    if (url.startsWith('/api/uploads/')) return url;
    if (url.startsWith('/static/uploads/')) return url.replace('/static/uploads/', '/api/uploads/');
    const fileName = url.split('/').pop();
    return `/api/uploads/${folder}/${fileName}`;
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const pageSize = 200;
      let offset = 0;
      let total = null;
      let allProducts = [];

      // Pull every page so search/filter can run against the full catalog.
      while (total === null || allProducts.length < total) {
        const response = await fetch(`/api/products/products?limit=${pageSize}&offset=${offset}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        const pageProducts = data.products || [];

        allProducts = [...allProducts, ...pageProducts];

        if (typeof data.total === 'number') {
          total = data.total;
        } else {
          break;
        }

        if (pageProducts.length < pageSize) {
          break;
        }

        offset += pageSize;
      }

      setProducts(allProducts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCategories(data.categories || data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      product.name?.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.brand?.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (filter === 'in-stock') return product.stock_quantity > 0;
    if (filter === 'low-stock') return product.stock_quantity > 0 && product.stock_quantity <= product.min_stock_level;
    if (filter === 'out-of-stock') return product.stock_quantity === 0;

    return true;
  });

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products/staff/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setProducts(products.filter(product => product.id !== productId));
      } else {
        throw new Error('Failed to delete product');
      }
    } catch (err) {
      alert('Error deleting product: ' + err.message);
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct(product.id);
    setEditForm({
      ...product,
      // Ensure numeric fields are properly formatted - FIXED FOR 0
      price: product.price ?? '',
      cost_price: product.cost_price ?? '',
      stock_quantity: product.stock_quantity ?? '',
      min_stock_level: product.min_stock_level ?? 5,
      offer_price: product.offer_price ?? '',
      discount_percentage: product.discount_percentage ?? '',
      is_on_offer: product.is_on_offer || false,
      image_urls: Array.isArray(product.image_urls) ? product.image_urls : [],
      video_urls: Array.isArray(product.video_urls) ? product.video_urls : []
    });
  };

  const uploadEditImages = async (files) => {
    const token = localStorage.getItem('token');
    const multiData = new FormData();
    files.forEach((file) => multiData.append('images', file));
    multiData.append('folder', 'products');

    const multiResponse = await fetch('/api/products/upload/multiple', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: multiData
    });

    if (multiResponse.ok) {
      const data = await multiResponse.json();
      return data.imageUrls || [];
    }

    // Fallback to single image uploads if multiple upload endpoint fails.
    const uploaded = [];
    for (const file of files) {
      const singleData = new FormData();
      singleData.append('image', file);
      singleData.append('folder', 'products');
      const singleResponse = await fetch('/api/products/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: singleData
      });
      if (!singleResponse.ok) {
        throw new Error(`Failed to upload ${file.name}`);
      }
      const singlePayload = await singleResponse.json();
      uploaded.push(singlePayload.imageUrl);
    }
    return uploaded;
  };

  const handleEditImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      const maxSize = 5 * 1024 * 1024;
      if (!validTypes.includes(file.type)) {
        alert(`${file.name} is not a valid image type`);
        return false;
      }
      if (file.size > maxSize) {
        alert(`${file.name} is larger than 5MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    try {
      setUploadingImages(true);
      const uploadedUrls = await uploadEditImages(validFiles);
      setEditForm((prev) => ({
        ...prev,
        image_urls: [...(prev.image_urls || []), ...uploadedUrls]
      }));
    } catch (err) {
      console.error('Error uploading images:', err);
      alert(`Error uploading images: ${err.message}`);
    } finally {
      setUploadingImages(false);
      e.target.value = '';
    }
  };

  const removeEditImage = (index) => {
    setEditForm((prev) => ({
      ...prev,
      image_urls: (prev.image_urls || []).filter((_, i) => i !== index)
    }));
  };

  const uploadEditVideos = async (files) => {
    const token = localStorage.getItem('token');
    const multiData = new FormData();
    files.forEach((file) => multiData.append('videos', file));
    multiData.append('folder', 'product_videos');

    const multiResponse = await fetch('/api/products/upload/videos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: multiData
    });

    if (multiResponse.ok) {
      const data = await multiResponse.json();
      return data.videoUrls || [];
    }

    // Fallback to single video uploads if multiple upload endpoint fails.
    const uploaded = [];
    for (const file of files) {
      const singleData = new FormData();
      singleData.append('video', file);
      singleData.append('folder', 'product_videos');
      const singleResponse = await fetch('/api/products/upload/video', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: singleData
      });
      if (!singleResponse.ok) {
        throw new Error(`Failed to upload ${file.name}`);
      }
      const singlePayload = await singleResponse.json();
      uploaded.push(singlePayload.videoUrl);
    }
    return uploaded;
  };

  const handleEditVideoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
      const maxSize = 50 * 1024 * 1024;
      if (!validTypes.includes(file.type)) {
        alert(`${file.name} is not a supported video type`);
        return false;
      }
      if (file.size > maxSize) {
        alert(`${file.name} is larger than 50MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }

    try {
      setUploadingVideos(true);
      const uploadedUrls = await uploadEditVideos(validFiles);
      setEditForm((prev) => ({
        ...prev,
        video_urls: [...(prev.video_urls || []), ...uploadedUrls]
      }));
    } catch (err) {
      console.error('Error uploading videos:', err);
      alert(`Error uploading videos: ${err.message}`);
    } finally {
      setUploadingVideos(false);
      e.target.value = '';
    }
  };

  const removeEditVideo = (index) => {
    setEditForm((prev) => ({
      ...prev,
      video_urls: (prev.video_urls || []).filter((_, i) => i !== index)
    }));
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              (name === 'price' || name === 'cost_price' || name === 'offer_price') ? 
              (value === '' ? '' : parseFloat(value)) : 
              (name === 'stock_quantity' || name === 'min_stock_level' || name === 'discount_percentage') ?
              (value === '' ? '' : parseInt(value, 10)) :
              value
    }));
  };

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Prepare data - ensure 0 values are sent properly
      const dataToSend = {
        ...editForm,
        price: editForm.price !== '' ? parseFloat(editForm.price) : 0,
        cost_price: editForm.cost_price !== '' ? parseFloat(editForm.cost_price) : null,
        stock_quantity: editForm.stock_quantity !== '' ? parseInt(editForm.stock_quantity, 10) : 0,
        min_stock_level: editForm.min_stock_level !== '' ? parseInt(editForm.min_stock_level, 10) : 5,
        offer_price: editForm.offer_price !== '' ? parseFloat(editForm.offer_price) : null,
        discount_percentage: editForm.discount_percentage !== '' ? parseInt(editForm.discount_percentage, 10) : null,
        image_urls: (editForm.image_urls || []).filter((url) => typeof url === 'string' && url.trim()),
        video_urls: (editForm.video_urls || []).filter((url) => typeof url === 'string' && url.trim())
      };
      
      console.log('Sending update data:', dataToSend);
      
      const response = await fetch(`/api/products/staff/products/${editingProduct}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        setProducts(products.map(p => 
          p.id === editingProduct ? updatedProduct.product : p
        ));
        setEditingProduct(null);
        alert('Product updated successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Error updating product: ' + err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditForm({});
    setUploadingImages(false);
    setUploadingVideos(false);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
      <p>Error loading products: {error}</p>
      <button 
        onClick={fetchProducts}
        className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your store products</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent w-full md:w-64"
            />
          </div>

          {/* Filter Dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">All Products</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>

          {/* Add Product Button - UPDATED PATH */}
          <Link
            to="/dashboard/products/new"
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <FaPlus /> Add Product
          </Link>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div 
            key={product.id} 
            className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow relative"
          >
            {/* Offer Badge */}
            {product.is_on_offer && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full z-10">
                <FaTag className="inline mr-1" /> OFFER!
              </div>
            )}

            {/* Product Image */}
            <div className="h-48 bg-gray-100 relative overflow-hidden">
              {product.image_urls && product.image_urls.length > 0 ? (
                <img 
                src={`/api/uploads/products/${product.image_urls[0]?.split('/').pop()}`}
                alt={product.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"><span class="text-gray-400">No Image</span></div>';
                }}
              />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <span className="text-gray-400">No Image</span>
                </div>
              )}
              
              {/* Stock Badge */}
              <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${
                product.stock_quantity === 0 
                  ? 'bg-red-100 text-red-800' 
                  : product.stock_quantity <= product.min_stock_level 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {product.stock_quantity === 0 
                  ? 'Out of Stock' 
                  : product.stock_quantity <= product.min_stock_level 
                  ? `Only ${product.stock_quantity} left` 
                  : 'In Stock'}
              </div>
            </div>

            {/* Product Info */}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.sku}</p>
                </div>
                <div className="text-right">
                  {product.is_on_offer && product.offer_price ? (
                    <>
                      <span className="font-bold text-lg text-red-600">
                        KSh {product.offer_price?.toLocaleString()}
                      </span>
                      <div className="text-xs text-gray-500 line-through">
                        KSh {product.price?.toLocaleString()}
                      </div>
                      {product.discount_percentage && (
                        <div className="text-xs text-green-600 font-semibold">
                          <FaPercent className="inline" /> {product.discount_percentage}% OFF
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="font-bold text-lg text-red-600">
                      KSh {product.price?.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {product.description}
              </p>

              {/* Action Buttons */}
              <div className="flex justify-between items-center border-t pt-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(product)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    Stock: <span className="font-semibold">{product.stock_quantity}</span>
                  </span>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State - UPDATED PATH */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <FaBoxOpen className="text-6xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600">No products found</h3>
            <p className="text-gray-500 mt-2">
              {searchQuery ? 'Try a different search term' : 'Add your first product to get started'}
            </p>
          </div>
          {!searchQuery && (
            <Link
              to="/dashboard/products/new"
              className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 mt-4"
            >
              <FaPlus /> Add Product
            </Link>
          )}
        </div>
      )}

      {/* Floating Edit Panel */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Edit Product</h2>
              <button
                onClick={handleCancelEdit}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FaTimes className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={editForm.name || ''}
                      onChange={handleEditChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      name="sku"
                      value={editForm.sku || ''}
                      onChange={handleEditChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={editForm.description || ''}
                      onChange={handleEditChange}
                      rows="3"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      name="category_id"
                      value={editForm.category_id || ''}
                      onChange={handleEditChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing & Stock - UPDATED FOR 0 */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Stock</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price (KSh)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="price"
                      value={editForm.price ?? ''}
                      onChange={handleEditChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost Price (KSh) - Optional
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="cost_price"
                      value={editForm.cost_price ?? ''}
                      onChange={handleEditChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      name="stock_quantity"
                      min="0"
                      value={editForm.stock_quantity ?? ''}
                      onChange={handleEditChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Set to 0 to mark as out of stock</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Low Stock Alert Level
                    </label>
                    <input
                      type="number"
                      name="min_stock_level"
                      min="0"
                      value={editForm.min_stock_level ?? 5}
                      onChange={handleEditChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this level</p>
                  </div>
                </div>
              </div>

              {/* Offer Section */}
              <div className="border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="is_on_offer"
                    name="is_on_offer"
                    checked={editForm.is_on_offer || false}
                    onChange={handleEditChange}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="is_on_offer" className="text-sm font-medium text-gray-700">
                    Enable Special Offer
                  </label>
                </div>

                {editForm.is_on_offer && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Offer Price (KSh)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="offer_price"
                        value={editForm.offer_price ?? ''}
                        onChange={handleEditChange}
                        className="w-full border border-red-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount Percentage
                      </label>
                      <input
                        type="number"
                        name="discount_percentage"
                        min="0"
                        max="100"
                        value={editForm.discount_percentage ?? ''}
                        onChange={handleEditChange}
                        className="w-full border border-red-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Media Section */}
              <div className="border-t pt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FaImage className="text-blue-600" /> Product Images
                  </h3>
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleEditImageSelect}
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImages}
                    className="mb-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <FaUpload /> {uploadingImages ? 'Uploading...' : 'Add Images'}
                  </button>

                  {(editForm.image_urls || []).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {(editForm.image_urls || []).map((url, index) => (
                        <div key={`edit-image-${index}`} className="relative group">
                          <img
                            src={toMediaPreviewUrl(url, 'products')}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-28 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeEditImage(index)}
                            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove image"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FaVideo className="text-red-600" /> Product Videos
                  </h3>
                  <input
                    type="file"
                    ref={videoInputRef}
                    onChange={handleEditVideoSelect}
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploadingVideos}
                    className="mb-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <FaUpload /> {uploadingVideos ? 'Uploading...' : 'Add Videos'}
                  </button>

                  {(editForm.video_urls || []).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {(editForm.video_urls || []).map((url, index) => (
                        <div key={`edit-video-${index}`} className="relative group">
                          <div className="w-full h-28 bg-gray-100 rounded-lg border border-gray-200 relative overflow-hidden">
                            <video
                              src={toMediaPreviewUrl(url, 'product_videos')}
                              className="w-full h-full object-cover"
                              muted
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                              <FaPlay className="text-white" />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEditVideo(index)}
                            className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove video"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <FaSave /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;