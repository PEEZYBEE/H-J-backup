from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Wishlist, WishlistItem, Product, Cart, CartItem

wishlist_bp = Blueprint('wishlist', __name__)

@wishlist_bp.route('/wishlist', methods=['GET'])
@jwt_required()
def get_wishlist():
    """Get user's wishlist"""
    try:
        user_id = get_jwt_identity()
        wishlist = Wishlist.query.filter_by(user_id=user_id).first()
        
        if not wishlist:
            wishlist = Wishlist(user_id=user_id)
            from models import db
            db.session.add(wishlist)
            db.session.commit()
        
        return jsonify(wishlist.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@wishlist_bp.route('/wishlist/add', methods=['POST'])
@jwt_required()
def add_to_wishlist():
    """Add product to wishlist"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        product_id = data.get('product_id')
        
        if not product_id:
            return jsonify({'error': 'Product ID is required'}), 400
        
        product = Product.query.get_or_404(product_id)
        
        # Get or create wishlist
        wishlist = Wishlist.query.filter_by(user_id=user_id).first()
        if not wishlist:
            wishlist = Wishlist(user_id=user_id)
            from models import db
            db.session.add(wishlist)
            db.session.flush()
        
        # Check if already in wishlist
        existing_item = WishlistItem.query.filter_by(
            wishlist_id=wishlist.id,
            product_id=product_id
        ).first()
        
        if existing_item:
            return jsonify({
                'message': 'Product already in wishlist',
                'wishlist': wishlist.to_dict()
            }), 200
        
        # Add to wishlist
        wishlist_item = WishlistItem(
            wishlist_id=wishlist.id,
            product_id=product_id
        )
        from models import db
        db.session.add(wishlist_item)
        db.session.commit()
        
        return jsonify({
            'message': 'Added to wishlist',
            'wishlist': wishlist.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@wishlist_bp.route('/wishlist/remove/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_wishlist(item_id):
    """Remove item from wishlist"""
    try:
        user_id = get_jwt_identity()
        wishlist_item = WishlistItem.query.get_or_404(item_id)
        wishlist = Wishlist.query.get_or_404(wishlist_item.wishlist_id)
        
        # Check authorization
        if wishlist.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        from models import db
        db.session.delete(wishlist_item)
        db.session.commit()
        
        return jsonify({
            'message': 'Removed from wishlist',
            'wishlist': wishlist.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@wishlist_bp.route('/wishlist/move-to-cart/<int:item_id>', methods=['POST'])
@jwt_required()
def move_to_cart(item_id):
    """Move wishlist item to cart"""
    try:
        user_id = get_jwt_identity()
        
        wishlist_item = WishlistItem.query.get_or_404(item_id)
        wishlist = Wishlist.query.get_or_404(wishlist_item.wishlist_id)
        
        # Check authorization
        if wishlist.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get or create cart
        cart = Cart.query.filter_by(user_id=user_id).first()
        if not cart:
            cart = Cart(user_id=user_id)
            from models import db
            db.session.add(cart)
            db.session.flush()
        
        # Check if already in cart
        existing_cart_item = CartItem.query.filter_by(
            cart_id=cart.id,
            product_id=wishlist_item.product_id
        ).first()
        
        product = Product.query.get(wishlist_item.product_id)
        
        if existing_cart_item:
            # Check stock before adding
            if existing_cart_item.quantity + 1 > product.stock_quantity:
                return jsonify({
                    'error': f'Only {product.stock_quantity} items available'
                }), 400
            existing_cart_item.quantity += 1
        else:
            # Check stock
            if product.stock_quantity < 1:
                return jsonify({'error': 'Product out of stock'}), 400
            
            cart_item = CartItem(
                cart_id=cart.id,
                product_id=wishlist_item.product_id,
                quantity=1
            )
            from models import db
            db.session.add(cart_item)
        
        # Remove from wishlist
        from models import db
        db.session.delete(wishlist_item)
        db.session.commit()
        
        return jsonify({
            'message': 'Moved to cart',
            'cart': cart.to_dict(),
            'wishlist': wishlist.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500