# ~/hnj/backend/views/errand_routes.py
from flask import Blueprint, request, jsonify, current_app, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
import os
import uuid
import json

errand_bp = Blueprint('errand', __name__)

from utils.schemas import CreateErrandSchema
from marshmallow import ValidationError

# ==================== HELPER FUNCTIONS ====================

def generate_upload_filename(original_filename, prefix):
    """Generate unique filename for uploads"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = str(uuid.uuid4())[:8]
    extension = original_filename.split('.')[-1] if '.' in original_filename else 'jpg'
    return f"{prefix}_{timestamp}_{unique_id}.{extension}"

def save_uploaded_file(file, folder, filename):
    """Save uploaded file to server"""
    try:
        # Create upload folder if it doesn't exist
        app_root = current_app.root_path
        upload_path = os.path.join(app_root, 'static', 'uploads', folder)
        os.makedirs(upload_path, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_path, filename)
        file.save(file_path)
        
        # Return URL
        return f"/api/uploads/{folder}/{filename}"
    except Exception as e:
        current_app.logger.error(f"File upload error: {str(e)}")
        return None

def send_sms(phone, message):
    """Send SMS via Africa's Talking"""
    try:
        # Read credentials from environment
        username = os.getenv('AFRICASTALKING_USERNAME', 'sandbox')
        api_key = os.getenv('AFRICASTALKING_API_KEY')

        if not api_key:
            current_app.logger.warning('AFRICASTALKING_API_KEY not configured; skipping SMS send')
            return {'success': False, 'error': 'AFRICASTALKING_API_KEY not configured'}

        # Import here so the package is optional until configured
        import africastalking

        # Initialize SDK
        africastalking.initialize(username=username, api_key=api_key)
        sms = africastalking.SMS

        # Africa's Talking expects international format numbers (e.g., +2547...)
        recipients = [phone]

        # Send message
        response = sms.send(message, recipients)
        current_app.logger.info(f"AFRICASTALKING SMS response: {response}")
        return {'success': True, 'response': response}
    except Exception as e:
        current_app.logger.error(f"SMS error: {str(e)}")
        return {'success': False, 'error': str(e)}

# ==================== DELIVERY AGENT ROUTES ====================

