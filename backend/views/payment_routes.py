from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import random
from models import db
from models import Payment, Order, User, InventoryTransaction, Product

payment_bp = Blueprint('payments', __name__)

@payment_bp.route('/initiate', methods=['POST'])
@jwt_required()
def initiate_payment():
    """Initiate payment for order"""
    try:
        user_id = get_jwt_identity()
        from flask import g
        data = getattr(g, 'sanitized_json', None) or request.get_json(silent=True)
        
        order_number = data.get('order_number')
        payment_method = data.get('payment_method')
        
        if not order_number or not payment_method:
            return jsonify({'error': 'Order number and payment method required'}), 400
        
        order = Order.query.filter_by(order_number=order_number).first_or_404()
        
        # Check authorization
        if order.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Check if already paid
        if order.payment_status == 'paid':
            return jsonify({'error': 'Order already paid'}), 400
        
        # Validate payment method
        valid_methods = ['mpesa', 'till', 'cash']
        if payment_method not in valid_methods:
            return jsonify({'error': 'Invalid payment method'}), 400
        
        # Create payment record
        payment = Payment(
            order_id=order.id,
            payment_method=payment_method,
            amount=order.total_amount,
            phone_number=data.get('phone_number') if payment_method == 'mpesa' else None,
            status='pending'
        )
        
        db.session.add(payment)
        db.session.commit()
        
        # For demo, auto-confirm non-till payments
        if payment_method in ['mpesa', 'cash']:
            return complete_payment(payment.id, user_id)
        
        return jsonify({
            'message': 'Payment initiated',
            'payment': payment.to_dict(),
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def complete_payment(payment_id, user_id):
    """Complete payment process"""
    try:
        payment = Payment.query.get_or_404(payment_id)
        order = Order.query.get(payment.order_id)
        # Prevent double verification / duplicate SMS: if already completed, return early
        if payment.status == 'completed' or order.payment_status == 'completed' or order.order_status == 'completed':
            return jsonify({
                'message': 'Payment has already been verified',
                'payment': payment.to_dict(),
                'order': order.to_dict()
            }), 200
        
        # Generate transaction ID
        if payment.payment_method == 'mpesa':
            payment.transaction_id = f"MP{datetime.now().strftime('%Y%m%d%H%M%S')}{random.randint(1000, 9999)}"
        elif payment.payment_method == 'cash':
            payment.transaction_id = f"CASH{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        payment.status = 'completed'
        payment.notes = 'Payment completed successfully'

        # Update order statuses to completed
        order.payment_status = 'completed'
        order.payment_method = payment.payment_method

        # Only mark order completed if it was pending
        if order.order_status == 'pending':
            order.order_status = 'completed'

        # Update inventory transactions from reserved to sold
        if order.order_status in ['confirmed', 'completed']:
            for item in order.order_items:
                # Find and update the reservation transaction
                inv_transaction = InventoryTransaction.query.filter_by(
                    product_id=item.product_id,
                    reference_id=order.id,
                    transaction_type='sale_reserved'
                ).first()
                
                if inv_transaction:
                    inv_transaction.transaction_type = 'sale'
                    inv_transaction.notes = f'Sale completed for order {order.order_number}'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Payment completed successfully',
            'payment': payment.to_dict(),
            'order': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@payment_bp.route('/till/confirm', methods=['POST'])
@jwt_required()
def confirm_till_payment():
    """Confirm till payment (staff only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        from flask import g
        data = getattr(g, 'sanitized_json', None) or request.get_json(silent=True)
        payment_id = data.get('payment_id')
        order_id = data.get('order_id')
        confirmed = data.get('confirmed', False)
        till_number = data.get('till_number')
        
        # till_number is optional when admin simply wants to mark payment as verified
        # If neither payment_id nor order_id provided, return error
        if not payment_id and not order_id:
            return jsonify({'error': 'Payment ID or Order ID required'}), 400
        
        # If payment_id not provided but order_id is, create or find a payment record
        if not payment_id and order_id:
            order = Order.query.get(order_id)
            if not order:
                return jsonify({'error': 'Order not found'}), 404

            payment = Payment.query.filter_by(order_id=order.id).first()
            if not payment:
                payment = Payment(
                    order_id=order.id,
                    payment_method='till',
                    amount=order.total_amount or 0,
                    phone_number=order.customer_phone,
                    status='pending'
                )
                db.session.add(payment)
                db.session.commit()

            payment_id = payment.id

        payment = Payment.query.get_or_404(payment_id)
        order = Order.query.get(payment.order_id)
        
        # Only set transaction id if till_number provided
        if till_number:
            payment.transaction_id = till_number
        
        if confirmed:
            # Complete payment and then send SMS confirmation from admin action
            response = complete_payment(payment_id, user_id)

            try:
                from views.errand_routes import send_sms
                # Refresh objects
                payment = Payment.query.get(payment_id)
                order = Order.query.get(payment.order_id)

                customer_phone = order.customer_phone or payment.phone_number or ''
                if customer_phone:
                    phone_digits = ''.join(ch for ch in customer_phone if ch.isdigit())
                    if phone_digits.startswith('254'):
                        at_phone = f'+{phone_digits}'
                    elif phone_digits.startswith('0'):
                        at_phone = f'+254{phone_digits[1:]}'
                    elif customer_phone.startswith('+'):
                        at_phone = customer_phone
                    else:
                        at_phone = f'+{phone_digits}'

                    sms_message = f"Payment confirmed for Order #{order.order_number}. Amount: KSh {float(payment.amount):.2f}. Thank you for shopping with HNJ."
                    try:
                        send_result = send_sms(at_phone, sms_message)
                        print(f"Admin SMS send result: {send_result}")
                    except Exception as sms_e:
                        print(f"⚠️ Failed to send admin SMS: {sms_e}")

            except Exception as e:
                print(f"⚠️ Error while attempting admin SMS send: {e}")

            return response
        else:
            payment.status = 'failed'
            payment.notes = data.get('reason', 'Payment rejected')
            
            # Restore stock
            for item in order.order_items:
                product = Product.query.get(item.product_id)
                if product:
                    product.stock_quantity += item.quantity
                    
                    # Remove reservation transaction
                    InventoryTransaction.query.filter_by(
                        product_id=product.id,
                        reference_id=order.id,
                        transaction_type='sale_reserved'
                    ).delete()
            
            order.order_status = 'cancelled'
            db.session.commit()
            
            return jsonify({
                'message': 'Payment rejected',
                'payment': payment.to_dict(),
                'order': order.to_dict()
            }), 200
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@payment_bp.route('/<int:payment_id>', methods=['GET'])
@jwt_required()
def get_payment(payment_id):
    """Get payment details"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        payment = Payment.query.get_or_404(payment_id)
        order = Order.query.get(payment.order_id)
        
        # Check authorization
        if order.user_id != user_id and user.role not in ['admin', 'staff']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        return jsonify(payment.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500