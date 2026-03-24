# ~/hnj/backend/views/product_routes.py - COMPLETE WITH VIDEO UPLOAD SUPPORT
import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, Product, ProductCategory, ProductSubCategory, User
from utils.schemas import CreateProductSchema
from marshmallow import ValidationError

product_bp = Blueprint('products', __name__)

# Configure upload settings
ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'}
MAX_IMAGE_SIZE = 16 * 1024 * 1024  # 16MB max file size for images
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB max file size for videos

def allowed_image_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS

def allowed_video_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

def create_upload_folder(folder_name):
    """Create upload folder if it doesn't exist - use Flask's app context"""
    try:
        # Get the root path of the Flask app
        app_root = current_app.root_path
        
        # Build the correct path relative to Flask app root
        base_path = os.path.join(app_root, 'static', 'uploads')
        folder_path = os.path.join(base_path, folder_name)
        
        # Create directories if they don't exist
        if not os.path.exists(base_path):
            os.makedirs(base_path, exist_ok=True)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path, exist_ok=True)
        
        print(f"DEBUG: App root: {app_root}")
        print(f"DEBUG: Created folder: {folder_path}")
        print(f"DEBUG: Folder exists: {os.path.exists(folder_path)}")
        
        return folder_path
    except Exception as e:
        print(f"ERROR in create_upload_folder: {str(e)}")
        # Fallback to relative path
        base_path = os.path.join('static', 'uploads')
        folder_path = os.path.join(base_path, folder_name)
        os.makedirs(folder_path, exist_ok=True)
        return folder_path

# ==================== DEBUG ENDPOINTS ====================

@product_bp.route('/debug/files', methods=['GET'])
def debug_files():
    """Debug endpoint to check file locations"""
    import os
    
    debug_info = {
        'current_working_directory': os.getcwd(),
        'flask_app_root': current_app.root_path,
        'static_folder': current_app.static_folder,
        'static_url_path': current_app.static_url_path,
        'upload_folder_config': current_app.config.get('UPLOAD_FOLDER'),
    }
    
    # Check if upload folder exists
    upload_path = os.path.join(current_app.root_path, 'static', 'uploads', 'products')
    debug_info['upload_folder_exists'] = os.path.exists(upload_path)
    debug_info['upload_folder_path'] = upload_path
    
    # List files in upload folder
    if debug_info['upload_folder_exists']:
        try:
            debug_info['uploaded_files'] = os.listdir(upload_path)
            debug_info['file_count'] = len(debug_info['uploaded_files'])
            
            # Get file details
            file_details = []
            for filename in debug_info['uploaded_files'][:10]:
                file_path = os.path.join(upload_path, filename)
                file_details.append({
                    'name': filename,
                    'size': os.path.getsize(file_path) if os.path.exists(file_path) else 0,
                    'exists': os.path.exists(file_path),
                    'url': f"/static/uploads/products/{filename}",
                    'full_url': f"http://localhost:5000/static/uploads/products/{filename}"
                })
            debug_info['file_details'] = file_details
        except Exception as e:
            debug_info['error'] = str(e)
    else:
        debug_info['uploaded_files'] = []
        debug_info['file_count'] = 0
        debug_info['file_details'] = []
    
    return jsonify(debug_info), 200

@product_bp.route('/test-file-access/<filename>', methods=['GET'])
def test_file_access(filename):
    """Test if a specific file can be accessed"""
    try:
        # Try to access the file
        upload_path = os.path.join(current_app.root_path, 'static', 'uploads', 'products')
        file_path = os.path.join(upload_path, filename)
        
        if os.path.exists(file_path):
            return send_from_directory(
                os.path.join('static', 'uploads', 'products'),
                filename
            )
        else:
            return jsonify({
                'error': 'File not found',
                'searched_path': file_path,
                'exists': False
            }), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== IMAGE UPLOAD ENDPOINTS ====================

