from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func
from models import Order, Product, User, InventoryTransaction, ProductCategory

staff_bp = Blueprint('staff', __name__)

# ==================== DASHBOARD ====================

@staff_bp.route('/staff/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    """Get staff dashboard data"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Today's date range
        today = datetime.now().date()
        start_date = datetime.combine(today, datetime.min.time())
        end_date = datetime.combine(today, datetime.max.time())
        
        # Pending orders count
        pending_orders = Order.query.filter_by(order_status='confirmed').count()
        
        # Today's orders
        today_orders = Order.query.filter(
            Order.created_at >= start_date,
            Order.created_at <= end_date
        ).count()
        
        # Today's revenue
        from models import db
        today_revenue_result = db.session.query(
            func.sum(Order.total_amount)
        ).filter(
            Order.created_at >= start_date,
            Order.created_at <= end_date,
            Order.payment_status == 'paid'
        ).first()
        
        today_revenue = float(today_revenue_result[0]) if today_revenue_result[0] else 0
        
        # Low stock products
        low_stock = Product.query.filter(
            Product.stock_quantity <= Product.min_stock_level
        ).count()
        
        # Recent orders
        recent_orders = Order.query.order_by(
            Order.created_at.desc()
        ).limit(10).all()
        
        return jsonify({
            'stats': {
                'pending_orders': pending_orders,
                'today_orders': today_orders,
                'today_revenue': today_revenue,
                'low_stock': low_stock
            },
            'recent_orders': [order.to_dict() for order in recent_orders]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== ORDER MANAGEMENT ====================

@staff_bp.route('/staff/orders', methods=['GET'])
@jwt_required()
def get_all_orders():
    """Get all orders with filters (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        status = request.args.get('status')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        limit = request.args.get('limit', 50)
        offset = request.args.get('offset', 0)
        
        query = Order.query
        
        if status:
            query = query.filter_by(order_status=status)
        
        if date_from:
            query = query.filter(Order.created_at >= date_from)
        
        if date_to:
            query = query.filter(Order.created_at <= date_to)
        
        total = query.count()
        orders = query.order_by(Order.created_at.desc())\
                     .offset(int(offset))\
                     .limit(int(limit))\
                     .all()
        
        return jsonify({
            'orders': [order.to_dict() for order in orders],
            'total': total,
            'offset': int(offset),
            'limit': int(limit)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@staff_bp.route('/staff/orders/<string:order_number>/update-status', methods=['PUT'])
@jwt_required()
def update_order_status(order_number):
    """Update order status (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        order = Order.query.filter_by(order_number=order_number).first_or_404()
        data = request.get_json()
        
        new_status = data.get('status')
        notes = data.get('notes', '')
        
        if not new_status:
            return jsonify({'error': 'Status is required'}), 400
        
        valid_statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
        if new_status not in valid_statuses:
            return jsonify({'error': 'Invalid status'}), 400
        
        # Update status
        old_status = order.order_status
        order.order_status = new_status
        
        if notes:
            order.notes = notes if not order.notes else f"{order.notes}\n{notes}"
        
        # If shipping, update tracking if provided
        if new_status == 'shipped' and data.get('tracking_number'):
            order.notes = f"{order.notes}\nTracking: {data['tracking_number']}" if order.notes else f"Tracking: {data['tracking_number']}"
        
        from models import db
        db.session.commit()
        
        return jsonify({
            'message': f'Order status updated from {old_status} to {new_status}',
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==================== INVENTORY MANAGEMENT ====================

@staff_bp.route('/staff/inventory', methods=['GET'])
@jwt_required()
def get_inventory():
    """Get inventory overview (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        low_stock = request.args.get('low_stock')
        category_id = request.args.get('category_id')
        
        query = Product.query
        
        if low_stock and low_stock.lower() == 'true':
            query = query.filter(
                Product.stock_quantity <= Product.min_stock_level
            )
        
        if category_id:
            query = query.filter_by(category_id=category_id)
        
        products = query.all()
        
        total_value = 0
        for product in products:
            if product.cost_price and product.stock_quantity:
                total_value += float(product.cost_price) * product.stock_quantity
        
        return jsonify({
            'products': [product.to_dict() for product in products],
            'total_items': len(products),
            'total_value': total_value,
            'low_stock_count': Product.query.filter(
                Product.stock_quantity <= Product.min_stock_level
            ).count()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@staff_bp.route('/staff/inventory/adjust', methods=['POST'])
@jwt_required()
def adjust_inventory():
    """Adjust inventory quantity (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.get_json()
        product_id = data.get('product_id')
        adjustment = data.get('adjustment')
        reason = data.get('reason', 'Manual adjustment')
        
        if not product_id or adjustment is None:
            return jsonify({'error': 'Product ID and adjustment required'}), 400
        
        product = Product.query.get_or_404(product_id)
        
        new_quantity = product.stock_quantity + adjustment
        if new_quantity < 0:
            return jsonify({'error': 'Cannot set negative stock'}), 400
        
        # Update stock
        old_quantity = product.stock_quantity
        product.stock_quantity = new_quantity
        
        # Create inventory transaction
        transaction = InventoryTransaction(
            product_id=product_id,
            quantity=adjustment,
            transaction_type='adjustment',
            notes=f'{reason}. Old: {old_quantity}, New: {new_quantity}',
            created_by=user_id
        )
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'message': 'Inventory adjusted',
            'product': product.to_dict(),
            'adjustment': adjustment,
            'old_quantity': old_quantity,
            'new_quantity': new_quantity
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==================== REPORTING ====================

@staff_bp.route('/staff/reports/sales', methods=['GET'])
@jwt_required()
def get_sales_report():
    """Get sales report (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        period = request.args.get('period', 'today')  # today, week, month, year
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Set date range
        now = datetime.now()
        
        if period == 'today':
            start_date = datetime.combine(now.date(), datetime.min.time())
            end_date = datetime.combine(now.date(), datetime.max.time())
        elif period == 'week':
            start_date = now - timedelta(days=now.weekday())
            start_date = datetime.combine(start_date.date(), datetime.min.time())
            end_date = datetime.combine(now.date(), datetime.max.time())
        elif period == 'month':
            start_date = datetime(now.year, now.month, 1)
            end_date = datetime.combine(now.date(), datetime.max.time())
        elif period == 'year':
            start_date = datetime(now.year, 1, 1)
            end_date = datetime.combine(now.date(), datetime.max.time())
        else:
            if date_from and date_to:
                start_date = datetime.strptime(date_from, '%Y-%m-%d')
                end_date = datetime.strptime(date_to, '%Y-%m-%d')
                end_date = datetime.combine(end_date.date(), datetime.max.time())
            else:
                start_date = now - timedelta(days=30)
                end_date = now
        
        # Get orders in date range
        orders = Order.query.filter(
            Order.created_at >= start_date,
            Order.created_at <= end_date,
            Order.payment_status == 'paid'
        ).all()
        
        # Calculate metrics
        total_sales = sum(float(order.total_amount) for order in orders)
        total_orders = len(orders)
        avg_order_value = total_sales / total_orders if total_orders > 0 else 0
        
        # Get top products
        product_sales = {}
        for order in orders:
            for item in order.order_items:
                product_id = item.product_id
                if product_id not in product_sales:
                    product_sales[product_id] = {
                        'quantity': 0,
                        'revenue': 0
                    }
                product_sales[product_id]['quantity'] += item.quantity
                product_sales[product_id]['revenue'] += float(item.total_price)
        
        # Sort products by revenue
        top_products = sorted(
            [(pid, data) for pid, data in product_sales.items()],
            key=lambda x: x[1]['revenue'],
            reverse=True
        )[:10]
        
        # Add product details
        top_products_details = []
        for pid, data in top_products:
            product = Product.query.get(pid)
            if product:
                top_products_details.append({
                    'product': product.to_dict(),
                    'quantity_sold': data['quantity'],
                    'revenue': data['revenue']
                })
        
        return jsonify({
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'summary': {
                'total_sales': total_sales,
                'total_orders': total_orders,
                'average_order_value': avg_order_value
            },
            'top_products': top_products_details,
            'orders': [order.to_dict() for order in orders]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@staff_bp.route('/staff/reports/inventory', methods=['GET'])
@jwt_required()
def get_inventory_report():
    """Get inventory report (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get low stock items
        low_stock = Product.query.filter(
            Product.stock_quantity <= Product.min_stock_level
        ).all()
        
        # Get out of stock items
        out_of_stock = Product.query.filter(
            Product.stock_quantity == 0
        ).all()
        
        # Calculate inventory value by category
        categories = ProductCategory.query.all()
        category_value = []
        
        for category in categories:
            total_value = 0
            total_items = 0
            
            for product in category.products:
                if product.cost_price and product.stock_quantity:
                    total_value += float(product.cost_price) * product.stock_quantity
                    total_items += product.stock_quantity
            
            if total_items > 0:
                category_value.append({
                    'category': category.to_dict(),
                    'total_value': total_value,
                    'total_items': total_items,
                    'product_count': len(category.products)
                })
        
        return jsonify({
            'low_stock': [product.to_dict() for product in low_stock],
            'out_of_stock': [product.to_dict() for product in out_of_stock],
            'category_value': category_value,
            'summary': {
                'low_stock_count': len(low_stock),
                'out_of_stock_count': len(out_of_stock),
                'total_categories': len(categories)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500