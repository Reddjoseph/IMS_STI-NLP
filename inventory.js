// ✅ inventory.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc
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

  // Get stat display elements
  const totalCountElem = document.getElementById("total-items-count");
  const deterioratingCountElem = document.getElementById("deteriorating-items-count");
  const replacementCountElem = document.getElementById("replacement-items-count");

  // Reset stats while loading
  if (totalCountElem) totalCountElem.textContent = '0';
  if (deterioratingCountElem) deterioratingCountElem.textContent = '0';
  if (replacementCountElem) replacementCountElem.textContent = '0';

  try {
    const inventoryCol = collection(db, "inventory");
    const snapshot = await getDocs(inventoryCol);

    if (snapshot.empty) {
      root.textContent = "No inventory items found.";
      return;
    }

    // --- Calculate stats ---
    const allItems = [];
    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      allItems.push(item);
    });

    const totalItems = allItems.length;
    const deterioratingItems = allItems.filter(item => item.Condition === "Deteriorating").length;
    const forReplacementItems = allItems.filter(item => item.Condition === "For replacement").length;

    // Update stats in the UI
    if (totalCountElem) totalCountElem.textContent = totalItems;
    if (deterioratingCountElem) deterioratingCountElem.textContent = deterioratingItems;
    if (replacementCountElem) replacementCountElem.textContent = forReplacementItems;

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

    // Table header - added Actions column
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["ID", "Name", "Laboratory", "Date Added", "Condition", "Actions"].forEach(text => {
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

    let i = 0;
    snapshot.forEach(docSnap => {
      const item = allItems[i];
      i++;

      const tr = document.createElement("tr");

      const idShort = docSnap.id.slice(-6); // last 6 chars of ID
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

      // Actions cell
      const actionsTd = document.createElement("td");
      actionsTd.classList.add("actions-cell");

      // Edit button
      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️ Edit";
      editBtn.style.marginRight = "5px";
      editBtn.style.backgroundColor = "#ffc107";
      editBtn.style.color = "#000";
      editBtn.style.border = "none";
      editBtn.style.padding = "5px 10px";
      editBtn.style.borderRadius = "5px";
      editBtn.style.cursor = "pointer";
      editBtn.addEventListener("click", () => {
        showEditItemForm(docSnap.id, item);
      });

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑 Delete";
      deleteBtn.style.backgroundColor = "#dc3545";
      deleteBtn.style.color = "#fff";
      deleteBtn.style.border = "none";
      deleteBtn.style.padding = "5px 10px";
      deleteBtn.style.borderRadius = "5px";
      deleteBtn.style.cursor = "pointer";
      deleteBtn.addEventListener("click", async () => {
        if (confirm(`Are you sure you want to delete "${item.Name}"?`)) {
          await deleteDoc(doc(db, "inventory", docSnap.id));
          alert("Item deleted successfully!");
          fetchInventory();
        }
      });

      // QR Code button
      const qrBtn = document.createElement("button");
      qrBtn.textContent = "🔗 QR";
      qrBtn.style.backgroundColor = "#007bff";
      qrBtn.style.color = "#fff";
      qrBtn.style.border = "none";
      qrBtn.style.padding = "5px 10px";
      qrBtn.style.borderRadius = "5px";
      qrBtn.style.cursor = "pointer";
      qrBtn.addEventListener("click", () => {
        showQRModal(docSnap.id);
      });

      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(deleteBtn);
      actionsTd.appendChild(qrBtn);

      tr.append(idTd, nameTd, labTd, dateTd, condTd, actionsTd);
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
    showAddItemForm();
  });
}

// ✅ Create and show the Add Item modal
function showAddItemForm() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

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

  document.getElementById("close-modal-btn").addEventListener("click", () => overlay.remove());

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

    const today = new Date().toISOString().split("T")[0];

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
      fetchInventory();
    } catch (error) {
      console.error("Error adding item:", error);
      alert("❌ Failed to add item.");
    }
  });
}

// ✅ Edit Item modal
function showEditItemForm(id, item) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <h2>Edit Inventory Item</h2>
    <form id="edit-item-form">
      <label for="edit-name">Name:</label>
      <input type="text" id="edit-name" value="${item.Name}" required />

      <label for="edit-lab">Laboratory:</label>
      <select id="edit-lab" required>
        <option value="Laboratory 1" ${item.Laboratory === "Laboratory 1" ? "selected" : ""}>Laboratory 1</option>
        <option value="Laboratory 2" ${item.Laboratory === "Laboratory 2" ? "selected" : ""}>Laboratory 2</option>
        <option value="Laboratory 3" ${item.Laboratory === "Laboratory 3" ? "selected" : ""}>Laboratory 3</option>
        <option value="Laboratory 4" ${item.Laboratory === "Laboratory 4" ? "selected" : ""}>Laboratory 4</option>
      </select>

      <label for="edit-condition">Condition:</label>
      <select id="edit-condition" required>
        <option value="Good" ${item.Condition === "Good" ? "selected" : ""}>Good</option>
        <option value="Deteriorating" ${item.Condition === "Deteriorating" ? "selected" : ""}>Deteriorating</option>
        <option value="For replacement" ${item.Condition === "For replacement" ? "selected" : ""}>For replacement</option>
      </select>

      <button type="submit">💾 Save Changes</button>
      <button type="button" id="close-edit-btn">Cancel</button>
    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById("close-edit-btn").addEventListener("click", () => overlay.remove());

  const form = document.getElementById("edit-item-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updatedName = document.getElementById("edit-name").value.trim();
    const updatedLab = document.getElementById("edit-lab").value;
    const updatedCondition = document.getElementById("edit-condition").value;

    if (!updatedName || !updatedLab || !updatedCondition) {
      alert("Please fill out all fields.");
      return;
    }

    try {
      const docRef = doc(db, "inventory", id);
      await updateDoc(docRef, {
        Name: updatedName,
        Laboratory: updatedLab,
        Condition: updatedCondition
      });

      alert("✅ Item updated successfully!");
      overlay.remove();
      fetchInventory();
    } catch (error) {
      console.error("Error updating item:", error);
      alert("❌ Failed to update item.");
    }
  });
}

// ✅ Show QR modal with close button
function showQRModal(id) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  // Generate a URL or string for the QR code, for example:
  const url = `https://reddjoseph.github.io/IMS_STI-NLP/item.html?id=${id}`;
;

  // Include QRCode.js from CDN for generating QR (you can include in your HTML as well)
  // Or generate QR code manually here using some lib
  modal.innerHTML = `
    <h2>QR Code for Item</h2>
    <div id="qr-code-container" style="margin: 20px auto; width: 200px; height: 200px;"></div>
    <button id="close-qr-btn">Close</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Generate QR code inside the container
  generateQRCode(url, document.getElementById("qr-code-container"));

  document.getElementById("close-qr-btn").addEventListener("click", () => overlay.remove());
}

// Helper function to generate QR code using QRCode.js CDN
function generateQRCode(text, container) {
  container.innerHTML = "";
  const scriptId = "qr-code-lib";
  if (!document.getElementById(scriptId)) {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.id = scriptId;
    script.onload = () => {
      new QRCode(container, {
        text: text,
        width: 200,
        height: 200,
      });
    };
    document.body.appendChild(script);
  } else {
    new QRCode(container, {
      text: text,
      width: 200,
      height: 200,
    });
  }
}

// Fetch inventory on load
fetchInventory();
