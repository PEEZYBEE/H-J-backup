from flask import Blueprint, request, jsonify, session
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import random
import string
from models import Cart, CartItem, Product

cart_bp = Blueprint('cart', __name__)

def generate_session_id():
    """Generate session ID for guest users"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=32))

def get_or_create_cart():
    """Get existing cart or create new one"""
    if 'cart_id' in session:
        cart = Cart.query.get(session['cart_id'])
        if cart:
            return cart
    
    # Create new cart
    cart = Cart()
    if session.get('user_id'):
        cart.user_id = session['user_id']
    cart.session_id = session.get('session_id', generate_session_id())
    from models import db
    db.session.add(cart)
    db.session.commit()
    
    session['cart_id'] = cart.id
    return cart

@cart_bp.route('/cart', methods=['GET'])
def get_cart():
    """Get current cart"""
    try:
        cart = get_or_create_cart()
        return jsonify(cart.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cart_bp.route('/cart/add', methods=['POST'])
def add_to_cart():
    """Add product to cart"""
    try:
        data = request.get_json()
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)
        
        if not product_id:
            return jsonify({'error': 'Product ID is required'}), 400
        
        product = Product.query.get_or_404(product_id)
        
        # Check stock availability
        if product.stock_quantity < quantity:
            return jsonify({
                'error': f'Only {product.stock_quantity} items available',
                'available_stock': product.stock_quantity
            }), 400
        
        cart = get_or_create_cart()
        
        # Check if product already in cart
        cart_item = CartItem.query.filter_by(
            cart_id=cart.id, 
            product_id=product_id
        ).first()
        
        if cart_item:
            new_quantity = cart_item.quantity + quantity
            if new_quantity > product.stock_quantity:
                return jsonify({
                    'error': f'Cannot add {quantity} more. Only {product.stock_quantity - cart_item.quantity} available'
                }), 400
            cart_item.quantity = new_quantity
        else:
            cart_item = CartItem(
                cart_id=cart.id, 
                product_id=product_id, 
                quantity=quantity
            )
            from models import db
            db.session.add(cart_item)

            db.session.commit()
        return jsonify(cart.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cart_bp.route('/cart/update/<int:item_id>', methods=['PUT'])
def update_cart_item(item_id):
    """Update cart item quantity"""
    try:
        data = request.get_json()
        quantity = data.get('quantity')
        
        if quantity is None or quantity < 1:
            return jsonify({'error': 'Quantity must be at least 1'}), 400
        
        cart_item = CartItem.query.get_or_404(item_id)
        cart = Cart.query.get_or_404(cart_item.cart_id)
        
        # Authorization check
        if session.get('user_id') and cart.user_id and cart.user_id != session.get('user_id'):
            return jsonify({'error': 'Unauthorized'}), 403
        
        product = Product.query.get(cart_item.product_id)
        if product.stock_quantity < quantity:
            return jsonify({
                'error': f'Only {product.stock_quantity} items available'
            }), 400
        
        cart_item.quantity = quantity
        from models import db
        db.session.commit()
        
        return jsonify(cart.to_dict()), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cart_bp.route('/cart/remove/<int:item_id>', methods=['DELETE'])
def remove_cart_item(item_id):
    """Remove item from cart"""
    try:
        cart_item = CartItem.query.get_or_404(item_id)
        cart = Cart.query.get_or_404(cart_item.cart_id)
        
        # Authorization check
        if session.get('user_id') and cart.user_id and cart.user_id != session.get('user_id'):
            return jsonify({'error': 'Unauthorized'}), 403
        
        db.session.delete(cart_item)
        from models import db
        db.session.commit()
        
        return jsonify({
            'message': 'Item removed from cart',
            'cart': cart.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cart_bp.route('/cart/clear', methods=['DELETE'])
def clear_cart():
    """Clear all items from cart"""
    try:
        cart = get_or_create_cart()
        
        # Authorization check
        if session.get('user_id') and cart.user_id and cart.user_id != session.get('user_id'):
            return jsonify({'error': 'Unauthorized'}), 403
        
        from models import db
        CartItem.query.filter_by(cart_id=cart.id).delete()
        db.session.commit()
        
        return jsonify({
            'message': 'Cart cleared',
            'cart': cart.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@cart_bp.route('/cart/merge', methods=['POST'])
@jwt_required()
def merge_cart():
    """Merge guest cart with user cart after login"""
    try:
        user_id = get_jwt_identity()
        
        if 'cart_id' not in session:
            return jsonify({'message': 'No guest cart to merge'}), 200
        
        guest_cart = Cart.query.get(session['cart_id'])
        if not guest_cart:
            return jsonify({'message': 'No guest cart found'}), 200
        
        # Find or create user cart
        user_cart = Cart.query.filter_by(user_id=user_id).first()
        if not user_cart:
            user_cart = Cart(user_id=user_id)
            db.session.add(user_cart)
            db.session.flush()
        
        # Merge items
        for guest_item in guest_cart.items:
            existing_item = CartItem.query.filter_by(
                cart_id=user_cart.id,
                product_id=guest_item.product_id
            ).first()
            
            if existing_item:
                existing_item.quantity += guest_item.quantity
            else:
                new_item = CartItem(
                    cart_id=user_cart.id,
                    product_id=guest_item.product_id,
                    quantity=guest_item.quantity
                )
                db.session.add(new_item)
        
        # Delete guest cart
        CartItem.query.filter_by(cart_id=guest_cart.id).delete()
        db.session.delete(guest_cart)
        db.session.commit()
        
        session.pop('cart_id', None)
        
        return jsonify({
            'message': 'Cart merged successfully',
            'cart': user_cart.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500