# backend/views/mpesa_routes.py
from flask import Blueprint, request, jsonify
import requests
import base64
from datetime import datetime
import os
from dotenv import load_dotenv
import json
import re
import time
from threading import Thread

load_dotenv()

mpesa_bp = Blueprint('mpesa', __name__)

# M-PESA Configuration - ALL FROM ENVIRONMENT VARIABLES
CONSUMER_KEY = os.getenv('MPESA_CONSUMER_KEY')
CONSUMER_SECRET = os.getenv('MPESA_CONSUMER_SECRET')
SHORTCODE = os.getenv('MPESA_SHORTCODE')
PASSKEY = os.getenv('MPESA_PASSKEY')
MPESA_ENV = os.getenv('MPESA_ENV', 'sandbox')
CALLBACK_URL = os.getenv('MPESA_CALLBACK_URL')
INITIATOR_NAME = os.getenv('MPESA_INITIATOR_NAME', 'testapi')

# Set base URL based on environment
BASE_URL = 'https://sandbox.safaricom.co.ke' if MPESA_ENV == 'sandbox' else 'https://api.safaricom.co.ke'

def simulate_sandbox_payment(checkout_request_id, order_id, amount, phone):
    """Simulate a successful payment in sandbox mode"""
    try:
        print(f"\n🎭 SANDBOX: Simulating payment for {checkout_request_id}")
        print(f"   Order: {order_id}, Amount: {amount}, Phone: {phone}")
        
        # Wait a bit to simulate processing time
        time.sleep(3)
        
        # Simulate callback data
        callback_data = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": f"sandbox-{int(time.time())}",
                    "CheckoutRequestID": checkout_request_id,
                    "ResultCode": 0,
                    "ResultDesc": "The service request is processed successfully.",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "Amount", "Value": float(amount)},
                            {"Name": "MpesaReceiptNumber", "Value": f"SBX{int(time.time())}"},
                            {"Name": "TransactionDate", "Value": int(time.strftime('%Y%m%d%H%M%S'))},
                            {"Name": "PhoneNumber", "Value": int(phone)},
                            {"Name": "AccountReference", "Value": f"ORDER{order_id}"}
                        ]
                    }
                }
            }
        }
        
        # Send simulated callback to ourselves
        try:
            response = requests.post(
                'http://localhost:5000/api/mpesa/callback',
                json=callback_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            print(f"✅ SANDBOX: Simulated callback sent")
        except Exception as e:
            print(f"⚠️  SANDBOX: Could not send simulated callback: {e}")
    except Exception as e:
        print(f"❌ SANDBOX: Simulation error: {e}")

def save_mpesa_payment_to_db(account_reference, transaction_details, checkout_request_id, merchant_request_id):
    """Save M-PESA payment to database (with delayed imports to avoid circular imports)"""
    try:
        # Extract order ID from AccountReference
        if not account_reference or not account_reference.startswith('ORDER'):
            print(f"⚠️  Invalid account reference format: {account_reference}")
            return False
        
        order_id = account_reference.replace('ORDER', '')
        if not order_id.isdigit():
            print(f"⚠️  Invalid order ID: {order_id}")
            return False
        
        order_id = int(order_id)
        
        print(f"💾 Attempting to save payment to database...")
        print(f"   Order ID: {order_id}")
        print(f"   M-PESA Receipt: {transaction_details.get('MpesaReceiptNumber')}")
        print(f"   Amount: {transaction_details.get('Amount')}")
        print(f"   Phone: {transaction_details.get('PhoneNumber')}")
        
        # Import inside function to avoid circular imports
        from app import db
        from models import Order, Payment
        
        # Find the order
        order = Order.query.filter_by(id=order_id).first()
        if not order:
            print(f"❌ Order not found: {order_id}")
            return False
        
        # Record payment arrived but do NOT mark order as paid/confirmed yet.
        # Admin will verify and confirm payment before sending SMS and confirming order.
        order.payment_method = 'mpesa'
        
        # Create payment record
        payment = Payment(
            order_id=order.id,
            payment_method='mpesa',
            amount=float(transaction_details.get('Amount', 0)),
            transaction_id=transaction_details.get('MpesaReceiptNumber'),
            phone_number=str(transaction_details.get('PhoneNumber', '')),
            status='received',
            notes=f"M-PESA Payment received (awaiting admin confirmation) - CheckoutID: {checkout_request_id}"
        )
        
        # Save to database
        db.session.add(payment)
        db.session.commit()
        
        print(f"✅ Payment saved successfully!")
        print(f"   Order #{order.order_number} - payment recorded (awaiting admin confirmation)")
        print(f"   Payment ID: {payment.id}")
        # NOTE: SMS sending moved to admin confirmation step. Do not auto-send here.
        return True
        
    except Exception as e:
        print(f"❌ Error saving to database: {e}")
        import traceback
        traceback.print_exc()
        return False

# Validation function
def validate_credentials():
    """Validate that all required credentials are present"""
    required_vars = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY']
    missing = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
    
    if missing:
        print(f"⚠️  WARNING: Missing M-PESA credentials in .env file: {', '.join(missing)}")
        return False
    
    return True

def get_access_token():
    """Get M-PESA OAuth access token"""
    try:
        # Check credentials first
        if not CONSUMER_KEY or not CONSUMER_SECRET:
            print("❌ ERROR: M-PESA credentials not found. Check your .env file")
            return None
        
        auth_string = f"{CONSUMER_KEY}:{CONSUMER_SECRET}"
        encoded_auth = base64.b64encode(auth_string.encode()).decode()
        
        headers = {'Authorization': f'Basic {encoded_auth}'}
        
        response = requests.get(
            f'{BASE_URL}/oauth/v1/generate?grant_type=client_credentials',
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            return response.json().get('access_token')
        else:
            print(f"❌ Token request failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error getting access token: {e}")
        return None

def generate_password(timestamp):
    """Generate M-PESA API password"""
    if not SHORTCODE or not PASSKEY:
        print("❌ ERROR: Missing SHORTCODE or PASSKEY in .env file")
        return None
    
    data = f"{SHORTCODE}{PASSKEY}{timestamp}"
    encoded = base64.b64encode(data.encode()).decode()
    return encoded

def format_phone_number(phone):
    """Format phone number for M-PESA"""
    # Remove any spaces or special characters
    phone = ''.join(filter(str.isdigit, phone))
    
    # Format: 254XXXXXXXXX
    if phone.startswith('0'):
        phone = '254' + phone[1:]
    elif not phone.startswith('254'):
        phone = '254' + phone
    
    return phone

def is_valid_phone(phone):
    """Validate Kenyan phone number"""
    # Clean the phone number
    phone = ''.join(filter(str.isdigit, phone))
    
    # Check if it's a valid Kenyan number
    patterns = [
        r'^2547\d{8}$',  # 2547XXXXXXXX
        r'^2541\d{8}$',  # 2541XXXXXXXX
        r'^07\d{8}$',    # 07XXXXXXXX
        r'^01\d{8}$'     # 01XXXXXXXX
    ]
    
    for pattern in patterns:
        if re.match(pattern, phone):
            return True
    
    return False

@mpesa_bp.route('/validate-phone', methods=['POST'])
def validate_phone():
    """Validate and format phone number"""
    try:
        from flask import g
        data = getattr(g, 'sanitized_json', None) or request.get_json(silent=True)
        
        if 'phone' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: phone'
            }), 400
        
        phone = data['phone']
        original_phone = phone
        
        # Validate phone number
        valid = is_valid_phone(phone)
        
        # Format phone number for M-PESA
        formatted_phone = format_phone_number(phone) if valid else None
        
        return jsonify({
            'success': True,
            'valid': valid,
            'formatted': formatted_phone,
            'original': original_phone,
            'message': 'Phone number validated successfully' if valid else 'Invalid phone number format'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error validating phone: {str(e)}'
        }), 500