@product_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_image():
    """Upload image for products"""
    try:
        print("\n" + "="*50)
        print("DEBUG: Upload endpoint called")
        
        # Check if file exists in request
        if 'image' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['image']
        print(f"DEBUG: Received file: {file.filename}")
        print(f"DEBUG: File content type: {file.content_type}")
        print(f"DEBUG: File size: {len(file.read())} bytes")
        file.seek(0)
        
        # Check if file was selected
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file
        if not allowed_image_file(file.filename):
            return jsonify({'error': 'File type not allowed. Allowed types: PNG, JPG, JPEG, GIF, WEBP'}), 400
        
        # Get folder name (default to 'products')
        folder = request.form.get('folder', 'products')
        print(f"DEBUG: Upload folder: {folder}")
        
        # Secure the filename and create unique name
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'jpg'
        
        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        new_filename = f"{timestamp}_{unique_id}.{file_extension}"
        print(f"DEBUG: Generated filename: {new_filename}")
        
        # Create folder if it doesn't exist
        upload_folder = create_upload_folder(folder)
        
        # Save file
        file_path = os.path.join(upload_folder, new_filename)
        print(f"DEBUG: Saving to: {file_path}")
        
        file.save(file_path)
        
        # Verify file was saved
        if os.path.exists(file_path):
            file_size = os.path.getsize(file_path)
            print(f"DEBUG: File saved successfully! Size: {file_size} bytes")
            print(f"DEBUG: File readable: {os.access(file_path, os.R_OK)}")
        else:
            print("DEBUG: ERROR - File not saved!")
            return jsonify({'error': 'File failed to save'}), 500
        
        # Return relative URL for frontend
        image_url = f"/api/uploads/{folder}/{new_filename}"
        print(f"DEBUG: Image URL: {image_url}")
        print(f"DEBUG: Full test URL: http://localhost:5000{image_url}")
        print("="*50 + "\n")
        
        return jsonify({
            'success': True,
            'message': 'Image uploaded successfully',
            'imageUrl': image_url,
            'filename': new_filename,
            'size': file_size
        }), 200
        
    except Exception as e:
        print(f"ERROR in upload: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@product_bp.route('/upload/multiple', methods=['POST'])
@jwt_required()
def upload_multiple_images():
    """Upload multiple images at once"""
    try:
        print("\n" + "="*50)
        print("DEBUG: Multiple upload endpoint called")
        
        # Check if files exist in request
        if 'images' not in request.files:
            return jsonify({'error': 'No files part'}), 400
        
        files = request.files.getlist('images')
        print(f"DEBUG: Received {len(files)} files")
        
        # Check if files were selected
        if len(files) == 0:
            return jsonify({'error': 'No files selected'}), 400
        
        # Get folder name (default to 'products')
        folder = request.form.get('folder', 'products')
        
        # Create folder if it doesn't exist
        upload_folder = create_upload_folder(folder)
        
        uploaded_urls = []
        
        for file in files:
            if file.filename == '':
                continue
            
            # Validate file
            if not allowed_image_file(file.filename):
                print(f"DEBUG: Skipping invalid file: {file.filename}")
                continue
            
            # Secure the filename and create unique name
            original_filename = secure_filename(file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'jpg'
            
            # Generate unique filename with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_id = str(uuid.uuid4())[:8]
            new_filename = f"{timestamp}_{unique_id}.{file_extension}"
            
            # Save file
            file_path = os.path.join(upload_folder, new_filename)
            file.save(file_path)
            
            # Verify save
            if os.path.exists(file_path):
                print(f"DEBUG: Saved: {new_filename} ({os.path.getsize(file_path)} bytes)")
            else:
                print(f"DEBUG: Failed to save: {new_filename}")
                continue
            
            # Add to uploaded URLs
            image_url = f"/api/uploads/{folder}/{new_filename}"
            uploaded_urls.append(image_url)
        
        if len(uploaded_urls) == 0:
            return jsonify({'error': 'No valid files uploaded'}), 400
        
        print(f"DEBUG: Successfully uploaded {len(uploaded_urls)} files")
        print("="*50 + "\n")
        
        return jsonify({
            'success': True,
            'message': f'{len(uploaded_urls)} image(s) uploaded successfully',
            'imageUrls': uploaded_urls
        }), 200
        
    except Exception as e:
        print(f"ERROR in multiple upload: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ==================== VIDEO UPLOAD ENDPOINTS ====================

@product_bp.route('/upload/video', methods=['POST'])
@jwt_required()
def upload_single_video():
    """Upload a single video file"""
    try:
        print("\n" + "="*50)
        print("DEBUG: Video upload endpoint called")
        
        # Check if file exists in request
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        file = request.files['video']
        print(f"DEBUG: Received file: {file.filename}")
        print(f"DEBUG: File content type: {file.content_type}")
        file.seek(0)
        
        # Check if file was selected
        if file.filename == '':
            return jsonify({'error': 'No video selected'}), 400
        
        # Validate file type
        if not allowed_video_file(file.filename):
            return jsonify({'error': 'Invalid video format. Allowed: mp4, webm, ogg, mov, avi, mkv'}), 400
        
        # Check file size (approximate by seeking to end and back)
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_VIDEO_SIZE:
            return jsonify({'error': f'Video too large. Max size: {MAX_VIDEO_SIZE // (1024*1024)}MB'}), 400
        
        # Get folder name (default to 'product_videos')
        folder = request.form.get('folder', 'product_videos')
        print(f"DEBUG: Upload folder: {folder}")
        
        # Secure the filename and create unique name
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'mp4'
        
        # Generate unique filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        new_filename = f"video_{timestamp}_{unique_id}.{file_extension}"
        print(f"DEBUG: Generated filename: {new_filename}")
        
        # Create folder if it doesn't exist
        upload_folder = create_upload_folder(folder)
        
        # Save file
        file_path = os.path.join(upload_folder, new_filename)
        print(f"DEBUG: Saving to: {file_path}")
        
        file.save(file_path)
        
        # Verify file was saved
        if os.path.exists(file_path):
            saved_size = os.path.getsize(file_path)
            print(f"DEBUG: Video saved successfully! Size: {saved_size} bytes")
        else:
            print("DEBUG: ERROR - Video not saved!")
            return jsonify({'error': 'Video failed to save'}), 500
        
        # Return relative URL for frontend
        video_url = f"/api/uploads/{folder}/{new_filename}"
        print(f"DEBUG: Video URL: {video_url}")
        print("="*50 + "\n")
        
        return jsonify({
            'success': True,
            'message': 'Video uploaded successfully',
            'videoUrl': video_url,
            'filename': new_filename,
            'size': saved_size
        }), 200
        
    except Exception as e:
        print(f"ERROR in video upload: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@product_bp.route('/upload/videos', methods=['POST'])
@jwt_required()
def upload_multiple_videos():
    """Upload multiple video files"""
    try:
        print("\n" + "="*50)
        print("DEBUG: Multiple video upload endpoint called")
        
        # Check if files exist in request
        if 'videos' not in request.files:
            return jsonify({'error': 'No video files provided'}), 400
        
        files = request.files.getlist('videos')
        print(f"DEBUG: Received {len(files)} video files")
        
        # Check if files were selected
        if len(files) == 0:
            return jsonify({'error': 'No videos selected'}), 400
        
        # Get folder name (default to 'product_videos')
        folder = request.form.get('folder', 'product_videos')
        
        # Create folder if it doesn't exist
        upload_folder = create_upload_folder(folder)
        
        uploaded_urls = []
        failed_uploads = []
        
        for file in files:
            if file.filename == '':
                continue
            
            # Validate file type
            if not allowed_video_file(file.filename):
                failed_uploads.append(f"{file.filename} (invalid format)")
                continue
            
            # Check file size
            file.seek(0, 2)
            file_size = file.tell()
            file.seek(0)
            
            if file_size > MAX_VIDEO_SIZE:
                failed_uploads.append(f"{file.filename} (too large - {file_size // (1024*1024)}MB)")
                continue
            
            # Secure the filename and create unique name
            original_filename = secure_filename(file.filename)
            file_extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'mp4'
            
            # Generate unique filename with timestamp
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_id = str(uuid.uuid4())[:8]
            new_filename = f"video_{timestamp}_{unique_id}.{file_extension}"
            
            # Save file
            file_path = os.path.join(upload_folder, new_filename)
            file.save(file_path)
            
            # Verify save
            if os.path.exists(file_path):
                saved_size = os.path.getsize(file_path)
                print(f"DEBUG: Saved video: {new_filename} ({saved_size} bytes)")
            else:
                failed_uploads.append(f"{original_filename} (save failed)")
                continue
            
            # Add to uploaded URLs
            video_url = f"/api/uploads/{folder}/{new_filename}"
            uploaded_urls.append(video_url)
        
        response = {
            'success': True,
            'message': f'Successfully uploaded {len(uploaded_urls)} videos',
            'videoUrls': uploaded_urls
        }
        
        if failed_uploads:
            response['failed'] = failed_uploads
            response['message'] += f', {len(failed_uploads)} failed'
        
        if len(uploaded_urls) == 0:
            response['success'] = False
            response['message'] = 'No videos were uploaded successfully'
            return jsonify(response), 400
        
        print(f"DEBUG: Successfully uploaded {len(uploaded_urls)} videos")
        if failed_uploads:
            print(f"DEBUG: Failed uploads: {failed_uploads}")
        print("="*50 + "\n")
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"ERROR in multiple video upload: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ==================== PRODUCT ENDPOINTS ====================

@product_bp.route('/products', methods=['GET'])
def get_products():
    """Get all products with search and filters"""
    try:
        search = request.args.get('search', '')
        category_id = request.args.get('category_id')
        subcategory_id = request.args.get('subcategory_id')
        min_price = request.args.get('min_price')
        max_price = request.args.get('max_price')
        in_stock = request.args.get('in_stock')
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        limit = request.args.get('limit', 50)
        offset = request.args.get('offset', 0)
        
        query = Product.query.filter_by(is_active=True)
        
        # Apply filters
        if search:
            query = query.filter(
                db.or_(
                    Product.name.ilike(f'%{search}%'),
                    Product.description.ilike(f'%{search}%'),
                    Product.sku.ilike(f'%{search}%'),
                    Product.barcode.ilike(f'%{search}%')
                )
            )
        
        if category_id:
            query = query.filter_by(category_id=category_id)
        
        if subcategory_id:
            query = query.filter_by(subcategory_id=subcategory_id)
        
        if min_price:
            query = query.filter(Product.selling_price >= float(min_price))
        
        if max_price:
            query = query.filter(Product.selling_price <= float(max_price))
        
        if in_stock and in_stock.lower() == 'true':
            query = query.filter(Product.stock_quantity > 0)
        
        # Apply sorting
        if sort_by == 'price':
            if sort_order == 'asc':
                query = query.order_by(Product.selling_price.asc())
            else:
                query = query.order_by(Product.selling_price.desc())
        elif sort_by == 'name':
            if sort_order == 'asc':
                query = query.order_by(Product.name.asc())
            else:
                query = query.order_by(Product.name.desc())
        else:
            if sort_order == 'asc':
                query = query.order_by(Product.created_at.asc())
            else:
                query = query.order_by(Product.created_at.desc())
        
        # Pagination
        total = query.count()
        products = query.offset(int(offset)).limit(int(limit)).all()
        
        return jsonify({
            'success': True,
            'products': [product.to_dict() for product in products],
            'total': total,
            'offset': int(offset),
            'limit': int(limit)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get products error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch products'}), 500

@product_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Get single product details"""
    try:
        product = Product.query.get_or_404(product_id)
        
        if not product.is_active:
            return jsonify({'success': False, 'message': 'Product not available'}), 404
        
        return jsonify({
            'success': True,
            'product': product.to_dict()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Get product error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch product'}), 500

@product_bp.route('/products/category/<int:category_id>', methods=['GET'])
def get_products_by_category(category_id):
    """Get products by category"""
    try:
        category = ProductCategory.query.get_or_404(category_id)
        
        products = Product.query.filter_by(
            category_id=category_id,
            is_active=True
        ).all()
        
        return jsonify({
            'success': True,
            'category': category.to_dict(),
            'products': [product.to_dict() for product in products]
        }), 200
    except Exception as e:
        current_app.logger.error(f"Get products by category error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch products'}), 500

@product_bp.route('/products/subcategory/<int:subcategory_id>', methods=['GET'])
def get_products_by_subcategory(subcategory_id):
    """Get products by subcategory"""
    try:
        subcategory = ProductSubCategory.query.get_or_404(subcategory_id)
        
        products = Product.query.filter_by(
            subcategory_id=subcategory_id,
            is_active=True
        ).all()
        
        return jsonify({
            'success': True,
            'subcategory': subcategory.to_dict(),
            'products': [product.to_dict() for product in products]
        }), 200
    except Exception as e:
        current_app.logger.error(f"Get products by subcategory error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch products'}), 500

# ==================== CATEGORY MANAGEMENT ROUTES ====================

@product_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all product categories with subcategories"""
    try:
        categories = ProductCategory.query.filter_by(is_active=True)\
            .order_by(ProductCategory.sort_order).all()
        
        result = []
        for cat in categories:
            cat_dict = cat.to_dict()
            
            # Get subcategories for this category
            subcategories = ProductSubCategory.query.filter_by(
                category_id=cat.id,
                is_active=True
            ).order_by(ProductSubCategory.sort_order).all()
            
            cat_dict['subcategories'] = [sub.to_dict() for sub in subcategories]
            cat_dict['product_count'] = Product.query.filter_by(
                category_id=cat.id, 
                is_active=True
            ).count()
            
            result.append(cat_dict)
        
        return jsonify({
            'success': True,
            'categories': result
        })
    except Exception as e:
        current_app.logger.error(f"Get categories error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch categories'}), 500

@product_bp.route('/categories/<int:category_id>', methods=['GET'])
def get_category(category_id):
    """Get single category with subcategories"""
    try:
        category = ProductCategory.query.get(category_id)
        if not category:
            return jsonify({'success': False, 'message': 'Category not found'}), 404
        
        cat_dict = category.to_dict()
        
        # Get subcategories
        subcategories = ProductSubCategory.query.filter_by(
            category_id=category_id, 
            is_active=True
        ).order_by(ProductSubCategory.sort_order).all()
        
        cat_dict['subcategories'] = [sub.to_dict() for sub in subcategories]
        cat_dict['product_count'] = Product.query.filter_by(
            category_id=category_id, 
            is_active=True
        ).count()
        
        return jsonify({
            'success': True,
            'category': cat_dict
        })
    except Exception as e:
        current_app.logger.error(f"Get category error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch category'}), 500

@product_bp.route('/staff/categories', methods=['POST'])
@jwt_required()
def create_category():
    """Create new category (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff', 'manager', 'senior']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('code'):
            return jsonify({'success': False, 'message': 'Category code is required'}), 400
        if not data.get('name'):
            return jsonify({'success': False, 'message': 'Category name is required'}), 400
        
        # Check if category code already exists
        if ProductCategory.query.filter_by(code=data['code']).first():
            return jsonify({'success': False, 'message': 'Category code already exists'}), 400
        
        # Check if category name already exists
        if ProductCategory.query.filter_by(name=data['name']).first():
            return jsonify({'success': False, 'message': 'Category name already exists'}), 400
        
        # Create category
        category = ProductCategory(
            code=data['code'].upper(),
            name=data['name'],
            description=data.get('description', ''),
            sort_order=data.get('sort_order', 0),
            image_url=data.get('image_url'),
            is_active=True
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Category created successfully',
            'category': category.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create category error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to create category'}), 500

@product_bp.route('/staff/categories/<int:category_id>', methods=['PUT'])
@jwt_required()
def update_category(category_id):
    """Update category (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff', 'manager', 'senior']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        category = ProductCategory.query.get(category_id)
        if not category:
            return jsonify({'success': False, 'message': 'Category not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            # Check if name already exists for another category
            existing = ProductCategory.query.filter(
                ProductCategory.name == data['name'],
                ProductCategory.id != category_id
            ).first()
            if existing:
                return jsonify({'success': False, 'message': 'Category name already exists'}), 400
            category.name = data['name']
        
        if 'code' in data:
            # Check if code already exists for another category
            existing = ProductCategory.query.filter(
                ProductCategory.code == data['code'].upper(),
                ProductCategory.id != category_id
            ).first()
            if existing:
                return jsonify({'success': False, 'message': 'Category code already exists'}), 400
            category.code = data['code'].upper()
        
        if 'description' in data:
            category.description = data['description']
        
        if 'sort_order' in data:
            category.sort_order = data['sort_order']
        
        if 'image_url' in data:
            category.image_url = data['image_url']
        
        if 'is_active' in data:
            category.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Category updated successfully',
            'category': category.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update category error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to update category'}), 500

@product_bp.route('/staff/categories/<int:category_id>', methods=['DELETE'])
@jwt_required()
def delete_category(category_id):
    """Delete category (soft delete) - staff only"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff', 'manager', 'senior']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        category = ProductCategory.query.get(category_id)
        if not category:
            return jsonify({'success': False, 'message': 'Category not found'}), 404
        
        # Check if category has products
        product_count = Product.query.filter_by(category_id=category_id, is_active=True).count()
        if product_count > 0:
            return jsonify({
                'success': False, 
                'message': f'Cannot delete category with {product_count} active products. Reassign products first.'
            }), 400
        
        # Soft delete
        category.is_active = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Category deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete category error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to delete category'}), 500

# ==================== SUBCATEGORY MANAGEMENT ROUTES ====================

@product_bp.route('/categories/<int:category_id>/subcategories', methods=['GET'])
def get_subcategories(category_id):
    """Get all subcategories for a category"""
    try:
        subcategories = ProductSubCategory.query.filter_by(
            category_id=category_id,
            is_active=True
        ).order_by(ProductSubCategory.sort_order).all()
        
        return jsonify({
            'success': True,
            'subcategories': [sub.to_dict() for sub in subcategories]
        })
    except Exception as e:
        current_app.logger.error(f"Get subcategories error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch subcategories'}), 500

@product_bp.route('/staff/categories/<int:category_id>/subcategories', methods=['POST'])
@jwt_required()
def create_subcategory(category_id):
    """Create new subcategory (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff', 'manager', 'senior']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Check if category exists and is active
        category = ProductCategory.query.get(category_id)
        if not category or not category.is_active:
            return jsonify({'success': False, 'message': 'Category not found or inactive'}), 404
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('code'):
            return jsonify({'success': False, 'message': 'Subcategory code is required'}), 400
        if not data.get('name'):
            return jsonify({'success': False, 'message': 'Subcategory name is required'}), 400
        
        # Check if subcategory code already exists in this category
        existing = ProductSubCategory.query.filter_by(
            category_id=category_id,
            code=data['code']
        ).first()
        if existing:
            return jsonify({'success': False, 'message': 'Subcategory code already exists in this category'}), 400
        
        # Create subcategory
        subcategory = ProductSubCategory(
            category_id=category_id,
            code=data['code'],
            name=data['name'],
            description=data.get('description', ''),
            sort_order=data.get('sort_order', 0),
            is_active=True
        )
        
        db.session.add(subcategory)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Subcategory created successfully',
            'subcategory': subcategory.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create subcategory error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to create subcategory'}), 500

@product_bp.route('/staff/subcategories/<int:subcategory_id>', methods=['PUT'])
@jwt_required()
def update_subcategory(subcategory_id):
    """Update subcategory (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff', 'manager', 'senior']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        subcategory = ProductSubCategory.query.get(subcategory_id)
        if not subcategory:
            return jsonify({'success': False, 'message': 'Subcategory not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            subcategory.name = data['name']
        
        if 'code' in data:
            # Check if code already exists in this category
            existing = ProductSubCategory.query.filter(
                ProductSubCategory.category_id == subcategory.category_id,
                ProductSubCategory.code == data['code'],
                ProductSubCategory.id != subcategory_id
            ).first()
            if existing:
                return jsonify({'success': False, 'message': 'Subcategory code already exists in this category'}), 400
            subcategory.code = data['code']
        
        if 'description' in data:
            subcategory.description = data['description']
        
        if 'sort_order' in data:
            subcategory.sort_order = data['sort_order']
        
        if 'is_active' in data:
            subcategory.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Subcategory updated successfully',
            'subcategory': subcategory.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update subcategory error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to update subcategory'}), 500

@product_bp.route('/staff/subcategories/<int:subcategory_id>', methods=['DELETE'])
@jwt_required()
def delete_subcategory(subcategory_id):
    """Delete subcategory (soft delete) - staff only"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff', 'manager', 'senior']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        subcategory = ProductSubCategory.query.get(subcategory_id)
        if not subcategory:
            return jsonify({'success': False, 'message': 'Subcategory not found'}), 404
        
        # Check if subcategory has products
        product_count = Product.query.filter_by(subcategory_id=subcategory_id, is_active=True).count()
        if product_count > 0:
            return jsonify({
                'success': False, 
                'message': f'Cannot delete subcategory with {product_count} active products. Reassign products first.'
            }), 400
        
        # Soft delete
        subcategory.is_active = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Subcategory deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete subcategory error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to delete subcategory'}), 500

# ==================== PRODUCT CLASSIFICATION ROUTES ====================

@product_bp.route('/products/classify', methods=['POST'])
@jwt_required()
def classify_product():
    """Classify or reclassify a product"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff', 'manager', 'senior']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        data = request.get_json()
        product_id = data.get('product_id')
        category_id = data.get('category_id')
        subcategory_id = data.get('subcategory_id')
        
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
        
        # Update classification
        if category_id:
            category = ProductCategory.query.get(category_id)
            if not category:
                return jsonify({'success': False, 'message': 'Category not found'}), 404
            product.category_id = category_id
        
        if subcategory_id:
            subcategory = ProductSubCategory.query.get(subcategory_id)
            if not subcategory:
                return jsonify({'success': False, 'message': 'Subcategory not found'}), 404
            # Verify subcategory belongs to the category
            if subcategory.category_id != product.category_id:
                return jsonify({'success': False, 'message': 'Subcategory does not belong to selected category'}), 400
            product.subcategory_id = subcategory_id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Product classified successfully',
            'product': product.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Classify product error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to classify product'}), 500

# ==================== STAFF PRODUCT ROUTES ====================

@product_bp.route('/staff/products', methods=['POST'])
@jwt_required()
def create_product():
    """Create new product (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        data = getattr(g, 'sanitized_json', None) or request.get_json(silent=True)
        print(f"DEBUG: Creating product with data: {data}")
        try:
            data = CreateProductSchema().load(data or {})
        except ValidationError as ve:
            return jsonify({'success': False, 'message': 'Invalid input', 'errors': ve.messages}), 400
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'success': False, 'message': 'name is required'}), 400
        if not data.get('category_id'):
            return jsonify({'success': False, 'message': 'category_id is required'}), 400
        
        # Handle price/selling_price mapping
        selling_price = data.get('selling_price') or data.get('price')
        if not selling_price:
            return jsonify({'success': False, 'message': 'selling_price or price is required'}), 400
        
        # FIX: Handle empty subcategory_id - convert to None (NULL in database)
        subcategory_id = data.get('subcategory_id')
        if subcategory_id == '' or subcategory_id is None:
            subcategory_id = None
        else:
            try:
                subcategory_id = int(subcategory_id)
            except (ValueError, TypeError):
                subcategory_id = None
        
        # Auto-generate SKU if not provided
        sku = data.get('sku')
        if not sku:
            # Get category for SKU generation
            category = ProductCategory.query.get(data['category_id'])
            category_code = category.code if category else 'GEN'
            name_prefix = data['name'][:4].upper().replace(' ', '')
            timestamp = datetime.now().strftime('%Y%m%d%H%M')
            sku = f"{category_code}-{name_prefix}-{timestamp}"
        
        # Check if SKU exists
        if Product.query.filter_by(sku=sku).first():
            import random
            sku = f"{sku}-{random.randint(100, 999)}"
        
        print(f"DEBUG: Generated SKU: {sku}")
        print(f"DEBUG: Subcategory ID (converted): {subcategory_id}")
        
        # Create product - use converted subcategory_id
        product = Product(
            sku=sku,
            name=data['name'],
            description=data.get('description', ''),
            category_id=data['category_id'],
            subcategory_id=subcategory_id,
            price=selling_price,
            selling_price=selling_price,
            cost_price=data.get('cost_price'),
            stock_quantity=data.get('stock_quantity', 0),
            min_stock_level=data.get('min_stock_level', 10),
            barcode=data.get('barcode'),
            image_urls=data.get('image_urls', []),
            video_urls=data.get('video_urls', []),  # Added video support
            specifications=data.get('specifications', {}),
            is_on_offer=data.get('is_on_offer', False),
            offer_price=data.get('offer_price'),
            discount_percentage=data.get('discount_percentage'),
            brand=data.get('brand'),
            model=data.get('model'),
            color=data.get('color'),
            size=data.get('size'),
            material=data.get('material'),
            unit_of_measure=data.get('unit_of_measure', 'pcs')
        )
        
        db.session.add(product)
        db.session.commit()
        
        print(f"DEBUG: Product created successfully with ID: {product.id}")
        
        return jsonify({
            'success': True,
            'message': 'Product created successfully',
            'product': product.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR creating product: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@product_bp.route('/staff/products/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    """Update product (staff only)"""
    try:
        print(f"\n{'='*50}")
        print(f"DEBUG: Update product endpoint called for ID: {product_id}")
        
        user_id = get_jwt_identity()
        print(f"DEBUG: User ID from token: {user_id}")
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
        if user.role not in ['admin', 'staff', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        product = Product.query.get(product_id)
        if not product:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
            
        print(f"DEBUG: Found product: {product.name} (SKU: {product.sku})")
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
            
        print(f"DEBUG: Received update data: {data}")
        
        # Update fields - handle both price and selling_price
        updatable_fields = [
            'name', 'description', 'category_id', 'subcategory_id',
            'cost_price', 'stock_quantity', 'min_stock_level',
            'barcode', 'image_urls', 'video_urls', 'specifications', 'is_active',
            'is_on_offer', 'offer_price', 'discount_percentage',
            'brand', 'model', 'color', 'size', 'material', 'unit_of_measure'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(product, field, data[field])
        
        # Handle price/selling_price separately
        if 'price' in data:
            product.selling_price = data['price']
        if 'selling_price' in data:
            product.selling_price = data['selling_price']
        
        db.session.commit()
        print(f"DEBUG: Product updated successfully")
        print(f"{'='*50}\n")
        
        return jsonify({
            'success': True,
            'message': 'Product updated successfully',
            'product': product.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"ERROR: Exception in update_product: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@product_bp.route('/staff/inventory/update', methods=['POST'])
@jwt_required()
def update_inventory():
    """Update product inventory (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        data = request.get_json()
        product_id = data.get('product_id')
        adjustment = data.get('adjustment')
        notes = data.get('notes', '')
        
        if not product_id or adjustment is None:
            return jsonify({'success': False, 'message': 'Product ID and adjustment required'}), 400
        
        product = Product.query.get_or_404(product_id)
        
        # Update stock
        new_quantity = product.stock_quantity + adjustment
        if new_quantity < 0:
            return jsonify({'success': False, 'message': 'Cannot set negative stock'}), 400
        
        product.stock_quantity = new_quantity
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Inventory updated',
            'product': product.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@product_bp.route('/staff/products/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    """Delete product (soft delete)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        product = Product.query.get_or_404(product_id)
        
        # Soft delete
        product.is_active = False
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Product deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# ==================== SEARCH ENDPOINTS ====================

@product_bp.route('/products/search', methods=['GET'])
def search_products():
    """Advanced product search with filters"""
    try:
        search_term = request.args.get('q', '')
        category_id = request.args.get('category_id')
        subcategory_id = request.args.get('subcategory_id')
        min_price = request.args.get('min_price')
        max_price = request.args.get('max_price')
        in_stock = request.args.get('in_stock')
        
        query = Product.query.filter_by(is_active=True)
        
        if search_term:
            query = query.filter(
                db.or_(
                    Product.name.ilike(f'%{search_term}%'),
                    Product.sku.ilike(f'%{search_term}%'),
                    Product.description.ilike(f'%{search_term}%'),
                    Product.barcode.ilike(f'%{search_term}%'),
                    Product.brand.ilike(f'%{search_term}%')
                )
            )
        
        if category_id:
            query = query.filter_by(category_id=category_id)
        
        if subcategory_id:
            query = query.filter_by(subcategory_id=subcategory_id)
        
        if min_price:
            query = query.filter(Product.selling_price >= float(min_price))
        
        if max_price:
            query = query.filter(Product.selling_price <= float(max_price))
        
        if in_stock and in_stock.lower() == 'true':
            query = query.filter(Product.stock_quantity > 0)
        
        products = query.order_by(Product.name).limit(50).all()
        
        return jsonify({
            'success': True,
            'products': [product.to_dict() for product in products],
            'count': len(products)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Search products error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to search products'}), 500

# ==================== SERVE UPLOADS ====================

@product_bp.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Serve uploaded files"""
    try:
        return send_from_directory(
            os.path.join(current_app.root_path, 'static', 'uploads'),
            filename
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@product_bp.route('/uploads/<folder>/<path:filename>')
def serve_folder_upload(folder, filename):
    """Serve uploaded files from specific folder"""
    try:
        return send_from_directory(
            os.path.join(current_app.root_path, 'static', 'uploads', folder),
            filename
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 404

# Error handlers
@product_bp.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Resource not found'}), 404

@product_bp.errorhandler(500)
def internal_error(error):
    current_app.logger.error(f'Server Error: {error}')
    return jsonify({'success': False, 'message': 'Internal server error'}), 500