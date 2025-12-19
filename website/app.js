/* * ==========================================================================
 * MESSAGE TO BACKEND AI:
 * This Frontend file expects a REST API running on http://localhost:5000.
 * Please generate the Backend endpoints to match the 'fetch' calls below.
 * ==========================================================================
 */

const API_BASE_URL = "http://localhost:5000/api";

document.addEventListener('DOMContentLoaded', () => {
    
    // === NAVIGATION LOGIC (Tabs) ===
    const navButtons = document.querySelectorAll('.nav-btn');
    const panels = document.querySelectorAll('.panel');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.add('hidden'));

            button.classList.add('active');
            const targetId = button.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('hidden');

            if (targetId === 'stock-panel') loadStockData();
        });
    });

    // === EVENT LISTENERS ===
    document.getElementById('btn-refresh').addEventListener('click', loadStockData);
    document.getElementById('btn-add-stock').addEventListener('click', checkInItem);
    document.getElementById('btn-run-test').addEventListener('click', runFakeSale);

    document.getElementById('btn-action-restock').addEventListener('click', () => handleReturn('shelf'));
    document.getElementById('btn-action-repair').addEventListener('click', () => handleReturn('repair'));
    document.getElementById('btn-action-trash').addEventListener('click', () => handleReturn('trash'));

    // Initial Load
    loadStockData();
});


// --- FUNCTIONS ---

/* * ------------------------------------------------------------------
 * BACKEND INSTRUCTION for AI:
 * Endpoint: GET /api/inventory
 * Goal: Retrieve all products and their current stock levels.
 * Response Format (JSON):
 * [
 * { "id": "101", "name": "Wireless Mouse", "count": 50, "reserved": 2, "status": "OK" },
 * { "id": "102", "name": "HDMI Cable", "count": 12, "reserved": 0, "status": "Low" }
 * ]
 * ------------------------------------------------------------------
 */
async function loadStockData() {
    const tableBody = document.getElementById('stock-body');
    tableBody.innerHTML = '<tr><td colspan="5">Loading data from Backend...</td></tr>';

    try {
        // UNCOMMENT THIS WHEN BACKEND IS READY:
        // const response = await fetch(`${API_BASE_URL}/inventory`);
        // const items = await response.json();

        // --- MOCK DATA (Remove this block when connecting to real Backend) ---
        const items = [
            { id: "101", name: "Mouse (Mock)", count: 50, reserved: 2, status: "OK" },
            { id: "102", name: "HDMI (Mock)", count: 12, reserved: 0, status: "Low" }
        ];
        // --------------------------------------------------------------------

        tableBody.innerHTML = '';
        items.forEach(item => {
            tableBody.innerHTML += `
                <tr>
                    <td>#${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.count}</td>
                    <td>${item.reserved}</td>
                    <td><span class="badge">${item.status}</span></td>
                </tr>
            `;
        });
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="5" style="color:red">Error: ${error.message}</td></tr>`;
    }
}


/* * ------------------------------------------------------------------
 * BACKEND INSTRUCTION for AI:
 * Endpoint: POST /api/check-in
 * Goal: Process an incoming shipment scan.
 * Request Body (JSON): { "barcode": "101", "isBroken": false }
 * Logic:
 * - If isBroken == true: Flag item as damaged in DB. Return shelfLocation: "Quarantine".
 * - If isBroken == false: Increment stock in DB. Return shelfLocation: "Shelf A-12".
 * Response Format (JSON): { "success": true, "shelfLocation": "Shelf A-12", "message": "Added" }
 * ------------------------------------------------------------------
 */
async function checkInItem() {
    const barcode = document.getElementById('barcode-input').value;
    const isBroken = document.getElementById('check-broken').checked;
    
    if (!barcode) return alert("Enter barcode");

    try {
        // UNCOMMENT THIS WHEN BACKEND IS READY:
        /*
        const response = await fetch(`${API_BASE_URL}/check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode: barcode, isBroken: isBroken })
        });
        const data = await response.json();
        */

        // --- MOCK RESPONSE ---
        const data = { success: true, shelfLocation: isBroken ? "Quarantine Q-1" : "Shelf A-12" };
        // ---------------------

        // Display Result
        const resultBox = document.getElementById('shelf-result');
        resultBox.classList.remove('hidden');
        document.getElementById('shelf-location').innerText = data.shelfLocation;
        
        if (isBroken) {
            resultBox.style.backgroundColor = "#fadbd8";
            resultBox.style.color = "darkred";
        } else {
            resultBox.style.backgroundColor = "#d4edda";
            resultBox.style.color = "darkgreen";
        }

    } catch (error) {
        alert("Backend Error: " + error.message);
    }
}


/* * ------------------------------------------------------------------
 * BACKEND INSTRUCTION for AI:
 * Endpoint: POST /api/return
 * Goal: Process a returned item.
 * Request Body (JSON): { "returnId": "500", "condition": "good", "destination": "shelf" }
 * Logic:
 * - destination "shelf": Add +1 to stock.
 * - destination "repair": Add +1 to repair_bin table.
 * - destination "trash": Do not add to stock (Log as discard).
 * ------------------------------------------------------------------
 */
async function handleReturn(destination) {
    const returnId = document.getElementById('return-id').value;
    const condition = document.getElementById('condition-select').value;
    
    if(!returnId) return alert("Enter Return ID");

    // Frontend Validation
    if (destination === 'shelf' && condition === 'broken') {
        return alert("Error: Cannot put broken item on shelf.");
    }

    try {
        // UNCOMMENT THIS WHEN BACKEND IS READY:
        /*
        await fetch(`${API_BASE_URL}/return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ returnId, condition, destination })
        });
        */
       
        alert(`Success: Item processed to destination '${destination}'`);
        
    } catch (error) {
        alert("Backend Error: " + error.message);
    }
}


/* * ------------------------------------------------------------------
 * BACKEND INSTRUCTION for AI (CRITICAL REQUIREMENT):
 * Endpoint: POST /api/simulate-sale
 * Goal: Simulate an online order to test Race Conditions.
 * Request Body (JSON): { "barcode": "101" }
 * Logic:
 * 1. Check Database: Is 'count' > 0?
 * 2. IF YES: Immediately decrement 'count' and increment 'reserved' (Lock Item). Return 200 OK.
 * 3. IF NO: Return 400 Error ("Overselling Prevented").
 * Note: This must be atomic to satisfy the 'Race Condition' project requirement.
 * ------------------------------------------------------------------
 */
async function runFakeSale() {
    const barcode = document.getElementById('test-barcode').value;
    const statusText = document.getElementById('test-status');
    
    statusText.innerText = "Attempting to buy...";
    statusText.style.color = "blue";

    try {
        // UNCOMMENT THIS WHEN BACKEND IS READY:
        /*
        const response = await fetch(`${API_BASE_URL}/simulate-sale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode: barcode })
        });
        const data = await response.json();

        if (response.ok) {
            statusText.innerText = "Success: Stock Locked.";
            statusText.style.color = "green";
            loadStockData(); // Refresh table to see count go down
        } else {
            statusText.innerText = "Failed: " + data.message;
            statusText.style.color = "red";
        }
        */

        // --- MOCK RESPONSE ---
        setTimeout(() => {
            statusText.innerText = "Mock Success: Order Placed (Backend Not Connected)";
            statusText.style.color = "orange";
        }, 500);
        // ---------------------

    } catch (error) {
        statusText.innerText = "Error: Backend Offline";
        statusText.style.color = "red";
    }
}