@mpesa_bp.route('/token', methods=['GET'])
def get_token():
    """Get M-PESA access token endpoint"""
    # Validate credentials first
    if not validate_credentials():
        return jsonify({
            'success': False,
            'error': 'M-PESA credentials not configured. Check your .env file'
        }), 500
    
    token = get_access_token()
    
    if token:
        return jsonify({
            'success': True,
            'access_token': token[:10] + '...' if len(token) > 10 else token,  # Partial for security
            'message': 'Token retrieved successfully',
            'env': MPESA_ENV
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Failed to get access token. Check your credentials',
            'env': MPESA_ENV
        }), 500

@mpesa_bp.route('/stkpush', methods=['POST'])
def stk_push():
    """Initiate STK Push payment"""
    try:
        # Validate credentials first
        if not validate_credentials():
            return jsonify({
                'success': False,
                'error': 'M-PESA credentials not configured. Check your .env file'
            }), 500
        
        data = request.json
        
        # Validate required fields
        required_fields = ['phone', 'amount', 'order_id']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        phone = data['phone']
        amount = data['amount']
        order_id = data['order_id']
        
        # Validate phone number
        if not is_valid_phone(phone):
            return jsonify({
                'success': False,
                'error': 'Invalid phone number format. Please use Kenyan format: 07XXXXXXXX or 2547XXXXXXXX'
            }), 400
        
        # Validate amount
        try:
            amount_int = int(amount)
            if amount_int < 1:
                return jsonify({
                    'success': False,
                    'error': 'Amount must be at least KSh 1'
                }), 400
            if amount_int > 150000:  # M-PESA limit is usually 150,000
                return jsonify({
                    'success': False,
                    'error': 'Amount exceeds M-PESA limit of KSh 150,000'
                }), 400
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Invalid amount. Must be a number'
            }), 400
        
        # Get access token
        access_token = get_access_token()
        if not access_token:
            return jsonify({
                'success': False,
                'error': 'Failed to get M-PESA access token. Check your credentials'
            }), 500
        
        # Format phone number
        formatted_phone = format_phone_number(phone)
        
        # Generate timestamp
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        # Generate password
        password = generate_password(timestamp)
        if not password:
            return jsonify({
                'success': False,
                'error': 'Failed to generate password. Check SHORTCODE and PASSKEY in .env'
            }), 500
        
        # Prepare STK Push payload
        payload = {
            "BusinessShortCode": SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": formatted_phone,
            "PartyB": SHORTCODE,
            "PhoneNumber": formatted_phone,
            "CallBackURL": CALLBACK_URL,
            "AccountReference": f"ORDER{order_id}",
            "TransactionDesc": f"Payment for Order {order_id}"
        }
        
        # Send STK Push request
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f'{BASE_URL}/mpesa/stkpush/v1/processrequest',
            json=payload,
            headers=headers,
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200:
            # Check response code
            if response_data.get('ResponseCode') == '0':
                response_obj = {
                    'success': True,
                    'message': response_data.get('CustomerMessage', 'STK Push sent successfully'),
                    'checkout_request_id': response_data.get('CheckoutRequestID'),
                    'merchant_request_id': response_data.get('MerchantRequestID'),
                    'response_code': response_data.get('ResponseCode'),
                    'env': MPESA_ENV
                }
                
                # In sandbox, simulate a successful payment
                if MPESA_ENV == 'sandbox':
                    response_obj['note'] = 'In sandbox, payment will be automatically simulated'
                    # Start simulation in background thread
                    Thread(target=simulate_sandbox_payment, args=(
                        response_data.get('CheckoutRequestID'),
                        order_id,
                        amount,
                        formatted_phone
                    )).start()
                
                return jsonify(response_obj)
            else:
                return jsonify({
                    'success': False,
                    'error': response_data.get('CustomerMessage', 'STK Push failed'),
                    'response_code': response_data.get('ResponseCode'),
                    'env': MPESA_ENV
                }), 400
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to initiate STK Push',
                'details': response_data.get('errorMessage', 'Unknown error'),
                'env': MPESA_ENV
            }), 500
            
    except requests.exceptions.Timeout:
        return jsonify({
            'success': False,
            'error': 'Request timeout. Please try again.',
            'env': MPESA_ENV
        }), 408
    except Exception as e:
        print(f"❌ STK Push error: {e}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'env': MPESA_ENV
        }), 500

