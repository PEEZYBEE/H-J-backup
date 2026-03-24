from flask import Blueprint, request, jsonify, make_response, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from io import BytesIO
import random
import string
import re
from models import db
from utils.schemas import CreateOrderSchema
from marshmallow import ValidationError
from models import Order, OrderItem, Product, User, Cart, CartItem, InventoryTransaction, Payment
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

order_bp = Blueprint('orders', __name__)

SHOP_NAME = 'HNJ'
SHOP_PHONE = '+254714753950'
SHOP_EMAIL = 'hnjcollection1@gmail.com'


def _to_float(value):
    return float(value) if value is not None else 0.0


def _normalize_phone(phone):
    digits = ''.join(ch for ch in (phone or '') if ch.isdigit())
    if not digits:
        return ''
    if digits.startswith('0') and len(digits) == 10:
        return f"254{digits[1:]}"
    if digits.startswith('254') and len(digits) == 12:
        return digits
    return digits


def _extract_delivery_mode(order):
    """Infer delivery mode from notes/address text captured at checkout."""
    source_text = f"{order.notes or ''} {order.shipping_address or ''}"
    mode_match = re.search(r'Delivery:\s*([^\(\).\-]+)', source_text, re.IGNORECASE)
    if mode_match:
        return mode_match.group(1).strip()

    if ' via ' in source_text.lower():
        via_match = re.search(r'via\s+([^\.\n,]+)', source_text, re.IGNORECASE)
        if via_match:
            return via_match.group(1).strip()

    return 'Not specified'


def _extract_destination(order):
    """Infer destination from shipping address text."""
    address_text = (order.shipping_address or '').strip()
    if not address_text:
        return 'Not specified'

    # Checkout currently stores county/city first, then delivery metadata.
    destination = address_text.split('Delivery:')[0].strip().rstrip('.,')
    return destination or address_text


def _draw_footer(pdf, page_width, margin, y):
    pdf.setLineWidth(0.5)
    pdf.line(margin, y + 10, page_width - margin, y + 10)
    pdf.setFont('Helvetica-Bold', 10)
    pdf.drawString(margin, y - 5, SHOP_NAME)
    pdf.setFont('Helvetica', 9)
    pdf.drawString(margin, y - 20, f'Phone: {SHOP_PHONE}')
    pdf.drawString(margin, y - 34, f'Email: {SHOP_EMAIL}')


def _check_order_doc_access(order):
    """Allow owner/admin/staff, or guest customer who provides matching phone."""
    user_id = get_jwt_identity()
    if user_id:
        user = User.query.get(user_id)
        if order.user_id == user_id or (user and user.role in ['admin', 'staff']):
            return True

    provided_phone = _normalize_phone(request.args.get('phone'))
    customer_phone = _normalize_phone(order.customer_phone)
    if provided_phone and customer_phone and provided_phone == customer_phone:
        return True

    return False


