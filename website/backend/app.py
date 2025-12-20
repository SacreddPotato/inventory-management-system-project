from flask import Flask, request, jsonify, send_from_directory
import mysql.connector
import os

app = Flask(__name__, static_folder='../') 

# Update with your MySQL password
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'inventory_db'
}

def get_db():
    return mysql.connector.connect(**DB_CONFIG)


# Serve frontend
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)


@app.route("/api/inventory", methods=["GET"])
def get_inventory():
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()
    cursor.close()
    db.close()

    for p in products:
        p['status'] = "Out" if p['count'] == 0 else "Low" if p['count'] < 5 else "OK"

    return jsonify(products)


@app.route("/api/check-in", methods=["POST"])
def check_in():
    data = request.json
    barcode = data["barcode"]
    is_broken = data.get("isBroken", False)

    db = get_db()
    cursor = db.cursor(dictionary=True)

    cursor.execute("SELECT * FROM products WHERE id = %s", (barcode,))
    product = cursor.fetchone()

    if product:
        if not is_broken:
            cursor.execute("UPDATE products SET count = count + 1 WHERE id = %s", (barcode,))
    else:
        cursor.execute(
            "INSERT INTO products (id, name, count, reserved) VALUES (%s, %s, %s, 0)",
            (barcode, "Auto Product", 0 if is_broken else 1)
        )

    db.commit()
    cursor.close()
    db.close()

    return jsonify({
        "success": True,
        "shelfLocation": "Quarantine Q-1" if is_broken else "Shelf A-12",
        "message": "Added successfully"
    })


@app.route("/api/return", methods=["POST"])
def process_return():
    data = request.json
    return_id = data["returnId"]
    destination = data["destination"]

    db = get_db()
    cursor = db.cursor()

    if destination == "shelf":
        cursor.execute("UPDATE products SET count = count + 1 WHERE id = %s", (return_id,))
    elif destination in ("repair", "trash"):
        table = f"{destination}_bin"
        cursor.execute(f"INSERT INTO {table} (id, count) VALUES (%s, 1) ON DUPLICATE KEY UPDATE count = count + 1", (return_id,))
    else:
        return jsonify({"success": False, "message": "Invalid destination"}), 400

    db.commit()
    cursor.close()
    db.close()
    return jsonify({"success": True})


@app.route("/api/simulate-sale", methods=["POST"])
def simulate_sale():
    barcode = request.json["barcode"]

    db = get_db()
    db.start_transaction()
    cursor = db.cursor(dictionary=True)

    # FOR UPDATE locks the row until transaction commits
    cursor.execute("SELECT count FROM products WHERE id = %s FOR UPDATE", (barcode,))
    product = cursor.fetchone()

    if not product or product['count'] <= 0:
        db.rollback()
        cursor.close()
        db.close()
        return jsonify({"message": "Overselling Prevented"}), 400

    cursor.execute(
        "UPDATE products SET count = count - 1, reserved = reserved + 1 WHERE id = %s",
        (barcode,)
    )
    db.commit()
    cursor.close()
    db.close()
    return jsonify({"message": "Sale successful"})


@app.route("/api/test-concurrent-sales", methods=["POST"])
def test_concurrent_sales():
    """Test concurrent sales to demonstrate row locking."""
    import concurrent.futures
    import time

    barcode = request.json["barcode"]
    num_requests = request.json.get("numRequests", 5)

    # Get initial count
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT count FROM products WHERE id = %s", (barcode,))
    product = cursor.fetchone()
    cursor.close()
    db.close()

    if not product:
        return jsonify({"error": "Product not found"}), 404

    initial_count = product['count']
    results = []

    def attempt_sale(request_id):
        start = time.time()
        db = get_db()
        db.start_transaction()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT count FROM products WHERE id = %s FOR UPDATE", (barcode,))
        product = cursor.fetchone()
        lock_acquired = time.time()

        if not product or product['count'] <= 0:
            db.rollback()
            cursor.close()
            db.close()
            return {
                "request": request_id,
                "success": False,
                "waitTime": round((lock_acquired - start) * 1000, 2),
                "message": "Overselling Prevented"
            }

        # Simulate some processing time to make race condition more visible
        time.sleep(0.1)

        cursor.execute(
            "UPDATE products SET count = count - 1, reserved = reserved + 1 WHERE id = %s",
            (barcode,)
        )
        db.commit()
        cursor.close()
        db.close()
        return {
            "request": request_id,
            "success": True,
            "waitTime": round((lock_acquired - start) * 1000, 2),
            "message": "Sale successful"
        }

    # Run all requests concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_requests) as executor:
        futures = [executor.submit(attempt_sale, i + 1) for i in range(num_requests)]
        results = [f.result() for f in futures]

    # Get final count
    db = get_db()
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT count, reserved FROM products WHERE id = %s", (barcode,))
    final = cursor.fetchone()
    cursor.close()
    db.close()

    successful = sum(1 for r in results if r['success'])
    prevented = sum(1 for r in results if not r['success'])

    return jsonify({
        "initialCount": initial_count,
        "finalCount": final['count'],
        "finalReserved": final['reserved'],
        "totalRequests": num_requests,
        "successful": successful,
        "prevented": prevented,
        "results": sorted(results, key=lambda x: x['waitTime'])
    })


if __name__ == "__main__":
    app.run(debug=True, threaded=True)
