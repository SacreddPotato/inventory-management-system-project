"""
Database models and data access layer for inventory management.
"""

import mysql.connector
from config import DB_CONFIG


def get_db():
    """Get a MySQL database connection."""
    return mysql.connector.connect(**DB_CONFIG)


def get_all_products():
    """Retrieve all products from the database."""
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, name, count, reserved FROM products")
    products = cursor.fetchall()
    cursor.close()
    db.close()
    return products


def get_product_by_id(product_id):
    """Retrieve a single product by ID."""
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, name, count, reserved FROM products WHERE id = %s", (product_id,))
    product = cursor.fetchone()
    cursor.close()
    db.close()
    return product


def create_product(product_id, name, count=1):
    """Create a new product."""
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO products (id, name, count, reserved) VALUES (%s, %s, %s, 0)",
        (product_id, name, count)
    )
    db.commit()
    cursor.close()
    db.close()


def update_product_count(product_id, delta):
    """Update product count by a delta value."""
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE products SET count = count + %s WHERE id = %s",
        (delta, product_id)
    )
    db.commit()
    cursor.close()
    db.close()


def process_sale(product_id):
    """
    Process a sale: decrement count and increment reserved.
    Returns True if successful, False if insufficient stock.
    """
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    try:
        # Check current stock
        cursor.execute("SELECT count FROM products WHERE id = %s FOR UPDATE", (product_id,))
        product = cursor.fetchone()
        
        if not product or product['count'] <= 0:
            return False
        
        # Update stock
        cursor.execute(
            "UPDATE products SET count = count - 1, reserved = reserved + 1 WHERE id = %s",
            (product_id,)
        )
        db.commit()
        return True
    finally:
        cursor.close()
        db.close()


def add_to_bin(bin_table, item_id):
    """Add an item to repair_bin or trash_bin."""
    db = get_db()
    cursor = db.cursor(dictionary=True)
    
    cursor.execute(f"SELECT count FROM {bin_table} WHERE id = %s", (item_id,))
    row = cursor.fetchone()
    
    if row:
        cursor.execute(f"UPDATE {bin_table} SET count = count + 1 WHERE id = %s", (item_id,))
    else:
        cursor.execute(f"INSERT INTO {bin_table} (id, count) VALUES (%s, 1)", (item_id,))
    
    db.commit()
    cursor.close()
    db.close()