def _build_invoice_pdf(order):
    subtotal = _to_float(order.subtotal)
    shipping = _to_float(order.shipping_cost)
    tax = _to_float(order.tax_amount)
    discount = _to_float(order.discount_amount)
    total = _to_float(order.total_amount)

    buffer = BytesIO()
    page_width, page_height = A4
    margin = 40
    y = page_height - margin
    pdf = canvas.Canvas(buffer, pagesize=A4)

    pdf.setFont('Helvetica-Bold', 18)
    pdf.drawString(margin, y, SHOP_NAME)
    pdf.setFont('Helvetica-Bold', 14)
    pdf.drawString(margin, y - 26, 'INVOICE')

    pdf.setFont('Helvetica', 10)
    right_x = page_width - 220
    pdf.drawString(right_x, y, f'Invoice #: {order.order_number}')
    pdf.drawString(right_x, y - 14, f"Date: {order.created_at.strftime('%Y-%m-%d %H:%M') if order.created_at else '-'}")
    pdf.drawString(right_x, y - 28, f'Status: {order.order_status or "pending"}')

    y -= 70
    pdf.setFont('Helvetica-Bold', 11)
    pdf.drawString(margin, y, 'Customer Details')
    pdf.setFont('Helvetica', 10)
    y -= 16
    pdf.drawString(margin, y, f'Name: {order.customer_name or "-"}')
    y -= 14
    pdf.drawString(margin, y, f'Phone: {order.customer_phone or "-"}')
    y -= 14
    pdf.drawString(margin, y, f'Address: {order.shipping_address or "-"}')

    y -= 28
    col_x = [margin, margin + 30, margin + 260, margin + 320, margin + 410]
    pdf.setFont('Helvetica-Bold', 10)
    pdf.drawString(col_x[0], y, '#')
    pdf.drawString(col_x[1], y, 'Product')
    pdf.drawString(col_x[2], y, 'Qty')
    pdf.drawString(col_x[3], y, 'Unit Price')
    pdf.drawString(col_x[4], y, 'Line Total')
    y -= 8
    pdf.line(margin, y, page_width - margin, y)

    pdf.setFont('Helvetica', 10)
    for idx, item in enumerate(order.order_items, start=1):
        if y < 120:
            _draw_footer(pdf, page_width, margin, 70)
            pdf.showPage()
            y = page_height - margin
            pdf.setFont('Helvetica-Bold', 10)
            pdf.drawString(col_x[0], y, '#')
            pdf.drawString(col_x[1], y, 'Product')
            pdf.drawString(col_x[2], y, 'Qty')
            pdf.drawString(col_x[3], y, 'Unit Price')
            pdf.drawString(col_x[4], y, 'Line Total')
            y -= 8
            pdf.line(margin, y, page_width - margin, y)
            pdf.setFont('Helvetica', 10)

        y -= 16
        product_name = item.product.name if item.product else f'Product #{item.product_id}'
        pdf.drawString(col_x[0], y, str(idx))
        pdf.drawString(col_x[1], y, product_name[:35])
        pdf.drawString(col_x[2], y, str(item.quantity))
        pdf.drawRightString(col_x[3] + 70, y, f'KES {_to_float(item.unit_price):,.2f}')
        pdf.drawRightString(col_x[4] + 90, y, f'KES {_to_float(item.total_price):,.2f}')

    y -= 24
    totals_x_label = page_width - 220
    totals_x_value = page_width - margin
    pdf.setFont('Helvetica', 10)
    pdf.drawString(totals_x_label, y, 'Subtotal')
    pdf.drawRightString(totals_x_value, y, f'KES {subtotal:,.2f}')
    y -= 14
    pdf.drawString(totals_x_label, y, 'Shipping')
    pdf.drawRightString(totals_x_value, y, f'KES {shipping:,.2f}')
    y -= 14
    pdf.drawString(totals_x_label, y, 'Tax')
    pdf.drawRightString(totals_x_value, y, f'KES {tax:,.2f}')
    y -= 14
    pdf.drawString(totals_x_label, y, 'Discount')
    pdf.drawRightString(totals_x_value, y, f'- KES {discount:,.2f}')
    y -= 16
    pdf.setFont('Helvetica-Bold', 11)
    pdf.drawString(totals_x_label, y, 'Total Amount')
    pdf.drawRightString(totals_x_value, y, f'KES {total:,.2f}')

    _draw_footer(pdf, page_width, margin, 70)
    pdf.save()
    return buffer.getvalue()