@mpesa_bp.route('/query', methods=['POST'])
def query_transaction():
    """Query transaction status"""
    try:
        data = request.json
        
        # Validate required fields
        if 'checkout_request_id' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: checkout_request_id'
            }), 400
        
        checkout_request_id = data['checkout_request_id']
        
        print(f"🔍 Querying transaction status for CheckoutRequestID: {checkout_request_id}")
        
        # =============================================
        # SANDBOX MODE - SIMULATE RESPONSE
        # =============================================
        if MPESA_ENV == 'sandbox':
            print("📱 Sandbox mode detected - simulating query response")
            
            # Simulate different responses based on checkout ID
            if checkout_request_id.startswith('ws_CO_TEST_'):
                # Test payment - simulate success
                print(f"✅ Sandbox test payment - simulating success for {checkout_request_id}")
                
                # In a real scenario, you might want to check if payment was actually received
                # For now, we'll simulate success after a short delay
                import time
                time.sleep(1)  # Simulate processing time
                
                return jsonify({
                    'success': True,
                    'result_code': '0',
                    'result_desc': 'The service request has been accepted successfully',
                    'checkout_request_id': checkout_request_id,
                    'merchant_request_id': 'sandbox-test',
                    'env': MPESA_ENV,
                    'note': 'Sandbox simulation - Payment successful',
                    'data': {
                        'ResultCode': '0',
                        'ResultDesc': 'The service request has been accepted successfully'
                    }
                })
            else:
                # Unknown checkout ID - simulate failure
                print(f"❌ Unknown sandbox checkout ID: {checkout_request_id}")
                return jsonify({
                    'success': False,
                    'result_code': '1032',
                    'result_desc': 'Request cancelled by user',
                    'checkout_request_id': checkout_request_id,
                    'env': MPESA_ENV,
                    'note': 'Sandbox simulation - Checkout ID not found',
                    'data': {
                        'ResultCode': '1032',
                        'ResultDesc': 'Request cancelled by user'
                    }
                })
        
        # =============================================
        # PRODUCTION MODE - REAL M-PESA API CALL
        # =============================================
        # Validate credentials first
        if not validate_credentials():
            return jsonify({
                'success': False,
                'error': 'M-PESA credentials not configured. Check your .env file'
            }), 500
        
        # Get access token
        access_token = get_access_token()
        if not access_token:
            return jsonify({
                'success': False,
                'error': 'Failed to get M-PESA access token. Check your credentials'
            }), 500
        
        # Generate timestamp
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        # Generate password
        password = generate_password(timestamp)
        if not password:
            return jsonify({
                'success': False,
                'error': 'Failed to generate password. Check SHORTCODE and PASSKEY in .env'
            }), 500
        
        # Prepare query payload
        payload = {
            "BusinessShortCode": SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }
        
        # Send query request
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f'{BASE_URL}/mpesa/stkpushquery/v1/query',
            json=payload,
            headers=headers,
            timeout=30
        )
        
        response_data = response.json()
        
        if response.status_code == 200:
            return jsonify({
                'success': True,
                'result_code': response_data.get('ResultCode'),
                'result_desc': response_data.get('ResultDesc'),
                'checkout_request_id': response_data.get('CheckoutRequestID'),
                'merchant_request_id': response_data.get('MerchantRequestID'),
                'env': MPESA_ENV,
                'data': {
                    'ResultCode': response_data.get('ResultCode'),
                    'ResultDesc': response_data.get('ResultDesc')
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to query transaction',
                'details': response_data.get('errorMessage', 'Unknown error'),
                'env': MPESA_ENV
            }), 500
            
    except requests.exceptions.Timeout:
        return jsonify({
            'success': False,
            'error': 'Query timeout. Please try again.',
            'env': MPESA_ENV
        }), 408
    except Exception as e:
        print(f"❌ Query error: {e}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
            'env': MPESA_ENV
        }), 500
    
    
