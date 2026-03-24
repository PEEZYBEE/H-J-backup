from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from models import db
from models import Notification, Product, User

notification_bp = Blueprint('notifications', __name__)


def _generate_low_stock_notifications(user_id):
    """Check products and create notifications for low/out-of-stock items.
    Only creates a new notification if one hasn't been sent for the same product in the last 24h."""
    low_stock_products = Product.query.filter(
        Product.is_active == True,
        Product.stock_quantity <= Product.min_stock_level
    ).all()

    cutoff = datetime.utcnow() - timedelta(hours=24)
    created = 0

    # Fetch recent notifications for this user to avoid duplicates
    recent = Notification.query.filter(
        Notification.recipient_id == user_id,
        Notification.type.in_(['low_stock', 'out_of_stock']),
        Notification.created_at >= cutoff
    ).all()
    recent_product_ids = set()
    for n in recent:
        if n.data and 'product_id' in n.data:
            recent_product_ids.add((n.data['product_id'], n.type))

    for product in low_stock_products:
        ntype = 'out_of_stock' if product.stock_quantity == 0 else 'low_stock'

        if (product.id, ntype) in recent_product_ids:
            continue

        if product.stock_quantity == 0:
            title = f'{product.name} is out of stock!'
            message = f'{product.name} (SKU: {product.sku}) has 0 units remaining. Reorder immediately.'
        else:
            title = f'{product.name} is running low'
            message = (
                f'{product.name} (SKU: {product.sku}) has {product.stock_quantity} units left '
                f'(threshold: {product.min_stock_level}).'
            )

        notification = Notification(
            recipient_id=user_id,
            type=ntype,
            title=title,
            message=message,
            data={'product_id': product.id, 'sku': product.sku, 'stock': product.stock_quantity,
                  'threshold': product.min_stock_level}
        )
        db.session.add(notification)
        created += 1

    if created:
        db.session.commit()

    return created


@notification_bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get current user's notifications with optional filters."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Auto-generate low stock alerts for staff roles
        if user.role in ('admin', 'manager', 'senior', 'receiver'):
            _generate_low_stock_notifications(user_id)

        unread_only = request.args.get('unread', '').lower() == 'true'
        ntype = request.args.get('type')
        limit = min(int(request.args.get('limit', 50)), 100)

        query = Notification.query.filter_by(recipient_id=user_id)

        if unread_only:
            query = query.filter_by(is_read=False)
        if ntype:
            query = query.filter_by(type=ntype)

        notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
        unread_count = Notification.query.filter_by(recipient_id=user_id, is_read=False).count()

        return jsonify({
            'notifications': [n.to_dict() for n in notifications],
            'unread_count': unread_count
        }), 200
    except Exception as e:
        current_app.logger.exception(f"Error fetching notifications: {str(e)}")
        return jsonify({'error': 'Failed to fetch notifications'}), 500


@notification_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_read(notification_id):
    """Mark a single notification as read."""
    user_id = get_jwt_identity()
    notification = Notification.query.filter_by(id=notification_id, recipient_id=user_id).first()
    if not notification:
        return jsonify({'error': 'Notification not found'}), 404

    notification.is_read = True
    db.session.commit()
    return jsonify({'message': 'Marked as read'}), 200


@notification_bp.route('/notifications/read-all', methods=['POST'])
@jwt_required()
def mark_all_read():
    """Mark all of the current user's notifications as read."""
    user_id = get_jwt_identity()
    Notification.query.filter_by(recipient_id=user_id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All notifications marked as read'}), 200


@notification_bp.route('/notifications/low-stock', methods=['GET'])
@jwt_required()
def get_low_stock_alerts():
    """Get current low-stock products directly (no notification model needed)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role not in ('admin', 'manager', 'senior', 'receiver'):
        return jsonify({'error': 'Unauthorized'}), 403

    products = Product.query.filter(
        Product.is_active == True,
        Product.stock_quantity <= Product.min_stock_level
    ).order_by(Product.stock_quantity.asc()).all()

    out_of_stock = [p for p in products if p.stock_quantity == 0]
    low_stock = [p for p in products if p.stock_quantity > 0]

    return jsonify({
        'low_stock': [p.to_dict() for p in low_stock],
        'out_of_stock': [p.to_dict() for p in out_of_stock],
        'low_stock_count': len(low_stock),
        'out_of_stock_count': len(out_of_stock),
        'total_alerts': len(products)
    }), 200
