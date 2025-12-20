const API_BASE_URL = "/api";

document.addEventListener('DOMContentLoaded', () => {
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

    document.getElementById('btn-refresh').addEventListener('click', loadStockData);
    document.getElementById('btn-add-stock').addEventListener('click', checkInItem);
    document.getElementById('btn-run-test').addEventListener('click', runFakeSale);
    document.getElementById('btn-run-concurrent').addEventListener('click', runConcurrentTest);

    document.getElementById('btn-action-restock').addEventListener('click', () => handleReturn('shelf'));
    document.getElementById('btn-action-repair').addEventListener('click', () => handleReturn('repair'));
    document.getElementById('btn-action-trash').addEventListener('click', () => handleReturn('trash'));

    loadStockData();
});

async function loadStockData() {
    const tableBody = document.getElementById('stock-body');
    tableBody.innerHTML = '<tr><td colspan="5">Loading data...</td></tr>';
    try {
        const response = await fetch(`${API_BASE_URL}/inventory`);
        const items = await response.json();
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

async function checkInItem() {
    const barcode = document.getElementById('barcode-input').value;
    const isBroken = document.getElementById('check-broken').checked;
    if (!barcode) return alert("Enter barcode");
    try {
        const response = await fetch(`${API_BASE_URL}/check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode, isBroken })
        });
        const data = await response.json();
        const resultBox = document.getElementById('shelf-result');
        resultBox.classList.remove('hidden');
        document.getElementById('shelf-location').innerText = data.shelfLocation;
        resultBox.style.backgroundColor = isBroken ? "#fadbd8" : "#d4edda";
        resultBox.style.color = isBroken ? "darkred" : "darkgreen";
    } catch (error) {
        alert("Backend Error: " + error.message);
    }
}

async function handleReturn(destination) {
    const returnId = document.getElementById('return-id').value;
    const condition = document.getElementById('condition-select').value;
    if(!returnId) return alert("Enter Return ID");
    if (destination === 'shelf' && condition === 'broken') return alert("Cannot put broken item on shelf");
    try {
        await fetch(`${API_BASE_URL}/return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ returnId, condition, destination })
        });
        alert(`Success: Item processed to ${destination}`);
    } catch (error) {
        alert("Backend Error: " + error.message);
    }
}

async function runFakeSale() {
    const barcode = document.getElementById('test-barcode').value;
    const statusText = document.getElementById('test-status');
    statusText.innerText = "Attempting to buy...";
    statusText.style.color = "blue";
    try {
        const response = await fetch(`${API_BASE_URL}/simulate-sale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode })
        });
        const data = await response.json();
        if (response.ok) {
            statusText.innerText = "Success: Stock Locked.";
            statusText.style.color = "green";
            loadStockData();
        } else {
            statusText.innerText = "Failed: " + data.message;
            statusText.style.color = "red";
        }
    } catch (error) {
        statusText.innerText = "Error: Backend Offline";
        statusText.style.color = "red";
    }
}

async function runConcurrentTest() {
    const barcode = document.getElementById('concurrent-barcode').value;
    const numRequests = parseInt(document.getElementById('concurrent-count').value);
    const resultsDiv = document.getElementById('concurrent-results');

    resultsDiv.innerHTML = '<p class="status-running">Running concurrent test...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/test-concurrent-sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode, numRequests })
        });
        const data = await response.json();

        if (!response.ok) {
            resultsDiv.innerHTML = `<p class="result-fail">Error: ${data.error}</p>`;
            return;
        }

        let html = `
            <table class="results-table">
                <tr class="results-header">
                    <td colspan="2">📊 Test Results</td>
                </tr>
                <tr><td>Initial Stock</td><td>${data.initialCount}</td></tr>
                <tr><td>Final Stock</td><td>${data.finalCount}</td></tr>
                <tr><td>Reserved</td><td>${data.finalReserved}</td></tr>
                <tr class="summary-success">
                    <td>✅ Successful Sales</td><td>${data.successful}</td></tr>
                <tr class="summary-fail">
                    <td>🚫 Prevented (No Oversell)</td><td>${data.prevented}</td></tr>
            </table>
            <h4>Request Details (sorted by wait time):</h4>
            <table class="results-table">
                <tr>
                    <th>Request #</th>
                    <th>Wait Time</th>
                    <th>Result</th>
                </tr>
        `;

        data.results.forEach(r => {
            const rowClass = r.success ? 'result-success' : 'result-fail';
            html += `
                <tr class="${rowClass}">
                    <td>${r.request}</td>
                    <td>${r.waitTime} ms</td>
                    <td>${r.message}</td>
                </tr>
            `;
        });

        html += '</table>';
        resultsDiv.innerHTML = html;
        loadStockData();

    } catch (error) {
        resultsDiv.innerHTML = `<p class="result-fail">Error: ${error.message}</p>`;
    }
}