@mpesa_bp.route('/callback', methods=['POST'])
def callback():
    """M-PESA payment callback (webhook)"""
    try:
        # Get callback data
        callback_data = request.json
        
        print("=" * 60)
        print(f"M-PESA CALLBACK RECEIVED [{MPESA_ENV.upper()}]")
        print("=" * 60)
        print(json.dumps(callback_data, indent=2))
        print("=" * 60)
        
        # Extract important data
        body = callback_data.get('Body', {})
        stk_callback = body.get('stkCallback', {})
        
        result_code = stk_callback.get('ResultCode')
        result_desc = stk_callback.get('ResultDesc')
        checkout_request_id = stk_callback.get('CheckoutRequestID')
        merchant_request_id = stk_callback.get('MerchantRequestID')
        
        # Process based on result code
        if result_code == 0:
            # Payment successful
            callback_metadata = stk_callback.get('CallbackMetadata', {})
            items = callback_metadata.get('Item', [])
            
            # Extract transaction details
            transaction_details = {}
            account_reference = None
            for item in items:
                transaction_details[item.get('Name')] = item.get('Value')
                if item.get('Name') == 'AccountReference':
                    account_reference = item.get('Value')
            
            # If no AccountReference in callback metadata, try to extract from description
            if not account_reference and 'TransactionDesc' in transaction_details:
                desc = transaction_details['TransactionDesc']
                if 'ORDER' in desc:
                    # Extract from something like "Payment for Order 123"
                    import re
                    match = re.search(r'ORDER(\d+)', desc)
                    if match:
                        account_reference = f"ORDER{match.group(1)}"
            
            print(f"✅ PAYMENT SUCCESSFUL [{MPESA_ENV.upper()}]")
            print(f"   CheckoutRequestID: {checkout_request_id}")
            print(f"   Amount: KSh {transaction_details.get('Amount', 'N/A')}")
            print(f"   M-PESA Receipt: {transaction_details.get('MpesaReceiptNumber', 'N/A')}")
            print(f"   Phone: {transaction_details.get('PhoneNumber', 'N/A')}")
            print(f"   TransactionDate: {transaction_details.get('TransactionDate', 'N/A')}")
            print(f"   Account Reference: {account_reference or 'N/A'}")
            
            # Try to save to database with delayed import to avoid circular imports
            try:
                save_mpesa_payment_to_db(account_reference, transaction_details, checkout_request_id, merchant_request_id)
            except Exception as db_error:
                print(f"⚠️  Database save error (non-critical): {db_error}")
                # Continue even if database save fails
            
            # TODO: Send confirmation email/SMS to customer
            
        else:
            # Payment failed
            print(f"❌ PAYMENT FAILED [{MPESA_ENV.upper()}]")
            print(f"   ResultCode: {result_code}")
            print(f"   ResultDesc: {result_desc}")
            print(f"   CheckoutRequestID: {checkout_request_id}")
        
        # Always return success to M-PESA
        return jsonify({
            "ResultCode": 0,
            "ResultDesc": "Success"
        })
        
    except Exception as e:
        print(f"❌ Callback error: {e}")
        # Still return success to M-PESA to avoid retries
        return jsonify({
            "ResultCode": 0,
            "ResultDesc": "Success"
        })