@errand_bp.route('/delivery-agents', methods=['GET'])
@jwt_required()
def get_delivery_agents():
    """Get all delivery agents"""
    try:
        from models import DeliveryAgent
        
        agents = DeliveryAgent.query.filter_by(is_active=True).order_by(DeliveryAgent.name).all()
        return jsonify({
            'success': True,
            'agents': [a.to_dict() for a in agents]
        })
    except Exception as e:
        current_app.logger.error(f"Get delivery agents error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch delivery agents'}), 500

@errand_bp.route('/delivery-agents', methods=['POST'])
@jwt_required()
def create_delivery_agent():
    """Create new delivery agent (admin/senior only)"""
    try:
        from models import db, User, DeliveryAgent
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'senior', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        data = getattr(g, 'sanitized_json', None) or request.get_json(silent=True)
        try:
            data = CreateErrandSchema().load(data or {})
        except ValidationError as ve:
            return jsonify({'success': False, 'message': 'Invalid input', 'errors': ve.messages}), 400
        
        # Validate required fields
        if not data.get('code') or not data.get('name') or not data.get('type'):
            return jsonify({'success': False, 'message': 'Code, name, and type are required'}), 400
        
        # Check if code exists
        if DeliveryAgent.query.filter_by(code=data['code']).first():
            return jsonify({'success': False, 'message': 'Agent code already exists'}), 400
        
        agent = DeliveryAgent(
            code=data['code'].upper(),
            name=data['name'],
            type=data['type'],
            contact_person=data.get('contact_person'),
            phone=data.get('phone'),
            email=data.get('email'),
            website=data.get('website'),
            branches=data.get('branches', []),
            notes=data.get('notes'),
            is_active=data.get('is_active', True)
        )
        
        db.session.add(agent)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Delivery agent created successfully',
            'agent': agent.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create delivery agent error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to create delivery agent'}), 500

@errand_bp.route('/delivery-agents/<int:agent_id>', methods=['PUT'])
@jwt_required()
def update_delivery_agent(agent_id):
    """Update delivery agent (admin/senior only)"""
    try:
        from models import db, User, DeliveryAgent
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'senior', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        agent = DeliveryAgent.query.get(agent_id)
        if not agent:
            return jsonify({'success': False, 'message': 'Delivery agent not found'}), 404
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            agent.name = data['name']
        if 'contact_person' in data:
            agent.contact_person = data['contact_person']
        if 'phone' in data:
            agent.phone = data['phone']
        if 'email' in data:
            agent.email = data['email']
        if 'branches' in data:
            agent.branches = data['branches']
        if 'is_active' in data:
            agent.is_active = data['is_active']
        if 'notes' in data:
            agent.notes = data['notes']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Delivery agent updated successfully',
            'agent': agent.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update delivery agent error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to update delivery agent'}), 500

@errand_bp.route('/delivery-agents/<int:agent_id>/branches', methods=['GET'])
@jwt_required()
def get_agent_branches(agent_id):
    """Get branches for a delivery agent"""
    try:
        from models import DeliveryAgent
        
        agent = DeliveryAgent.query.get(agent_id)
        if not agent:
            return jsonify({'success': False, 'message': 'Delivery agent not found'}), 404
        
        return jsonify({
            'success': True,
            'branches': agent.branches or []
        })
    except Exception as e:
        current_app.logger.error(f"Get agent branches error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch branches'}), 500

# ==================== ERRAND ROUTES ====================

@errand_bp.route('/errands', methods=['POST'])
@jwt_required()
def create_errand():
    """Create new errand (admin/senior only)"""
    try:
        from models import db, User, Errand, Order, Product
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'senior', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        if not data.get('type') or data['type'] not in ['sourcing', 'delivery']:
            return jsonify({'success': False, 'message': 'Valid type (sourcing/delivery) is required'}), 400
        
        if not data.get('customer_name') or not data.get('customer_phone'):
            return jsonify({'success': False, 'message': 'Customer name and phone are required'}), 400
        
        if not data.get('product_name'):
            return jsonify({'success': False, 'message': 'Product name is required'}), 400
        
        # Create errand
        errand = Errand()
        errand.errand_number = errand.generate_errand_number()
        errand.type = data['type']
        
        # Customer info
        errand.customer_name = data['customer_name']
        errand.customer_phone = data['customer_phone']
        errand.customer_email = data.get('customer_email')
        
        # Product info
        errand.product_name = data['product_name']
        errand.quantity = data.get('quantity', 1)
        
        # Link to order/product if provided
        if data.get('order_id'):
            errand.order_id = data['order_id']
            order = Order.query.get(data['order_id'])
            if order:
                errand.order_number = order.order_number
        
        if data.get('product_id'):
            errand.product_id = data['product_id']
            product = Product.query.get(data['product_id'])
            if product:
                errand.product_sku = product.sku
        
        # Type-specific fields
        if errand.type == 'sourcing':
            errand.market_location = data.get('market_location')
            errand.preferred_vendor = data.get('preferred_vendor')
            errand.max_price = data.get('max_price')
        else:  # delivery
            errand.delivery_agent_id = data.get('delivery_agent_id')
            errand.agent_name = data.get('agent_name')
            errand.agent_branch = data.get('agent_branch')
            errand.tracking_number = data.get('tracking_number')
        
        # Assignment
        if data.get('assigned_to'):
            errand.assigned_to = data['assigned_to']
            errand.assigned_at = datetime.utcnow()
        
        # Priority and deadline
        errand.priority = data.get('priority', 'normal')
        if data.get('deadline'):
            errand.deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
        
        # Financial - fixed fee at 100 KSH
        errand.errand_fee = 100.00
        errand.transport_cost = data.get('transport_cost', 0)
        errand.total_cost = 100.00 + (data.get('transport_cost', 0) or 0)
        
        db.session.add(errand)
        db.session.commit()
        
        # Create notification for admin
        from models import ErrandNotification
        notification = ErrandNotification()
        notification.notification_number = notification.generate_notification_number()
        notification.errand_id = errand.id
        notification.recipient_type = 'admin'
        notification.type = 'assigned' if errand.assigned_to else 'created'
        notification.channel = 'in_app'
        notification.subject = f"New Errand: {errand.errand_number}"
        notification.message = f"Errand {errand.errand_number} ({errand.type}) created for {errand.customer_name}"
        
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Errand created successfully',
            'errand': errand.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create errand error: {str(e)}")
        return jsonify({'success': False, 'message': f'Failed to create errand: {str(e)}'}), 500

@errand_bp.route('/errands', methods=['GET'])
@jwt_required()
def get_errands():
    """Get errands with filters (admin/senior/manager)"""
    try:
        from models import User, Errand
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Build query based on role
        if user.role in ['admin', 'senior', 'manager']:
            # Admins see all errands
            query = Errand.query
        elif user.role == 'errand':
            # Errand runners see only their assigned errands
            query = Errand.query.filter_by(assigned_to=current_user_id)
        else:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Apply filters
        status = request.args.get('status')
        if status:
            query = query.filter(Errand.status == status)
        
        type_filter = request.args.get('type')
        if type_filter:
            query = query.filter(Errand.type == type_filter)
        
        assigned = request.args.get('assigned')
        if assigned == 'true':
            query = query.filter(Errand.assigned_to.isnot(None))
        elif assigned == 'false':
            query = query.filter(Errand.assigned_to.is_(None))
        
        # Date range
        start_date = request.args.get('start_date')
        if start_date:
            query = query.filter(Errand.created_at >= datetime.fromisoformat(start_date.replace('Z', '+00:00')))
        
        end_date = request.args.get('end_date')
        if end_date:
            query = query.filter(Errand.created_at <= datetime.fromisoformat(end_date.replace('Z', '+00:00')))
        
        # Order by
        query = query.order_by(Errand.created_at.desc())
        
        # Pagination
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        total = query.count()
        errands = query.offset(offset).limit(limit).all()
        
        return jsonify({
            'success': True,
            'errands': [e.to_dict() for e in errands],
            'total': total,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        current_app.logger.error(f"Get errands error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch errands'}), 500


# ==================== MODIFIED: CREATE ERRAND WITH SUBMISSION (FOR RUNNERS) ====================
# REMOVED: customer_name, customer_phone, agent_name, destination validation
# ADDED: Default values for removed fields

@errand_bp.route('/errands/with-submission', methods=['POST'])
@jwt_required()
def create_errand_with_submission():
    """Create errand and submit it immediately with photos (for runners)"""
    try:
        from models import db, User, Errand, ErrandSubmission, DeliveryAgent
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'errand':
            return jsonify({'success': False, 'message': 'Only errand runners can create errands'}), 403
        
        # Get form data
        data_json = request.form.get('data')
        if not data_json:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        data = json.loads(data_json)
        
        # ===== MODIFIED VALIDATION - Only keep what's in the simplified form =====
        # Validate only the fields we have in the simplified form
        if not data.get('product_name'):
            return jsonify({'success': False, 'message': 'Product name is required'}), 400
        
        if not data.get('market_location'):
            return jsonify({'success': False, 'message': 'Market location is required'}), 400
        
        if not data.get('preferred_vendor'):
            return jsonify({'success': False, 'message': 'Vendor name is required'}), 400
        
        if not data.get('max_price'):
            return jsonify({'success': False, 'message': 'Price is required'}), 400
        
        # Check if files are present
        if 'product_photo' not in request.files:
            return jsonify({'success': False, 'message': 'Product photo is required'}), 400
        
        if 'receipt_photo' not in request.files:
            return jsonify({'success': False, 'message': 'Receipt photo is required'}), 400
        
        product_file = request.files['product_photo']
        receipt_file = request.files['receipt_photo']
        
        if product_file.filename == '' or receipt_file.filename == '':
            return jsonify({'success': False, 'message': 'Both photos are required'}), 400
        
        # ===== CREATE ERRAND WITH DEFAULT VALUES FOR REMOVED FIELDS =====
        errand = Errand()
        errand.errand_number = errand.generate_errand_number()
        errand.type = 'sourcing'  # Always sourcing for runner-created errands
        
        # Set default values for fields removed from form
        errand.customer_name = 'Market Customer'  # Default value
        errand.customer_phone = '0700000000'      # Default value
        errand.agent_name = 'Self'                 # Default value
        errand.destination = 'Market'               # Default value
        
        # Product info from form
        errand.product_name = data['product_name']
        errand.quantity = data.get('quantity', 1)
        errand.market_location = data.get('market_location')
        errand.preferred_vendor = data.get('preferred_vendor')
        errand.max_price = data.get('max_price')
        errand.notes = data.get('notes')
        
        # Assignment
        errand.assigned_to = current_user_id
        errand.assigned_at = datetime.utcnow()
        errand.status = 'submitted'  # Directly submitted for approval
        
        db.session.add(errand)
        db.session.flush()  # Get errand ID
        
        # Save product photo
        product_filename = generate_upload_filename(product_file.filename, f"errand_{errand.id}_product")
        product_url = save_uploaded_file(product_file, 'errand_photos', product_filename)
        
        if not product_url:
            return jsonify({'success': False, 'message': 'Failed to save product photo'}), 500
        
        # Save receipt photo
        receipt_filename = generate_upload_filename(receipt_file.filename, f"errand_{errand.id}_receipt")
        receipt_url = save_uploaded_file(receipt_file, 'errand_receipts', receipt_filename)
        
        if not receipt_url:
            return jsonify({'success': False, 'message': 'Failed to save receipt photo'}), 500
        
        # Create submission
        submission = ErrandSubmission()
        submission.submission_number = submission.generate_submission_number()
        submission.errand_id = errand.id
        submission.submitted_by = current_user_id
        submission.product_photo_url = product_url
        submission.receipt_photo_url = receipt_url
        submission.agent_name = 'Self'  # Default value
        submission.notes = data.get('notes')
        submission.status = 'pending'
        
        db.session.add(submission)
        db.session.commit()
        
        # Create notification for admins
        from models import ErrandNotification
        notification = ErrandNotification()
        notification.notification_number = notification.generate_notification_number()
        notification.errand_id = errand.id
        notification.recipient_type = 'admin'
        notification.type = 'submitted'
        notification.channel = 'in_app'
        notification.subject = f"New Errand Submitted: {errand.errand_number}"
        notification.message = f"Errand {errand.errand_number} has been submitted by {user.full_name}"
        
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Errand submitted for approval',
            'errand': errand.to_dict(),
            'submission': submission.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create errand with submission error: {str(e)}")
        return jsonify({'success': False, 'message': f'Failed to create errand: {str(e)}'}), 500




# ==================== NEW: AVAILABLE ERRANDS FOR RUNNERS ====================

@errand_bp.route('/errands/available', methods=['GET'])
@jwt_required()
def get_available_errands():
    """Get all available (unassigned) errands for runners"""
    try:
        from models import Errand
        
        current_user_id = get_jwt_identity()
        
        # Get all pending errands that are not assigned to anyone
        errands = Errand.query.filter_by(
            status='pending',
            assigned_to=None
        ).order_by(Errand.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'errands': [e.to_dict() for e in errands],
            'count': len(errands)
        })
        
    except Exception as e:
        current_app.logger.error(f"Get available errands error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch available errands'}), 500

# ==================== MY ERRANDS ====================

@errand_bp.route('/errands/my', methods=['GET'])
@jwt_required()
def get_my_errands():
    """Get errands assigned to current user (for errand runners)"""
    try:
        from models import Errand
        
        current_user_id = get_jwt_identity()
        
        errands = Errand.query.filter_by(assigned_to=current_user_id)\
            .order_by(Errand.created_at.desc())\
            .all()
        
        return jsonify({
            'success': True,
            'errands': [e.to_dict() for e in errands]
        })
        
    except Exception as e:
        current_app.logger.error(f"Get my errands error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch your errands'}), 500

@errand_bp.route('/errands/pending', methods=['GET'])
@jwt_required()
def get_pending_errands():
    """Get errands pending approval (admin/senior only)"""
    try:
        from models import User, Errand
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'senior', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        errands = Errand.query.filter_by(status='submitted')\
            .order_by(Errand.updated_at.desc())\
            .all()
        
        return jsonify({
            'success': True,
            'errands': [e.to_dict() for e in errands]
        })
        
    except Exception as e:
        current_app.logger.error(f"Get pending errands error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch pending errands'}), 500

@errand_bp.route('/errands/<int:errand_id>', methods=['GET'])
@jwt_required()
def get_errand(errand_id):
    """Get single errand details"""
    try:
        from models import User, Errand
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        errand = Errand.query.get(errand_id)
        if not errand:
            return jsonify({'success': False, 'message': 'Errand not found'}), 404
        
        # Check permissions
        if user.role not in ['admin', 'senior', 'manager'] and errand.assigned_to != current_user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        return jsonify({
            'success': True,
            'errand': errand.to_dict()
        })
        
    except Exception as e:
        current_app.logger.error(f"Get errand error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch errand'}), 500

@errand_bp.route('/errands/<int:errand_id>/assign', methods=['POST'])
@jwt_required()
def assign_errand(errand_id):
    """Assign errand to a runner (admin/senior only)"""
    try:
        from models import db, User, Errand, ErrandNotification
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'senior', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        errand = Errand.query.get(errand_id)
        if not errand:
            return jsonify({'success': False, 'message': 'Errand not found'}), 404
        
        data = request.get_json()
        runner_id = data.get('runner_id')
        
        if not runner_id:
            return jsonify({'success': False, 'message': 'Runner ID required'}), 400
        
        runner = User.query.get(runner_id)
        if not runner or runner.role != 'errand':
            return jsonify({'success': False, 'message': 'Invalid runner'}), 400
        
        errand.assigned_to = runner_id
        errand.assigned_at = datetime.utcnow()
        errand.status = 'pending'  # Waiting for runner to accept
        
        db.session.commit()
        
        # Create notification for runner
        notification = ErrandNotification()
        notification.notification_number = notification.generate_notification_number()
        notification.errand_id = errand.id
        notification.recipient_type = 'runner'
        notification.recipient_id = runner_id
        notification.type = 'assigned'
        notification.channel = 'in_app'
        notification.subject = f"New Errand Assigned: {errand.errand_number}"
        notification.message = f"You have been assigned errand {errand.errand_number} ({errand.type}) for {errand.customer_name}"
        
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Errand assigned to {runner.full_name}',
            'errand': errand.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Assign errand error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to assign errand'}), 500

@errand_bp.route('/errands/<int:errand_id>/accept', methods=['POST'])
@jwt_required()
def accept_errand(errand_id):
    """Accept assigned errand (runner only)"""
    try:
        from models import db, User, Errand, ErrandNotification
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'errand':
            return jsonify({'success': False, 'message': 'Only errand runners can accept errands'}), 403
        
        errand = Errand.query.get(errand_id)
        if not errand:
            return jsonify({'success': False, 'message': 'Errand not found'}), 404
        
        # Check if errand is available (pending and unassigned)
        if errand.status != 'pending' or errand.assigned_to is not None:
            return jsonify({'success': False, 'message': 'This errand is not available for acceptance'}), 400
        
        # Assign the errand to this runner
        errand.assigned_to = current_user_id
        errand.assigned_at = datetime.utcnow()
        errand.status = 'accepted'  # Change from 'pending' to 'accepted'
        
        db.session.commit()
        
        # Create notification for admin
        notification = ErrandNotification()
        notification.notification_number = notification.generate_notification_number()
        notification.errand_id = errand.id
        notification.recipient_type = 'admin'
        notification.type = 'accepted'
        notification.channel = 'in_app'
        notification.subject = f"Errand Accepted: {errand.errand_number}"
        notification.message = f"Errand {errand.errand_number} has been accepted by {user.full_name}"
        
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Errand accepted successfully',
            'errand': errand.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Accept errand error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to accept errand'}), 500

@errand_bp.route('/errands/<int:errand_id>/start', methods=['POST'])
@jwt_required()
def start_errand(errand_id):
    """Mark errand as in progress (runner only)"""
    try:
        from models import db, User, Errand
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'errand':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        errand = Errand.query.get(errand_id)
        if not errand:
            return jsonify({'success': False, 'message': 'Errand not found'}), 404
        
        if errand.assigned_to != current_user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        if errand.status != 'accepted':
            return jsonify({'success': False, 'message': f'Cannot start errand with status: {errand.status}'}), 400
        
        errand.status = 'in_progress'
        errand.started_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Errand started',
            'errand': errand.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Start errand error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to start errand'}), 500

@errand_bp.route('/errands/<int:errand_id>/deadline', methods=['POST'])
@jwt_required()
def set_deadline(errand_id):
    """Set deadline for errand (admin/senior only)"""
    try:
        from models import db, User, Errand
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'senior', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        errand = Errand.query.get(errand_id)
        if not errand:
            return jsonify({'success': False, 'message': 'Errand not found'}), 404
        
        data = request.get_json()
        deadline_str = data.get('deadline')
        
        if not deadline_str:
            return jsonify({'success': False, 'message': 'Deadline required'}), 400
        
        errand.deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Deadline set',
            'errand': errand.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Set deadline error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to set deadline'}), 500

# ==================== SUBMISSION ROUTES ====================

@errand_bp.route('/errands/<int:errand_id>/submissions', methods=['POST'])
@jwt_required()
def create_submission(errand_id):
    """Submit errand completion with photos (runner only)"""
    try:
        from models import db, User, Errand, ErrandSubmission, DeliveryAgent
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'errand':
            return jsonify({'success': False, 'message': 'Only errand runners can submit'}), 403
        
        errand = Errand.query.get(errand_id)
        if not errand:
            return jsonify({'success': False, 'message': 'Errand not found'}), 404
        
        if errand.assigned_to != current_user_id:
            return jsonify({'success': False, 'message': 'You are not assigned to this errand'}), 403
        
        if errand.status not in ['accepted', 'in_progress', 'rejected']:
            return jsonify({'success': False, 'message': f'Cannot submit errand with status: {errand.status}'}), 400
        
        # Check if files are present
        if 'product_photo' not in request.files:
            return jsonify({'success': False, 'message': 'Product photo is required'}), 400
        
        if 'receipt_photo' not in request.files:
            return jsonify({'success': False, 'message': 'Receipt photo is required'}), 400
        
        product_file = request.files['product_photo']
        receipt_file = request.files['receipt_photo']
        
        if product_file.filename == '' or receipt_file.filename == '':
            return jsonify({'success': False, 'message': 'Both photos are required'}), 400
        
        # Save product photo
        product_filename = generate_upload_filename(product_file.filename, f"errand_{errand_id}_product")
        product_url = save_uploaded_file(product_file, 'errand_photos', product_filename)
        
        if not product_url:
            return jsonify({'success': False, 'message': 'Failed to save product photo'}), 500
        
        # Save receipt photo
        receipt_filename = generate_upload_filename(receipt_file.filename, f"errand_{errand_id}_receipt")
        receipt_url = save_uploaded_file(receipt_file, 'errand_receipts', receipt_filename)
        
        if not receipt_url:
            return jsonify({'success': False, 'message': 'Failed to save receipt photo'}), 500
        
        # Get form data
        data = request.form
        
        # Create submission
        submission = ErrandSubmission()
        submission.submission_number = submission.generate_submission_number()
        submission.errand_id = errand_id
        submission.submitted_by = current_user_id
        
        submission.product_photo_url = product_url
        submission.receipt_photo_url = receipt_url
        
        submission.receipt_number = data.get('receipt_number')
        submission.receipt_amount = data.get('receipt_amount', type=float)
        
        # Delivery agent info
        agent_id = data.get('delivery_agent_id', type=int)
        if agent_id:
            submission.delivery_agent_id = agent_id
            agent = DeliveryAgent.query.get(agent_id)
            if agent:
                submission.agent_name = agent.name
        
        submission.agent_branch = data.get('agent_branch')
        submission.tracking_number = data.get('tracking_number')
        submission.notes = data.get('notes')
        
        # Location data (if provided)
        lat = data.get('latitude')
        lng = data.get('longitude')
        if lat and lng:
            submission.location_data = {
                'latitude': float(lat),
                'longitude': float(lng),
                'timestamp': datetime.utcnow().isoformat()
            }
        
        db.session.add(submission)
        
        # Update errand status
        errand.status = 'submitted'
        errand.updated_at = datetime.utcnow()
        
        # Update errand with actual price for sourcing
        if errand.type == 'sourcing' and data.get('actual_price'):
            errand.actual_price = data.get('actual_price', type=float)
            errand.total_cost = 100.00 + (errand.transport_cost or 0) + (errand.actual_price or 0)
        
        # Update tracking info
        if data.get('tracking_number'):
            errand.tracking_number = data['tracking_number']
        
        if agent_id:
            errand.delivery_agent_id = agent_id
            if submission.agent_name:
                errand.agent_name = submission.agent_name
            errand.agent_branch = submission.agent_branch
        
        db.session.commit()
        
        # Create notification for admins
        from models import ErrandNotification
        
        notification = ErrandNotification()
        notification.notification_number = notification.generate_notification_number()
        notification.errand_id = errand_id
        notification.recipient_type = 'admin'
        notification.type = 'submitted'
        notification.channel = 'in_app'
        notification.subject = f"Errand Submitted: {errand.errand_number}"
        notification.message = f"Errand {errand.errand_number} has been submitted for approval by {user.full_name}"
        
        db.session.add(notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Errand submitted successfully',
            'submission': submission.to_dict(),
            'errand': errand.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create submission error: {str(e)}")
        return jsonify({'success': False, 'message': f'Failed to submit errand: {str(e)}'}), 500

@errand_bp.route('/submissions/<int:submission_id>', methods=['DELETE'])
@jwt_required()
def delete_submission(submission_id):
    """Delete submission and start new one (runner only)"""
    try:
        from models import db, User, ErrandSubmission
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'errand':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        submission = ErrandSubmission.query.get(submission_id)
        if not submission:
            return jsonify({'success': False, 'message': 'Submission not found'}), 404
        
        if submission.submitted_by != current_user_id:
            return jsonify({'success': False, 'message': 'You can only delete your own submissions'}), 403
        
        if submission.status != 'pending':
            return jsonify({'success': False, 'message': f'Cannot delete submission with status: {submission.status}'}), 400
        
        errand = submission.errand
        errand.status = 'in_progress'
        
        # Delete submission
        db.session.delete(submission)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Submission deleted. You can now create a new submission.',
            'errand': errand.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete submission error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to delete submission'}), 500

# ==================== APPROVAL ROUTES ====================

@errand_bp.route('/submissions/<int:submission_id>/approve', methods=['POST'])
@jwt_required()
def approve_submission(submission_id):
    """Approve errand submission (admin/senior only)"""
    try:
        from models import db, User, ErrandSubmission, ErrandApproval, ErrandNotification
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'senior', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        submission = ErrandSubmission.query.get(submission_id)
        if not submission:
            return jsonify({'success': False, 'message': 'Submission not found'}), 404
        
        if submission.status != 'pending':
            return jsonify({'success': False, 'message': f'Submission already {submission.status}'}), 400
        
        errand = submission.errand
        
        # Create approval record
        approval = ErrandApproval()
        approval.errand_id = errand.id
        approval.submission_id = submission_id
        approval.approved_by = current_user_id
        approval.decision = 'approved'
        
        # Optional: adjust fee
        data = request.get_json()
        if data and data.get('adjusted_fee'):
            approval.adjusted_fee = data['adjusted_fee']
            errand.errand_fee = data['adjusted_fee']
            errand.total_cost = data['adjusted_fee'] + (errand.transport_cost or 0) + (errand.actual_price or 0)
        
        db.session.add(approval)
        
        # Update submission status
        submission.status = 'approved'
        
        # Update errand status
        errand.status = 'approved'
        errand.completed_at = datetime.utcnow()
        
        db.session.commit()
        
        # Send SMS to customer
        if errand.customer_phone:
            agent_info = f" at {errand.agent_name}" if errand.agent_name else ""
            tracking_info = f" Tracking: {errand.tracking_number}" if errand.tracking_number else ""
            
            sms_message = f"Your parcel #{errand.order_number or errand.errand_number} has been dropped{agent_info}.{tracking_info} Pickup within 7 days. Thank you for shopping with us!"
            
            sms_result = send_sms(errand.customer_phone, sms_message)
            
            # Create SMS notification record
            sms_notification = ErrandNotification()
            sms_notification.notification_number = sms_notification.generate_notification_number()
            sms_notification.errand_id = errand.id
            sms_notification.recipient_type = 'customer'
            sms_notification.recipient_phone = errand.customer_phone
            sms_notification.type = 'approved'
            sms_notification.channel = 'sms'
            sms_notification.subject = f"Delivery Update: {errand.errand_number}"
            sms_notification.message = sms_message
            sms_notification.status = 'sent' if sms_result.get('success') else 'failed'
            sms_notification.sent_at = datetime.utcnow()
            sms_notification.provider_response = sms_result
            
            db.session.add(sms_notification)
        
        # Create notification for runner
        runner_notification = ErrandNotification()
        runner_notification.notification_number = runner_notification.generate_notification_number()
        runner_notification.errand_id = errand.id
        runner_notification.recipient_type = 'runner'
        runner_notification.recipient_id = errand.assigned_to
        runner_notification.type = 'approved'
        runner_notification.channel = 'in_app'
        runner_notification.subject = f"Errand Approved: {errand.errand_number}"
        runner_notification.message = f"Your errand {errand.errand_number} has been approved! KSh {float(errand.errand_fee):.2f} added to your earnings."
        
        db.session.add(runner_notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Errand approved successfully',
            'approval': approval.to_dict(),
            'errand': errand.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Approve submission error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to approve errand'}), 500

@errand_bp.route('/submissions/<int:submission_id>/reject', methods=['POST'])
@jwt_required()
def reject_submission(submission_id):
    """Reject errand submission with reason (admin/senior only)"""
    try:
        from models import db, User, ErrandSubmission, ErrandApproval, ErrandNotification
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'senior', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        submission = ErrandSubmission.query.get(submission_id)
        if not submission:
            return jsonify({'success': False, 'message': 'Submission not found'}), 404
        
        if submission.status != 'pending':
            return jsonify({'success': False, 'message': f'Submission already {submission.status}'}), 400
        
        data = request.get_json()
        
        if not data or not data.get('rejection_reason'):
            return jsonify({'success': False, 'message': 'Rejection reason is required'}), 400
        
        errand = submission.errand
        
        # Create approval record
        approval = ErrandApproval()
        approval.errand_id = errand.id
        approval.submission_id = submission_id
        approval.approved_by = current_user_id
        approval.decision = 'rejected'
        approval.rejection_reason = data['rejection_reason']
        approval.rejection_comments = data.get('rejection_comments', '')
        
        db.session.add(approval)
        
        # Update submission status
        submission.status = 'rejected'
        
        # Update errand status - back to in_progress for resubmission
        errand.status = 'rejected'
        
        db.session.commit()
        
        # Create notification for runner
        runner_notification = ErrandNotification()
        runner_notification.notification_number = runner_notification.generate_notification_number()
        runner_notification.errand_id = errand.id
        runner_notification.recipient_type = 'runner'
        runner_notification.recipient_id = errand.assigned_to
        runner_notification.type = 'rejected'
        runner_notification.channel = 'in_app'
        runner_notification.subject = f"Errand Rejected: {errand.errand_number}"
        runner_notification.message = f"Your errand {errand.errand_number} was rejected. Reason: {approval.rejection_reason}. Please check and resubmit."
        
        db.session.add(runner_notification)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Errand rejected',
            'approval': approval.to_dict(),
            'errand': errand.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Reject submission error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to reject errand'}), 500

@errand_bp.route('/errands/<int:errand_id>/approvals', methods=['GET'])
@jwt_required()
def get_errand_approvals(errand_id):
    """Get approval history for an errand"""
    try:
        from models import User, Errand, ErrandApproval
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        errand = Errand.query.get(errand_id)
        if not errand:
            return jsonify({'success': False, 'message': 'Errand not found'}), 404
        
        # Check permissions
        if user.role not in ['admin', 'senior', 'manager'] and errand.assigned_to != current_user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        approvals = ErrandApproval.query.filter_by(errand_id=errand_id)\
            .order_by(ErrandApproval.created_at.desc())\
            .all()
        
        return jsonify({
            'success': True,
            'approvals': [a.to_dict() for a in approvals]
        })
        
    except Exception as e:
        current_app.logger.error(f"Get errand approvals error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch approvals'}), 500

# ==================== REJECTED ERRANDS FOR RUNNER ====================

@errand_bp.route('/errands/my-rejected', methods=['GET'])
@jwt_required()
def get_my_rejected_errands():
    """Get rejected errands for current runner"""
    try:
        from models import Errand
        
        current_user_id = get_jwt_identity()
        
        errands = Errand.query.filter_by(
            assigned_to=current_user_id,
            status='rejected'
        ).order_by(Errand.updated_at.desc()).all()
        
        return jsonify({
            'success': True,
            'errands': [e.to_dict() for e in errands],
            'count': len(errands)
        })
        
    except Exception as e:
        current_app.logger.error(f"Get rejected errands error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch rejected errands'}), 500

# ==================== NOTIFICATION ROUTES ====================

@errand_bp.route('/errand-notifications', methods=['GET'])
@jwt_required()
def get_my_notifications():
    """Get in-app notifications for current user"""
    try:
        from models import ErrandNotification, User
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        query = ErrandNotification.query.filter(
            ErrandNotification.recipient_id == current_user_id,
            ErrandNotification.channel.in_(['in_app', 'both'])
        )
        
        # Filter by read status
        read = request.args.get('read')
        if read is not None:
            # Note: You'd need to add a 'read' column to track this
            pass
        
        query = query.order_by(ErrandNotification.created_at.desc())
        
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        total = query.count()
        notifications = query.offset(offset).limit(limit).all()
        
        return jsonify({
            'success': True,
            'notifications': [n.to_dict() for n in notifications],
            'total': total,
            'unread': 0  # TODO: Implement unread count
        })
        
    except Exception as e:
        current_app.logger.error(f"Get notifications error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch notifications'}), 500

# ==================== DASHBOARD STATS FOR ERRAND RUNNER ====================

@errand_bp.route('/stats/runner', methods=['GET'])
@jwt_required()
def get_runner_stats():
    """Get stats for errand runner dashboard"""
    try:
        from models import Errand
        
        current_user_id = get_jwt_identity()
        
        # Count errands by status
        pending_count = Errand.query.filter_by(
            assigned_to=current_user_id,
            status='pending'
        ).count()
        
        accepted_count = Errand.query.filter_by(
            assigned_to=current_user_id,
            status='accepted'
        ).count()
        
        in_progress_count = Errand.query.filter_by(
            assigned_to=current_user_id,
            status='in_progress'
        ).count()
        
        submitted_count = Errand.query.filter_by(
            assigned_to=current_user_id,
            status='submitted'
        ).count()
        
        rejected_count = Errand.query.filter_by(
            assigned_to=current_user_id,
            status='rejected'
        ).count()
        
        completed_count = Errand.query.filter_by(
            assigned_to=current_user_id,
            status='completed'
        ).count()
        
        # Calculate total earnings (only approved/completed errands)
        completed_errands = Errand.query.filter_by(
            assigned_to=current_user_id,
            status='completed'
        ).all()
        
        total_earnings = sum([float(e.errand_fee or 0) for e in completed_errands])
        
        return jsonify({
            'success': True,
            'stats': {
                'pending': pending_count,
                'accepted': accepted_count,
                'in_progress': in_progress_count,
                'submitted': submitted_count,
                'rejected': rejected_count,
                'completed': completed_count,
                'total_errands': pending_count + accepted_count + in_progress_count + submitted_count + completed_count,
                'total_earnings': total_earnings
            }
        })
        
    except Exception as e:
        current_app.logger.error(f"Get runner stats error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch stats'}), 500

# Error handlers
@errand_bp.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'message': 'Resource not found'}), 404

@errand_bp.errorhandler(500)
def internal_error(error):
    current_app.logger.error(f'Server Error: {error}')
    return jsonify({'success': False, 'message': 'Internal server error'}), 500


@errand_bp.route('/errands/my/grouped', methods=['GET'])
@jwt_required()
def get_my_errands_grouped():
    """Get errands assigned to current user grouped by date with totals"""
    try:
        from models import Errand
        from sqlalchemy import func
        from datetime import datetime, timedelta
        
        current_user_id = get_jwt_identity()
        
        # Get all errands for this runner
        errands = Errand.query.filter_by(assigned_to=current_user_id)\
            .order_by(Errand.errand_date.desc(), Errand.created_at.desc())\
            .all()
        
        # Calculate totals
        today = datetime.now().date()
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        
        totals = {
            'today': 0,
            'week': 0,
            'month': 0,
            'all_time': 0
        }
        
        for errand in errands:
            if errand.status in ['approved', 'completed', 'paid']:
                fee = float(errand.errand_fee or 0)
                errand_date = errand.errand_date or errand.created_at.date()
                
                totals['all_time'] += fee
                
                if errand_date == today:
                    totals['today'] += fee
                if errand_date >= week_start:
                    totals['week'] += fee
                if errand_date >= month_start:
                    totals['month'] += fee
        
        return jsonify({
            'success': True,
            'errands': [e.to_dict() for e in errands],
            'totals': totals
        })
        
    except Exception as e:
        current_app.logger.error(f"Get grouped errands error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch errands'}), 500
    
@errand_bp.route('/errands/by-runner', methods=['GET'])
@jwt_required()
def get_errands_by_runner():
    """Get errands grouped by runner (admin/senior/manager only)"""
    try:
        from models import User, Errand
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'senior', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get all active runners
        runners = User.query.filter_by(role='errand', is_active=True).all()
        
        result = []
        for runner in runners:
            # Get errands for this runner
            errands = Errand.query.filter_by(assigned_to=runner.id)\
                .order_by(Errand.created_at.desc())\
                .all()
            
            # Calculate stats for this runner
            total_errands = len(errands)
            completed = sum(1 for e in errands if e.status in ['completed', 'approved'])
            pending = sum(1 for e in errands if e.status in ['pending', 'accepted', 'in_progress'])
            submitted = sum(1 for e in errands if e.status == 'submitted')
            rejected = sum(1 for e in errands if e.status == 'rejected')
            
            # Calculate earnings
            earnings = sum(float(e.errand_fee or 0) for e in errands if e.status in ['completed', 'approved'])
            
            result.append({
                'runner': runner.to_dict(),
                'stats': {
                    'total_errands': total_errands,
                    'completed': completed,
                    'pending': pending,
                    'submitted': submitted,
                    'rejected': rejected,
                    'earnings': earnings
                },
                'recent_errands': [e.to_dict() for e in errands[:5]]  # Last 5 errands
            })
        
        return jsonify({
            'success': True,
            'runners_data': result,
            'total_runners': len(runners)
        })
        
    except Exception as e:
        current_app.logger.error(f"Get errands by runner error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch runner data'}), 500


@errand_bp.route('/errands/runner/<int:runner_id>', methods=['GET'])
@jwt_required()
def get_runner_errands(runner_id):
    """Get all errands for a specific runner (admin/senior/manager only)"""
    try:
        from models import User, Errand
        
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['admin', 'senior', 'manager']:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        runner = User.query.get(runner_id)
        if not runner or runner.role != 'errand':
            return jsonify({'success': False, 'message': 'Runner not found'}), 404
        
        # Apply filters
        query = Errand.query.filter_by(assigned_to=runner_id)
        
        status = request.args.get('status')
        if status:
            query = query.filter(Errand.status == status)
        
        start_date = request.args.get('start_date')
        if start_date:
            query = query.filter(Errand.created_at >= datetime.fromisoformat(start_date.replace('Z', '+00:00')))
        
        end_date = request.args.get('end_date')
        if end_date:
            query = query.filter(Errand.created_at <= datetime.fromisoformat(end_date.replace('Z', '+00:00')))
        
        query = query.order_by(Errand.created_at.desc())
        
        # Pagination
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        total = query.count()
        errands = query.offset(offset).limit(limit).all()
        
        # Calculate earnings
        earnings = sum(float(e.errand_fee or 0) for e in errands if e.status in ['completed', 'approved'])
        
        return jsonify({
            'success': True,
            'runner': runner.to_dict(),
            'errands': [e.to_dict() for e in errands],
            'stats': {
                'total': total,
                'earnings': earnings,
                'completed': sum(1 for e in errands if e.status in ['completed', 'approved']),
                'pending': sum(1 for e in errands if e.status in ['pending', 'accepted', 'in_progress']),
                'submitted': sum(1 for e in errands if e.status == 'submitted'),
                'rejected': sum(1 for e in errands if e.status == 'rejected')
            },
            'limit': limit,
            'offset': offset,
            'total': total
        })
        
    except Exception as e:
        current_app.logger.error(f"Get runner errands error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to fetch runner errands'}), 500


# Development-only SMS test endpoint
@errand_bp.route('/test-sms', methods=['POST'])
def test_sms():
    """Development-only endpoint to test SMS sending via Africa's Talking."""
    # Disable in production
    if current_app.config.get('IS_PRODUCTION'):
        return jsonify({'success': False, 'message': 'Disabled in production'}), 403

    data = request.get_json() or {}
    phone = data.get('phone')
    message = data.get('message')

    if not phone or not message:
        return jsonify({'success': False, 'message': 'phone and message are required'}), 400

    result = send_sms(phone, message)
    return jsonify(result)