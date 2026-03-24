import requests
import json
from typing import Dict, List, Optional

class FrappeClient:
    """Client for interacting with local Frappe instance"""
    def __init__(self):
        import os
        self.base_url = os.getenv('FRAPPE_BASE_URL', 'http://localhost:8000')
        self.session = requests.Session()
        self.logged_in = False

    def login(self, username: str = None, password: str = None):
        """Login to Frappe using environment variables"""
        import os
        if username is None:
            username = os.getenv('FRAPPE_ADMIN_USER', 'Administrator')
        if password is None:
            password = os.getenv('FRAPPE_ADMIN_PASSWORD')
        login_url = f"{self.base_url}/api/method/login"
        response = self.session.post(login_url, json={
            'usr': username,
            'pwd': password
        })
        self.logged_in = response.status_code == 200
        return self.logged_in

    def _get_headers(self):
        return {'Content-Type': 'application/json'}

    def create_customer(self, customer_data: Dict) -> Dict:
        if not self.logged_in:
            self.login()
        url = f"{self.base_url}/api/resource/Customer"
        payload = {
            "customer_name": f"{customer_data.get('first_name', '')} {customer_data.get('last_name', '')}".strip(),
            "customer_type": "Individual",
            "customer_group": "Individual",
            "territory": customer_data.get('country', 'United States'),
            "email": customer_data.get('email'),
            "mobile_no": customer_data.get('phone'),
            "custom_fields": {
                "flask_user_id": customer_data.get('id')
            }
        }
        response = self.session.post(url, json=payload, headers=self._get_headers())
        return response.json()

    def create_sales_order(self, order_data: Dict) -> Dict:
        if not self.logged_in:
            self.login()
        url = f"{self.base_url}/api/resource/Sales Order"
        items = []
        for item in order_data.get('items', []):
            item_payload = {
                "item_code": item.get('sku'),
                "qty": item.get('quantity'),
                "rate": item.get('price')
            }
            # Add warehouse if present
            warehouse = item.get('warehouse') or item.get('delivery_warehouse') or item.get('target_warehouse')
            if warehouse:
                item_payload["warehouse"] = warehouse
            items.append(item_payload)
        payload = {
            "customer": order_data.get('frappe_customer_id'),
            "transaction_date": order_data.get('created_at', '').split('T')[0],
            "delivery_date": order_data.get('estimated_delivery', ''),
            "items": items,
            "custom_fields": {
                "flask_order_id": order_data.get('id')
            }
        }
        response = self.session.post(url, json=payload, headers=self._get_headers())
        return response.json()

    def get_inventory(self, item_code: str) -> Dict:
        if not self.logged_in:
            self.login()
        url = f"{self.base_url}/api/resource/Bin"
        params = {
            "filters": json.dumps([["item_code", "=", item_code]])
        }
        response = self.session.get(url, params=params, headers=self._get_headers())
        return response.json()

    def create_item(self, item_data: Dict) -> Dict:
        if not self.logged_in:
            self.login()
        url = f"{self.base_url}/api/resource/Item"
        payload = {
            "item_code": item_data.get('sku'),
            "item_name": item_data.get('name'),
            "item_group": item_data.get('category', 'Products'),
            "stock_uom": "Nos",
            "is_stock_item": 1,
            "opening_stock": item_data.get('initial_stock', 0),
            "standard_rate": item_data.get('price'),
            "custom_fields": {
                "flask_product_id": item_data.get('id')
            }
        }
        response = self.session.post(url, json=payload, headers=self._get_headers())
        return response.json()