@mpesa_bp.route('/test-payment', methods=['POST'])
def test_payment():
    """Test payment endpoint for sandbox"""
    try:
        data = request.json
        
        if MPESA_ENV != 'sandbox':
            return jsonify({
                'success': False,
                'error': 'Test endpoint only available in sandbox mode',
                'env': MPESA_ENV
            }), 400
        
        # Default values for testing
        phone = data.get('phone', '254708374149')
        amount = data.get('amount', 1)
        order_id = data.get('order_id', f"TEST{int(time.time())}")
        
        # Validate phone
        if not is_valid_phone(phone):
            return jsonify({
                'success': False,
                'error': 'Invalid phone number format',
                'env': MPESA_ENV
            }), 400
        
        formatted_phone = format_phone_number(phone)
        
        # Generate fake transaction data
        receipt_number = f"SBX{int(time.time())}"
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        checkout_id = f"ws_CO_TEST_{order_id}"
        
        # Create simulated callback
        callback_data = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": f"sandbox-test-{order_id}",
                    "CheckoutRequestID": checkout_id,
                    "ResultCode": 0,
                    "ResultDesc": "Test payment successful",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "Amount", "Value": float(amount)},
                            {"Name": "MpesaReceiptNumber", "Value": receipt_number},
                            {"Name": "TransactionDate", "Value": timestamp},
                            {"Name": "PhoneNumber", "Value": int(formatted_phone)},
                            {"Name": "AccountReference", "Value": f"ORDER{order_id}"}
                        ]
                    }
                }
            }
        }
        
        # Process the callback in background
        def process_test_callback():
            time.sleep(1)
            try:
                requests.post(
                    'http://localhost:5000/api/mpesa/callback',
                    json=callback_data,
                    headers={'Content-Type': 'application/json'}
                )
            except:
                pass
        
        Thread(target=process_test_callback).start()
            
        return jsonify({
            'success': True,
            'message': 'Test payment simulated successfully',
            'env': MPESA_ENV,
            'receipt_number': receipt_number,
            'order_id': order_id,
            'amount': amount,
            'phone': phone,
            'checkout_request_id': checkout_id,
            'simulated': True,
            'note': 'Callback will be processed in background'
        })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Test error: {str(e)}',
            'env': MPESA_ENV
        }), 500

