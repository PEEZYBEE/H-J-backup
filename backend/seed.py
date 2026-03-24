from app import app, db
from models import User, Category, Product
import os
import secrets

def seed_database():
    with app.app_context():
        print("🌱 Seeding database...")
        
        # Create admin user
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                email='admin@hnj.com',
                role='admin',
                full_name='Admin User',
                phone='+1234567890'
            )
            admin_pw = os.getenv('SEED_ADMIN_PASSWORD')
            if not admin_pw:
                admin_pw = secrets.token_urlsafe(12)
                print(f"Generated admin password: {admin_pw}")
            admin.set_password(admin_pw)
            db.session.add(admin)
            print("✅ Created admin user")
        
        # Create cashier user
        if not User.query.filter_by(username='cashier').first():
            cashier = User(
                username='cashier',
                email='cashier@hnj.com',
                role='cashier',
                full_name='Cashier User',
                phone='+1234567891'
            )
            cashier_pw = os.getenv('SEED_CASHIER_PASSWORD')
            if not cashier_pw:
                cashier_pw = secrets.token_urlsafe(12)
                print(f"Generated cashier password: {cashier_pw}")
            cashier.set_password(cashier_pw)
            db.session.add(cashier)
            print("✅ Created cashier user")
        
        # Create customer user
        if not User.query.filter_by(username='customer').first():
            customer = User(
                username='customer',
                email='customer@hnj.com',
                role='customer',
                full_name='Customer User',
                phone='+1234567892'
            )
            customer_pw = os.getenv('SEED_CUSTOMER_PASSWORD')
            if not customer_pw:
                customer_pw = secrets.token_urlsafe(12)
                print(f"Generated customer password: {customer_pw}")
            customer.set_password(customer_pw)
            db.session.add(customer)
            print("✅ Created customer user")
        
        # Create categories
        categories = [
            {'name': 'Electronics', 'description': 'Electronic devices and accessories'},
            {'name': 'Clothing', 'description': 'Men and women clothing'},
            {'name': 'Groceries', 'description': 'Food and beverages'},
            {'name': 'Home & Kitchen', 'description': 'Home appliances and kitchenware'},
            {'name': 'Books', 'description': 'Books and magazines'},
            {'name': 'Sports', 'description': 'Sports equipment and apparel'},
            {'name': 'Health & Beauty', 'description': 'Health and beauty products'},
            {'name': 'Toys & Games', 'description': 'Toys and games for all ages'},
        ]
        
        for cat_data in categories:
            if not Category.query.filter_by(name=cat_data['name']).first():
                category = Category(
                    name=cat_data['name'],
                    description=cat_data['description']
                )
                db.session.add(category)
                print(f"✅ Created category: {cat_data['name']}")
        
        db.session.commit()
        
        # Create sample products
        electronics_id = Category.query.filter_by(name='Electronics').first().id
        clothing_id = Category.query.filter_by(name='Clothing').first().id
        groceries_id = Category.query.filter_by(name='Groceries').first().id
        
        products = [
            {
                'sku': 'ELEC-001',
                'name': 'Smartphone X',
                'description': 'Latest smartphone with amazing features',
                'category_id': electronics_id,
                'price': 699.99,
                'cost_price': 450.00,
                'stock_quantity': 50,
                'barcode': '123456789012',
                'image_urls': ['https://via.placeholder.com/300'],
                'specifications': {'brand': 'TechBrand', 'model': 'X-2023', 'color': 'Black', 'storage': '128GB'}
            },
            {
                'sku': 'ELEC-002',
                'name': 'Wireless Headphones',
                'description': 'Noise cancelling wireless headphones',
                'category_id': electronics_id,
                'price': 199.99,
                'cost_price': 120.00,
                'stock_quantity': 100,
                'barcode': '123456789013',
                'image_urls': ['https://via.placeholder.com/300'],
                'specifications': {'brand': 'AudioPro', 'model': 'NC-100', 'color': 'White', 'battery': '30h'}
            },
            {
                'sku': 'CLOTH-001',
                'name': 'Cotton T-Shirt',
                'description': '100% cotton comfortable t-shirt',
                'category_id': clothing_id,
                'price': 19.99,
                'cost_price': 8.50,
                'stock_quantity': 200,
                'barcode': '123456789014',
                'image_urls': ['https://via.placeholder.com/300'],
                'specifications': {'size': 'M', 'color': 'Blue', 'material': 'Cotton', 'fit': 'Regular'}
            },
            {
                'sku': 'GROC-001',
                'name': 'Basmati Rice 5kg',
                'description': 'Premium quality basmati rice',
                'category_id': groceries_id,
                'price': 12.99,
                'cost_price': 8.00,
                'stock_quantity': 150,
                'barcode': '123456789015',
                'image_urls': ['https://via.placeholder.com/300'],
                'specifications': {'weight': '5kg', 'type': 'Basmati', 'origin': 'India'}
            },
            {
                'sku': 'GROC-002',
                'name': 'Olive Oil 1L',
                'description': 'Extra virgin olive oil',
                'category_id': groceries_id,
                'price': 15.99,
                'cost_price': 10.00,
                'stock_quantity': 80,
                'barcode': '123456789016',
                'image_urls': ['https://via.placeholder.com/300'],
                'specifications': {'volume': '1L', 'type': 'Extra Virgin', 'origin': 'Spain'}
            },
        ]
        
        for prod_data in products:
            if not Product.query.filter_by(sku=prod_data['sku']).first():
                product = Product(**prod_data)
                db.session.add(product)
                print(f"✅ Created product: {prod_data['name']}")
        
        db.session.commit()
        print("\n🎉 Database seeding completed successfully!")

if __name__ == '__main__':
    seed_database()
