// ✅ inventory.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

console.log("✅ inventory.js loaded");

// ✅ Firebase config (replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyAw2rSjJ3f_S98dntbsyl9kyXvi9MC44Dw",
  authDomain: "fir-inventory-2e62a.firebaseapp.com",
  projectId: "fir-inventory-2e62a",
  storageBucket: "fir-inventory-2e62a.firebasestorage.app",
  messagingSenderId: "380849220480",
  appId: "1:380849220480:web:5a43b227bab9f9a197af65",
  measurementId: "G-ERT87GL4XC"
};

// ✅ Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Fetch and display inventory
async function fetchInventory() {
  const root = document.getElementById("inventory-root");
  root.innerHTML = ""; // Clear previous content

  try {
    const inventoryCol = collection(db, "inventory");
    const snapshot = await getDocs(inventoryCol);

    if (snapshot.empty) {
      root.textContent = "No inventory items found.";
      return;
    }

    // Create filter container
    const filterContainer = document.createElement("div");
    filterContainer.style.display = "flex";
    filterContainer.style.gap = "10px";
    filterContainer.style.marginBottom = "10px";

    // Search Input
    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Search Item...";
    searchInput.id = "search-inventory";
    searchInput.style.flex = "1";
    filterContainer.appendChild(searchInput);

    // Laboratory Filter
    const labFilter = document.createElement("select");
    labFilter.id = "filter-lab";
    labFilter.style.padding = "10px";
    labFilter.style.borderRadius = "5px";
    labFilter.style.border = "1px solid #555";
    labFilter.style.background = "#111";
    labFilter.style.color = "white";
    labFilter.style.minWidth = "150px";

    labFilter.innerHTML = `
      <option value="">All Laboratories</option>
      <option value="Laboratory 1">Laboratory 1</option>
      <option value="Laboratory 2">Laboratory 2</option>
      <option value="Laboratory 3">Laboratory 3</option>
      <option value="Laboratory 4">Laboratory 4</option>
    `;
    filterContainer.appendChild(labFilter);

    // Condition Filter
    const conditionFilter = document.createElement("select");
    conditionFilter.id = "filter-condition";
    conditionFilter.style.padding = "10px";
    conditionFilter.style.borderRadius = "5px";
    conditionFilter.style.border = "1px solid #555";
    conditionFilter.style.background = "#111";
    conditionFilter.style.color = "white";
    conditionFilter.style.minWidth = "180px";

    conditionFilter.innerHTML = `
      <option value="">All Conditions</option>
      <option value="Good">Good</option>
      <option value="Deteriorating">Deteriorating</option>
      <option value="For replacement">For replacement</option>
    `;
    filterContainer.appendChild(conditionFilter);

    root.appendChild(filterContainer);

    // Create table
    const table = document.createElement("table");
    table.className = "inventory-table";

    // Table header - added ID column at start
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["ID", "Name", "Laboratory", "Date Added", "Condition"].forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement("tbody");

    // Store rows for filtering
    const rows = [];

    snapshot.forEach(doc => {
      const item = doc.data();
      const tr = document.createElement("tr");

      const idShort = doc.id.slice(-6); // last 6 chars of ID

      const idTd = document.createElement("td");
      idTd.textContent = idShort;

      const name = item.Name || "Unnamed";
      const lab = item.Laboratory || "Unknown";
      const dateAdded = item["Date added"] || "N/A";
      const condition = item.Condition || "Unknown";

      const nameTd = document.createElement("td");
      nameTd.textContent = name;

      const labTd = document.createElement("td");
      labTd.textContent = lab;

      const dateTd = document.createElement("td");
      dateTd.textContent = dateAdded;

      const condTd = document.createElement("td");
      const conditionClass = condition.toLowerCase().replace(/\s/g, "-");
      condTd.textContent = condition;
      condTd.classList.add(`condition-${conditionClass}`);

      tr.append(idTd, nameTd, labTd, dateTd, condTd);
      tbody.appendChild(tr);

      rows.push({
        row: tr,
        name: name.toLowerCase(),
        lab,
        condition,
        id: idShort.toLowerCase()
      });
    });

    table.appendChild(tbody);
    root.appendChild(table);

    // Filtering function applying all filters
    function applyFilters() {
      const searchTerm = searchInput.value.toLowerCase();
      const selectedLab = labFilter.value;
      const selectedCondition = conditionFilter.value;

      rows.forEach(({ row, name, lab, condition, id }) => {
        const matchesSearch = name.includes(searchTerm) || id.includes(searchTerm);
        const matchesLab = selectedLab === "" || lab === selectedLab;
        const matchesCondition = selectedCondition === "" || condition === selectedCondition;

        row.style.display = (matchesSearch && matchesLab && matchesCondition) ? "" : "none";
      });
    }

    // Attach filter event listeners
    searchInput.addEventListener("input", applyFilters);
    labFilter.addEventListener("change", applyFilters);
    conditionFilter.addEventListener("change", applyFilters);

  } catch (err) {
    console.error("Error fetching inventory:", err);
    root.textContent = "Error loading inventory.";
  }
}


// ✅ Handle "Add Item" button click
const addItemBtn = document.getElementById("add-item-btn");
if (addItemBtn) {
  addItemBtn.addEventListener("click", () => {
    console.log("➕ Add Item button clicked!");
    showAddItemForm();
  });
}

// ✅ Create and show the Add Item modal
function showAddItemForm() {
  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  // Create modal content
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <h2>Add New Inventory Item</h2>
    <form id="add-item-form">
      <label for="item-name">Name:</label>
      <input type="text" id="item-name" required />

      <label for="item-lab">Laboratory:</label>
      <select id="item-lab" required>
        <option value="">Select Laboratory</option>
        <option value="Laboratory 1">Laboratory 1</option>
        <option value="Laboratory 2">Laboratory 2</option>
        <option value="Laboratory 3">Laboratory 3</option>
        <option value="Laboratory 4">Laboratory 4</option>
      </select>

      <label for="item-condition">Condition:</label>
      <select id="item-condition" required>
        <option value="">Select Condition</option>
        <option value="Good">Good</option>
        <option value="Deteriorating">Deteriorating</option>
        <option value="For replacement">For replacement</option>
      </select>

      <button type="submit">➕ Add Item</button>
      <button type="button" id="close-modal-btn">Cancel</button>
    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close modal on cancel
  document.getElementById("close-modal-btn").addEventListener("click", () => {
    overlay.remove();
  });

  // Handle form submission
  const form = document.getElementById("add-item-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("item-name").value.trim();
    const lab = document.getElementById("item-lab").value;
    const condition = document.getElementById("item-condition").value;

    if (!name || !lab || !condition) {
      alert("Please fill out all fields.");
      return;
    }

    const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

    try {
      const inventoryCol = collection(db, "inventory");
      await addDoc(inventoryCol, {
        Name: name,
        Laboratory: lab,
        Condition: condition,
        "Date added": today
      });

      alert("✅ Item added successfully!");
      overlay.remove();
      fetchInventory(); // Refresh the list
    } catch (error) {
      console.error("Error adding item:", error);
      alert("❌ Failed to add item.");
    }
  });
}

// ✅ Fetch inventory on page load
fetchInventory();