@mpesa_bp.route('/config', methods=['GET'])
def get_config():
    """Get M-PESA configuration (without sensitive data)"""
    # NEVER expose full credentials
    return jsonify({
        'success': True,
        'config': {
            'env': MPESA_ENV,
            'shortcode': SHORTCODE,
            'callback_url': CALLBACK_URL,
            'initiator': INITIATOR_NAME,
            'credentials_configured': bool(CONSUMER_KEY and CONSUMER_SECRET and PASSKEY),
            'consumer_key_configured': bool(CONSUMER_KEY),
            'consumer_secret_configured': bool(CONSUMER_SECRET),
            'passkey_configured': bool(PASSKEY)
        }
    })

@mpesa_bp.route('/test-connection', methods=['GET'])
def test_connection():
    """Test M-PESA API connection"""
    try:
        token = get_access_token()
        
        if token:
            return jsonify({
                'success': True,
                'message': f'M-PESA API connection successful [{MPESA_ENV.upper()}]',
                'env': MPESA_ENV,
                'token_obtained': True,
                'credentials_valid': True
            })
        else:
            return jsonify({
                'success': False,
                'message': f'M-PESA API connection failed [{MPESA_ENV.upper()}]',
                'env': MPESA_ENV,
                'token_obtained': False,
                'credentials_valid': False,
                'error': 'Check your .env file credentials'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'M-PESA API connection error: {str(e)}',
            'env': MPESA_ENV,
            'error': str(e)
        }), 500

@mpesa_bp.route('/', methods=['GET'])
def index():
    """M-PESA API documentation"""
    return jsonify({
        'service': 'M-PESA Payment Gateway',
        'environment': MPESA_ENV,
        'endpoints': {
            'GET /': 'This documentation',
            'GET /config': 'Get configuration status',
            'GET /test-connection': 'Test M-PESA API connection',
            'POST /validate-phone': 'Validate and format phone number',
            'GET /token': 'Get access token',
            'POST /stkpush': 'Initiate STK Push payment',
            'POST /query': 'Query transaction status',
            'POST /callback': 'M-PESA payment callback (webhook)',
            'POST /test-payment': 'Test payment (sandbox only)'
        },
        'note': 'All sensitive credentials are stored in environment variables',
        'sandbox_test_numbers': [
            '254708374149',
            '254700000000',
            '254711111111'
        ],
        'sandbox_test_pin': '174379',
        'sandbox_features': 'Auto-simulation enabled for testing'
    })