def _build_delivery_note_pdf(order):
    destination = _extract_destination(order)
    mode = _extract_delivery_mode(order)

    buffer = BytesIO()
    page_width, page_height = A4
    margin = 40
    y = page_height - margin
    pdf = canvas.Canvas(buffer, pagesize=A4)

    pdf.setFont('Helvetica-Bold', 18)
    pdf.drawString(margin, y, SHOP_NAME)
    pdf.setFont('Helvetica-Bold', 14)
    pdf.drawString(margin, y - 26, 'DELIVERY NOTE')

    pdf.setFont('Helvetica', 10)
    right_x = page_width - 220
    pdf.drawString(right_x, y, f'Order #: {order.order_number}')
    pdf.drawString(right_x, y - 14, f"Date: {order.created_at.strftime('%Y-%m-%d %H:%M') if order.created_at else '-'}")

    y -= 70
    pdf.setFont('Helvetica-Bold', 11)
    pdf.drawString(margin, y, 'Delivery Details')
    pdf.setFont('Helvetica', 10)
    y -= 16
    pdf.drawString(margin, y, f'Customer Name: {order.customer_name or "-"}')
    y -= 14
    pdf.drawString(margin, y, f'Customer Phone: {order.customer_phone or "-"}')
    y -= 14
    pdf.drawString(margin, y, f'Destination: {destination}')
    y -= 14
    pdf.drawString(margin, y, f'Mode of Delivery: {mode}')

    y -= 26
    col_x = [margin, margin + 30, margin + 420]
    pdf.setFont('Helvetica-Bold', 10)
    pdf.drawString(col_x[0], y, '#')
    pdf.drawString(col_x[1], y, 'Item')
    pdf.drawString(col_x[2], y, 'Quantity')
    y -= 8
    pdf.line(margin, y, page_width - margin, y)
    pdf.setFont('Helvetica', 10)

    for idx, item in enumerate(order.order_items, start=1):
        if y < 120:
            _draw_footer(pdf, page_width, margin, 70)
            pdf.showPage()
            y = page_height - margin
            pdf.setFont('Helvetica-Bold', 10)
            pdf.drawString(col_x[0], y, '#')
            pdf.drawString(col_x[1], y, 'Item')
            pdf.drawString(col_x[2], y, 'Quantity')
            y -= 8
            pdf.line(margin, y, page_width - margin, y)
            pdf.setFont('Helvetica', 10)

        y -= 16
        product_name = item.product.name if item.product else f'Product #{item.product_id}'
        pdf.drawString(col_x[0], y, str(idx))
        pdf.drawString(col_x[1], y, product_name[:55])
        pdf.drawString(col_x[2], y, str(item.quantity))

    _draw_footer(pdf, page_width, margin, 70)
    pdf.save()
    return buffer.getvalue()


def _build_all_orders_pdf(orders):
    buffer = BytesIO()
    page_width, page_height = A4
    margin = 40
    y = page_height - margin
    pdf = canvas.Canvas(buffer, pagesize=A4)

    pdf.setFont('Helvetica-Bold', 18)
    pdf.drawString(margin, y, SHOP_NAME)
    pdf.setFont('Helvetica-Bold', 14)
    pdf.drawString(margin, y - 26, 'ORDERS REPORT')
    y -= 40

    pdf.setFont('Helvetica-Bold', 10)
    col_x = [margin, margin + 120, margin + 260, margin + 360, margin + 440]
    pdf.drawString(col_x[0], y, 'Order #')
    pdf.drawString(col_x[1], y, 'Date')
    pdf.drawString(col_x[2], y, 'Customer')
    pdf.drawString(col_x[3], y, 'Total')
    pdf.drawString(col_x[4], y, 'Status')
    y -= 12
    pdf.line(margin, y, page_width - margin, y)
    pdf.setFont('Helvetica', 9)

    for order in orders:
        if y < 80:
            _draw_footer(pdf, page_width, margin, 70)
            pdf.showPage()
            y = page_height - margin
            pdf.setFont('Helvetica-Bold', 10)
            pdf.drawString(col_x[0], y, 'Order #')
            pdf.drawString(col_x[1], y, 'Date')
            pdf.drawString(col_x[2], y, 'Customer')
            pdf.drawString(col_x[3], y, 'Total')
            pdf.drawString(col_x[4], y, 'Status')
            y -= 14
            pdf.line(margin, y, page_width - margin, y)
            pdf.setFont('Helvetica', 9)

        y -= 16
        date_str = order.created_at.strftime('%Y-%m-%d') if order.created_at else '-'
        customer = order.customer_name or order.customer_phone or 'Guest'
        total = f'KES {float(order.total_amount):,.2f}' if getattr(order, 'total_amount', None) is not None else 'KES 0.00'
        status = f'{order.payment_status or "-"}/{order.order_status or "-"}'

        pdf.drawString(col_x[0], y, order.order_number)
        pdf.drawString(col_x[1], y, date_str)
        pdf.drawString(col_x[2], y, customer[:25])
        pdf.drawRightString(col_x[3] + 60, y, total)
        pdf.drawString(col_x[4], y, status)

    _draw_footer(pdf, page_width, margin, 70)
    pdf.save()
    return buffer.getvalue()

