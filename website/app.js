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
    document.getElementById('btn-action-restock').addEventListener('click', () => handleReturn('shelf'));
    document.getElementById('btn-action-repair').addEventListener('click', () => handleReturn('repair'));
    document.getElementById('btn-action-trash').addEventListener('click', () => handleReturn('trash'));

    // Load data when page opens
    loadStockData();
});


function loadStockData() {
    const tableBody = document.getElementById('stock-body');
    tableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';

    // MOCK DATA
    const mockItems = [
        { id: "101", name: "Wireless Mouse", count: 50, reserved: 2, status: "OK" },
        { id: "102", name: "HDMI Cable", count: 12, reserved: 0, status: "Low" },
        { id: "103", name: "4K Monitor", count: 0, reserved: 5, status: "Out of Stock" }
    ];

    tableBody.innerHTML = '';

    mockItems.forEach(item => {
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

}

function checkInItem() {
    const barcodeInput = document.getElementById('barcode-input');
    const isBrokenCheckbox = document.getElementById('check-broken');
    
    const barcode = barcodeInput.value;
    const isBroken = isBrokenCheckbox.checked;

    const resultBox = document.getElementById('shelf-result');
    const resultTitle = document.getElementById('result-title');
    const shelfText = document.getElementById('shelf-location');

    if (barcode === "") {
        alert("Please enter a Barcode ID first.");
        return;
    }

    resultBox.classList.remove('hidden');

    if (isBroken) {
        resultBox.style.backgroundColor = "#fadbd8";
        resultBox.style.color = "darkred";
        
        resultTitle.innerText = "STOP! Item is Damaged";
        shelfText.innerText = "Quarantine Shelf Q-01";
        
        console.log(`Item ${barcode} flagged as BROKEN.`);
    } else {
        resultBox.style.backgroundColor = "#d4edda";
        resultBox.style.color = "darkgreen";

        resultTitle.innerText = "Item Good";
        shelfText.innerText = "Shelf A-12";

        console.log(`Item ${barcode} added to stock.`);
    }

    barcodeInput.value = "";
    isBrokenCheckbox.checked = false;
}

function handleReturn(destination) {
    const returnId = document.getElementById('return-id').value;
    const condition = document.getElementById('condition-select').value;
    
    if (returnId === "") {
        alert("Please enter an ID.");
        return;
    }

    if (destination === 'shelf' && condition === 'broken') {
        alert("ERROR: You cannot put a BROKEN item back on the shelf! Please select 'Repair' or 'Trash'.");
        return; 
    }

   if (destination === 'trash' && condition === 'good') {
        if (!confirm("Wait! This item is marked 'Good'. Are you sure you want to throw it away?")) {
            return; // Stop if they click Cancel
        }
    }

    let msg = `Return processed.\n`;
    if (destination === 'repair') msg += "-> Item sent to Repair Department.";
    else if (destination === 'trash') msg += "-> Item thrown away.";
    else if (destination === 'shelf') msg += "-> Item added back to Shelf.";
    
    alert(msg);
    
    document.getElementById('return-id').value = "";
    document.getElementById('condition-select').value = "good";
}

function runFakeSale() {
    const barcode = document.getElementById('test-barcode').value;
    const statusText = document.getElementById('test-status');
    
    statusText.innerText = "Buying item...";
    statusText.style.color = "blue";

    
    statusText.innerText = `Success: Order created for Item #${barcode}. Stock reserved.`;
    statusText.style.color = "green";
}