def generate_order_number():
    """Generate unique order number"""
    timestamp = datetime.now().strftime('%Y%m%d%H%M')
    random_str = ''.join(random.choices(string.digits, k=4))
    return f'ORD-{timestamp}-{random_str}'

@order_bp.route('/orders', methods=['POST'])
@jwt_required(optional=True)
def create_order():
    """Create order from cart - ALLOWS GUEST CHECKOUT"""
    try:
        from models import db
        user_id = get_jwt_identity()  # Will be None for guest users
        data = getattr(g, 'sanitized_json', None) or request.get_json(silent=True)
        try:
            data = CreateOrderSchema().load(data or {})
        except ValidationError as ve:
            return jsonify({'error': 'Invalid input', 'messages': ve.messages}), 400
        
        print(f"📝 Creating order - User ID: {user_id}")
        print(f"   Customer: {data.get('customer_name')}")
        print(f"   Items count: {len(data.get('items', []))}")
        
        # Validate required fields - REMOVED customer_email
        required_fields = ['customer_name', 'customer_phone', 'shipping_address']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get items
        items = data.get('items', [])
        if not items:
            return jsonify({'error': 'No items in order'}), 400
        
        # Calculate totals
        subtotal = data.get('subtotal', 0)
        tax_amount = data.get('tax_amount', 0)
        shipping_cost = data.get('shipping_cost', 0)
        discount_amount = data.get('discount_amount', 0)
        total_amount = data.get('total_amount', 0)
        
        # Validate totals
        if total_amount <= 0:
            return jsonify({'error': 'Invalid total amount'}), 400
        
        # Generate order number
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_num = random.randint(1000, 9999)
        order_number = f'HNJ-{timestamp}-{random_num}'
        
        # Create order - make email optional
        order = Order(
            order_number=order_number,
            user_id=user_id,
            customer_name=data['customer_name'],
            customer_email=data.get('customer_email', ''),  # Optional with default
            customer_phone=data['customer_phone'],
            shipping_address=data['shipping_address'],
            billing_address=data.get('billing_address', data['shipping_address']),
            subtotal=subtotal,
            tax_amount=tax_amount,
            shipping_cost=shipping_cost,
            discount_amount=discount_amount,
            total_amount=total_amount,
            payment_method=data.get('payment_method', 'pending'),
            payment_status='pending',
            order_status='pending',
            notes=data.get('notes', '')
        )
        
        db.session.add(order)
        db.session.flush()  # Get order ID without committing
        
        # Create order items
        for item_data in items:
            product_id = item_data.get('product_id')
            quantity = item_data.get('quantity', 1)
            unit_price = item_data.get('unit_price', 0)
            total_price = item_data.get('total_price', unit_price * quantity)
            
            if not product_id:
                raise ValueError('product_id is required for order items')
            
            order_item = OrderItem(
                order_id=order.id,
                product_id=product_id,
                quantity=quantity,
                unit_price=unit_price,
                total_price=total_price,
                discount=item_data.get('discount', 0)
            )
            db.session.add(order_item)
        
        db.session.commit()
        
        print(f"✅ Order created successfully!")
        print(f"   Order ID: {order.id}")
        print(f"   Order Number: {order.order_number}")
        print(f"   Total Amount: {order.total_amount}")
        try:
            items_count = len(order.order_items) if hasattr(order, 'order_items') else 0
        except Exception:
            items_count = 0
        print(f"   Items: {items_count}")
        
        return jsonify({
            'success': True,
            'message': 'Order created successfully',
            'order': order.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Order creation error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
@order_bp.route('/orders/user', methods=['GET'])
@jwt_required()
def get_user_orders():
    """Get all orders for current user"""
    try:
        user_id = get_jwt_identity()
        
        status = request.args.get('status')
        limit = request.args.get('limit', 20)
        offset = request.args.get('offset', 0)
        
        query = Order.query.filter_by(user_id=user_id)
        
        if status:
            query = query.filter_by(order_status=status)
        
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
        current_app.logger.exception(f"Error in orders listing: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@order_bp.route('/orders/all', methods=['GET'])
@jwt_required()
def get_all_orders():
    """Admin: Get all orders (paged)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role not in ['admin', 'staff', 'manager', 'senior']:
            return jsonify({'error': 'Unauthorized'}), 403

        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))

        query = Order.query.order_by(Order.created_at.desc())
        total = query.count()
        orders = query.offset(offset).limit(limit).all()

        result = []
        for o in orders:
            od = o.to_dict()
            od['order_items'] = [item.to_dict() for item in o.order_items]
            od['items'] = od['order_items']
            od['payments'] = [p.to_dict() for p in o.payments]
            # convenience fields to help the frontend
            od['id'] = o.id
            od['order_number'] = o.order_number
            od['customer'] = {
                'name': o.customer_name,
                'phone': o.customer_phone,
                'email': o.customer_email
            }
            result.append(od)

        return jsonify({'orders': result, 'total': total, 'offset': offset, 'limit': limit}), 200

    except Exception as e:
        current_app.logger.exception(f"Error getting order: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@order_bp.route('/all', methods=['GET'])
@jwt_required()
def get_all_orders_short():
    """Alias route so frontend can call /api/orders/all"""
    return get_all_orders()

@order_bp.route('/orders/<string:order_number>', methods=['GET'])
@jwt_required()
def get_order(order_number):
    """Get specific order details"""
    try:
        user_id = get_jwt_identity()
        
        order = Order.query.filter_by(order_number=order_number).first_or_404()
        
        # Check authorization
        user = User.query.get(user_id)
        if order.user_id != user_id and user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        return jsonify(order.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@order_bp.route('/orders/<string:order_number>/cancel', methods=['POST'])
@jwt_required()
def cancel_order(order_number):
    """Cancel order"""
    try:
        from models import db
        user_id = get_jwt_identity()
        
        order = Order.query.filter_by(order_number=order_number).first_or_404()
        
        # Check authorization
        if order.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Check if order can be cancelled
        if order.order_status not in ['pending', 'confirmed']:
            return jsonify({
                'error': f'Cannot cancel order in {order.order_status} status'
            }), 400
        
        # Restore stock
        for order_item in order.order_items:
            product = Product.query.get(order_item.product_id)
            if product:
                product.stock_quantity += order_item.quantity
                
                # Create inventory transaction
                inv_transaction = InventoryTransaction(
                    product_id=product.id,
                    quantity=order_item.quantity,
                    transaction_type='restock',
                    reference_id=order.id,
                    notes=f'Restocked from cancelled order {order.order_number}'
                )
                db.session.add(inv_transaction)
        
        order.order_status = 'cancelled'
        db.session.commit()
        
        return jsonify({
            'message': 'Order cancelled',
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@order_bp.route('/orders/<string:order_number>/invoice', methods=['GET'])
@jwt_required(optional=True)
def download_invoice(order_number):
    """Download an invoice document for an order."""
    try:
        order = Order.query.filter_by(order_number=order_number).first_or_404()

        if not _check_order_doc_access(order):
            return jsonify({'error': 'Unauthorized'}), 403

        pdf_bytes = _build_invoice_pdf(order)
        response = make_response(pdf_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=invoice-{order.order_number}.pdf'
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@order_bp.route('/reports/all', methods=['GET'])
@jwt_required()
def download_all_orders_report():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Unauthorized'}), 403

        orders = Order.query.order_by(Order.created_at.desc()).all()
        pdf_bytes = _build_all_orders_pdf(orders)
        response = make_response(pdf_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = 'attachment; filename=hnj-orders-report.pdf'
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@order_bp.route('/orders/<string:order_number>/delivery-note', methods=['GET'])
@jwt_required(optional=True)
def download_delivery_note(order_number):
    """Download a delivery note document for an order."""
    try:
        order = Order.query.filter_by(order_number=order_number).first_or_404()

        if not _check_order_doc_access(order):
            return jsonify({'error': 'Unauthorized'}), 403

        pdf_bytes = _build_delivery_note_pdf(order)
        response = make_response(pdf_bytes)
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=delivery-note-{order.order_number}.pdf'
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@order_bp.route('/orders/<int:order_id>/payment-status', methods=['GET', 'OPTIONS'])
def check_order_payment_status(order_id):
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "*")
        response.headers.add("Access-Control-Allow-Methods", "*")
        return response


@order_bp.route('/orders/<int:order_id>', methods=['PUT'])
@jwt_required()
def update_order(order_id):
    """Admin/staff endpoint to update editable order fields"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user or user.role not in ['admin', 'staff', 'manager', 'senior']:
            return jsonify({'error': 'Unauthorized'}), 403

        order = Order.query.get_or_404(order_id)
        data = request.get_json() or {}

        # Allow partial updates for basic fields only
        allowed = ['customer_name', 'customer_phone', 'customer_email', 'notes', 'order_status', 'payment_status']
        updated = False
        for key in allowed:
            if key in data:
                setattr(order, key, data.get(key))
                updated = True

        if updated:
            db.session.commit()

        od = order.to_dict()
        # include convenience fields like in list
        od['id'] = order.id
        od['order_number'] = order.order_number
        od['order_items'] = [item.to_dict() for item in order.order_items]
        od['payments'] = [p.to_dict() for p in order.payments]

        return jsonify({'message': 'Order updated', 'order': od}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    
    try:
        # Get order from database
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        # Check if there are any successful payments for this order
        payment = Payment.query.filter_by(order_id=order_id).first()
        
        # Check if payment exists and was successful
        is_paid = False
        payment_data = None
        
        if payment:
            # Check payment status - adjust based on your Payment model
            if hasattr(payment, 'status'):
                is_paid = payment.status == 'successful' or payment.status == 'completed'
            else:
                # If no status field, assume payment with receipt is successful
                is_paid = bool(payment.mpesa_receipt)
            
            payment_data = {
                'receipt': payment.mpesa_receipt if hasattr(payment, 'mpesa_receipt') else None,
                'amount': float(payment.amount) if hasattr(payment, 'amount') else None,
                'phone': payment.phone if hasattr(payment, 'phone') else None,
                'date': payment.created_at.isoformat() if hasattr(payment, 'created_at') else None,
                'status': payment.status if hasattr(payment, 'status') else 'completed'
            }
        
        # Also check order status itself
        order_is_paid = order.status == 'paid' if hasattr(order, 'status') else is_paid
        
        response = jsonify({
            'success': True,
            'order_id': order_id,
            'order_number': order.order_number,
            'paid': order_is_paid or is_paid,
            'order_status': order.status if hasattr(order, 'status') else None,
            'payment': payment_data
        })
        
        # Add CORS headers
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response
        
    except Exception as e:
        print(f"❌ Error checking payment status for order {order_id}: {str(e)}")
        response = jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        })
        response.status_code = 500
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response