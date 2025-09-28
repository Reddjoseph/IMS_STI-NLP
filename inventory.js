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

/* -------------------------
   Helpers for Date/Time
------------------------- */
function nowLocalDateTimeString() {
  const now = new Date();
  return now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0") + " " +
    String(now.getHours()).padStart(2, "0") + ":" +
    String(now.getMinutes()).padStart(2, "0");
}

function parseStoredDateToLocal(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0") + " " +
    String(d.getHours()).padStart(2, "0") + ":" +
    String(d.getMinutes()).padStart(2, "0");
}

/* -------------------------
   Fetch Inventory
------------------------- */
async function fetchInventory() {
  const root = document.getElementById("inventory-root");
  root.innerHTML = "";

  const totalCountElem = document.getElementById("total-items-count");
  const deterioratingCountElem = document.getElementById("deteriorating-items-count");
  const replacementCountElem = document.getElementById("replacement-items-count");

  if (totalCountElem) totalCountElem.textContent = "0";
  if (deterioratingCountElem) deterioratingCountElem.textContent = "0";
  if (replacementCountElem) replacementCountElem.textContent = "0";

  try {
    const inventoryCol = collection(db, "inventory");
    const snapshot = await getDocs(inventoryCol);

    if (snapshot.empty) {
      root.textContent = "No inventory items found.";
      return;
    }

    const allItems = [];
    snapshot.forEach(docSnap => {
      allItems.push({ id: docSnap.id, ...docSnap.data() });
    });

    const totalItems = allItems.length;
    const deterioratingItems = allItems.filter(item => item.Condition === "Deteriorating").length;
    const forReplacementItems = allItems.filter(item => item.Condition === "For replacement").length;

    if (totalCountElem) totalCountElem.textContent = totalItems;
    if (deterioratingCountElem) deterioratingCountElem.textContent = deterioratingItems;
    if (replacementCountElem) replacementCountElem.textContent = forReplacementItems;

    const filterContainer = document.createElement("div");
    filterContainer.style.display = "flex";
    filterContainer.style.gap = "10px";
    filterContainer.style.marginBottom = "10px";

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Search Item...";
    searchInput.id = "search-inventory";
    searchInput.style.flex = "1";
    filterContainer.appendChild(searchInput);

    const labFilter = document.createElement("select");
    labFilter.id = "filter-lab";
    labFilter.innerHTML = `
      <option value="">All Laboratories</option>
      <option value="Laboratory 1">Laboratory 1</option>
      <option value="Laboratory 2">Laboratory 2</option>
      <option value="Laboratory 3">Laboratory 3</option>
      <option value="Laboratory 4">Laboratory 4</option>
    `;
    filterContainer.appendChild(labFilter);

    const conditionFilter = document.createElement("select");
    conditionFilter.id = "filter-condition";
    conditionFilter.innerHTML = `
      <option value="">All Conditions</option>
      <option value="Good">Good</option>
      <option value="Deteriorating">Deteriorating</option>
      <option value="For replacement">For replacement</option>
    `;
    filterContainer.appendChild(conditionFilter);

    root.appendChild(filterContainer);

    const table = document.createElement("table");
    table.className = "inventory-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["ID", "Name", "Laboratory", "Date Added", "Condition", "Actions"].forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const rows = [];

    allItems.forEach(item => {
      const tr = document.createElement("tr");

      const idTd = document.createElement("td");
      idTd.textContent = item.id.slice(-6);

      const nameTd = document.createElement("td");
      const nameLink = document.createElement("a");
      nameLink.href = `https://reddjoseph.github.io/IMS_STI-NLP/item.html?id=${item.id}`;
      nameLink.textContent = item.Name || "Unnamed";
      nameLink.style.color = "#000";
      nameLink.style.textDecoration = "none";
      nameLink.target = "_blank";
      nameLink.addEventListener("mouseover", () => {
        nameLink.style.color = "#2563eb";
        nameLink.style.fontWeight = "bold";
      });
      nameLink.addEventListener("mouseout", () => {
        nameLink.style.color = "#000";
        nameLink.style.fontWeight = "normal";
      });
      nameTd.appendChild(nameLink);

      const labTd = document.createElement("td");
      labTd.textContent = item.Laboratory || "Unknown";

      const dateTd = document.createElement("td");
      dateTd.textContent = parseStoredDateToLocal(item["Date added"]);

      const condTd = document.createElement("td");
      condTd.textContent = item.Condition || "Unknown";
      condTd.classList.add(`condition-${(item.Condition || "unknown").toLowerCase().replace(/\s/g, "-")}`);

      const actionsTd = document.createElement("td");
      actionsTd.classList.add("actions-cell");

      const editBtn = document.createElement("button");
      editBtn.textContent = "✏️ Edit";
      editBtn.addEventListener("click", () => showEditItemForm(item.id, item));

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑 Delete";
      deleteBtn.addEventListener("click", async () => {
        if (confirm(`Delete "${item.Name}"?`)) {
          try {
            await addDoc(collection(db, "trash"), {
              ...item,
              deletedAt: new Date().toISOString(),
              originalId: item.id
            });
            await deleteDoc(doc(db, "inventory", item.id));
            alert("Item moved to Trash!");
            fetchInventory();
          } catch (err) {
            console.error(err);
            alert("❌ Failed to delete item.");
          }
        }
      });

      const qrBtn = document.createElement("button");
      qrBtn.textContent = "🔗 QR";
      qrBtn.classList.add("qr-btn");
      qrBtn.addEventListener("click", () => showQRModal(item.id));

      actionsTd.append(editBtn, deleteBtn, qrBtn);

      tr.append(idTd, nameTd, labTd, dateTd, condTd, actionsTd);
      tbody.appendChild(tr);

      rows.push({ row: tr, name: (item.Name || "").toLowerCase(), lab: item.Laboratory, condition: item.Condition, id: item.id.slice(-6).toLowerCase() });
    });

    table.appendChild(tbody);
    root.appendChild(table);

    function applyFilters() {
      const searchTerm = searchInput.value.toLowerCase();
      const selectedLab = labFilter.value;
      const selectedCondition = conditionFilter.value;

      rows.forEach(({ row, name, lab, condition, id }) => {
        const matchesSearch = name.includes(searchTerm) || id.includes(searchTerm);
        const matchesLab = !selectedLab || lab === selectedLab;
        const matchesCondition = !selectedCondition || condition === selectedCondition;
        row.style.display = matchesSearch && matchesLab && matchesCondition ? "" : "none";
      });
    }

    searchInput.addEventListener("input", applyFilters);
    labFilter.addEventListener("change", applyFilters);
    conditionFilter.addEventListener("change", applyFilters);

  } catch (err) {
    console.error("Error fetching inventory:", err);
    root.textContent = "Error loading inventory.";
  }
}

/* -------------------------
   Show Trash Modal
------------------------- */
async function showTrashModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal modal--large";
  modal.style.maxWidth = "95vw";

  modal.innerHTML = `
    <h2>🗑️ Trash Bin</h2>
    <table class="inventory-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Laboratory</th>
          <th>Condition</th>
          <th>Date Added</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="trash-tbody"><tr><td colspan="5">Loading...</td></tr></tbody>
    </table>
    <button id="close-trash-btn">Close</button>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById("close-trash-btn").addEventListener("click", () => overlay.remove());

  const tbody = document.getElementById("trash-tbody");
  try {
    const snapshot = await getDocs(collection(db, "trash"));
    tbody.innerHTML = "";

    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="5">Trash is empty.</td></tr>`;
      return;
    }

    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.Name || "Unnamed"}</td>
        <td>${item.Laboratory || "Unknown"}</td>
        <td>${item.Condition || "Unknown"}</td>
        <td>${parseStoredDateToLocal(item["Date added"])}</td>
        <td class="actions-cell"></td>
      `;

      const actionsTd = tr.querySelector(".actions-cell");

      const restoreBtn = document.createElement("button");
      restoreBtn.textContent = "♻️ Restore";
      restoreBtn.addEventListener("click", async () => {
        try {
          await addDoc(collection(db, "inventory"), {
            Name: item.Name,
            Laboratory: item.Laboratory,
            Condition: item.Condition,
            "Date added": nowLocalDateTimeString()
          });
          await deleteDoc(doc(db, "trash", docSnap.id));
          alert("✅ Item restored!");
          overlay.remove();
          fetchInventory();
        } catch (err) {
          console.error(err);
          alert("❌ Failed to restore.");
        }
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑️ Delete Permanently";
      deleteBtn.addEventListener("click", async () => {
        if (confirm(`Permanently delete "${item.Name}"?`)) {
          try {
            await deleteDoc(doc(db, "trash", docSnap.id));
            alert("❌ Item permanently deleted!");
            tr.remove();
          } catch (err) {
            console.error(err);
            alert("❌ Failed to delete.");
          }
        }
      });

      actionsTd.append(restoreBtn, deleteBtn);
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Error fetching trash:", err);
    tbody.innerHTML = `<tr><td colspan="5">Error loading trash.</td></tr>`;
  }
}

/* -------------------------
   Add Item with Categories
------------------------- */
/* -------------------------
   Add Item with Categories
------------------------- */
function showAddItemForm() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <h2>Add New Inventory Item</h2>
    <form id="add-item-form">
      <label>Category:</label>
      <select id="item-category" required>
        <option value="">Select Category</option>
        <option value="Computers">Computers</option>
        <option value="Electronics">Electronics</option>
        <option value="Appliances">Appliances</option>
        <option value="Kitchen">Kitchen</option>
      </select>
      
      <label>Name:</label>
      <input type="text" id="item-name" placeholder="Select category first" disabled required />

      <label>Laboratory:</label>
      <select id="item-lab" required>
        <option value="">Select Laboratory</option>
        <option>Laboratory 1</option>
        <option>Laboratory 2</option>
        <option>Laboratory 3</option>
        <option>Laboratory 4</option>
      </select>
      
      <label>Condition:</label>
      <select id="item-condition" required>
        <option value="">Select Condition</option>
        <option>Good</option>
        <option>Deteriorating</option>
        <option>For replacement</option>
      </select>
      
      <button type="submit">➕ Add Item</button>
      <button type="button" id="close-modal-btn">Cancel</button>
    </form>
  `;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const nameInput = modal.querySelector("#item-name");
  const categorySelect = modal.querySelector("#item-category");

  // Handle category change → open sub-selection modal
  categorySelect.addEventListener("change", () => {
    const category = categorySelect.value;
    nameInput.value = "";
    delete nameInput.dataset.value;

    let options = [];
    if (category === "Computers") {
      options = [
        { name: "Intel PC", icon: "💻" },
        { name: "Ryzen PC", icon: "🖥️" }
      ];
    }
    if (category === "Electronics") {
      options = [
        { name: "Projector", icon: "📽️" },
        { name: "Modem", icon: "🌐" },
        { name: "Switch", icon: "🔀" }
      ];
    }
    if (category === "Appliances") {
      options = [
        { name: "Chair", icon: "🪑" },
        { name: "Aircon", icon: "❄️" },
        { name: "Table", icon: "📏" }
      ];
    }
    if (category === "Kitchen") {
      options = [
        { name: "Microwave", icon: "🍲" },
        { name: "Coffee Maker", icon: "☕" },
        { name: "Fridge", icon: "🧊" }
      ];
    }

    if (options.length === 0) return;

    // Sub modal overlay
    const subOverlay = document.createElement("div");
    subOverlay.className = "modal-overlay";

    // Sub modal box
    const subModal = document.createElement("div");
    subModal.className = "modal modal--small";

    // force wider modal size
    subModal.style.width = "80%";
    subModal.style.maxWidth = "800px";
    subModal.style.minWidth = "600px";

    subModal.innerHTML = `
      <h3>Select ${category} Type</h3>
      <div id="sub-options"></div>
      <button type="button" id="sub-close">Cancel</button>
    `;

    subOverlay.appendChild(subModal);
    document.body.appendChild(subOverlay);

    // Build options table
    const subOptions = subModal.querySelector("#sub-options");
    subOptions.innerHTML = "";
    const table = document.createElement("table");
    table.className = "inventory-table";
    const tbody = document.createElement("tbody");

    for (let i = 0; i < options.length; i += 5) {
      const row = document.createElement("tr");

      options.slice(i, i + 5).forEach(opt => {
        const cell = document.createElement("td");
        const btn = document.createElement("button");
btn.className = "item-choice-btn";
btn.innerHTML = `${opt.icon} ${opt.name}`;

// ✅ Inline styling for option buttons
Object.assign(btn.style, {
  display: "block",
  width: "100%",
  padding: "12px 16px",
  fontSize: "14px",
  fontWeight: "600",
  color: "#fff",
  background: "linear-gradient(135deg, #2563eb, #1d4ed8)", // blue theme
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  transition: "all 0.2s ease",
});

btn.addEventListener("mouseover", () => {
  btn.style.background = "linear-gradient(135deg, #1e40af, #1d4ed8)";
  btn.style.transform = "translateY(-2px)";
});
btn.addEventListener("mouseout", () => {
  btn.style.background = "linear-gradient(135deg, #2563eb, #1d4ed8)";
  btn.style.transform = "translateY(0)";
});

btn.addEventListener("click", () => {
  nameInput.value = opt.name;
  nameInput.dataset.value = opt.name;
  subOverlay.remove();
});

        cell.appendChild(btn);
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    subOptions.appendChild(table);

    // ✅ Style sub-modal cancel button
    const subCloseBtn = subModal.querySelector("#sub-close");
    Object.assign(subCloseBtn.style, {
      display: "block",
      width: "100%",
      padding: "12px 16px",
      marginTop: "15px",
      fontSize: "14px",
      fontWeight: "600",
      color: "#fff",
      background: "linear-gradient(135deg, #ef4444, #b91c1c)", // red theme
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
    });
    subCloseBtn.addEventListener("mouseover", () => {
      subCloseBtn.style.background = "linear-gradient(135deg, #dc2626, #991b1b)";
    });
    subCloseBtn.addEventListener("mouseout", () => {
      subCloseBtn.style.background = "linear-gradient(135deg, #ef4444, #b91c1c)";
    });

    subCloseBtn.addEventListener("click", () => subOverlay.remove());
  });

  modal.querySelector("#close-modal-btn").addEventListener("click", () => overlay.remove());

  modal.querySelector("#add-item-form").addEventListener("submit", async e => {
    e.preventDefault();
    const name = nameInput.dataset.value || "";
    const lab = modal.querySelector("#item-lab").value;
    const condition = modal.querySelector("#item-condition").value;
    if (!name || !lab || !condition) return alert("Fill all fields");

    try {
      await addDoc(collection(db, "inventory"), {
        Name: name,
        Laboratory: lab,
        Condition: condition,
        "Date added": nowLocalDateTimeString()
      });
      alert("✅ Item added!");
      overlay.remove();
      fetchInventory();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to add.");
    }
  });
}


/* -------------------------
   QR Modal
------------------------- */
function showQRModal(itemId) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal modal--small";

  modal.innerHTML = `
    <h2>QR Code for ${itemId}</h2>
    <canvas id="qrCanvas"></canvas>
    <button id="close-qr">Close</button>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const qrCanvas = document.getElementById("qrCanvas");
  const ctx = qrCanvas.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 200, 200);
  ctx.fillStyle = "#fff";
  ctx.fillRect(20, 20, 160, 160);

  document.getElementById("close-qr").addEventListener("click", () => overlay.remove());
}

/* -------------------------
   Edit Item Modal
------------------------- */
function showEditItemForm(itemId, itemData) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const modal = document.createElement("div");
  modal.className = "modal";

  modal.innerHTML = `
    <h2>Edit Item</h2>
    <form id="edit-item-form">
      <label>Name:</label>
      <input type="text" id="edit-name" value="${itemData.Name || ""}" required />

      <label>Laboratory:</label>
      <select id="edit-lab" required>
        <option ${itemData.Laboratory === "Laboratory 1" ? "selected" : ""}>Laboratory 1</option>
        <option ${itemData.Laboratory === "Laboratory 2" ? "selected" : ""}>Laboratory 2</option>
        <option ${itemData.Laboratory === "Laboratory 3" ? "selected" : ""}>Laboratory 3</option>
        <option ${itemData.Laboratory === "Laboratory 4" ? "selected" : ""}>Laboratory 4</option>
      </select>

      <label>Condition:</label>
      <select id="edit-condition" required>
        <option ${itemData.Condition === "Good" ? "selected" : ""}>Good</option>
        <option ${itemData.Condition === "Deteriorating" ? "selected" : ""}>Deteriorating</option>
        <option ${itemData.Condition === "For replacement" ? "selected" : ""}>For replacement</option>
      </select>

      <button type="submit">💾 Save Changes</button>
      <button type="button" id="edit-cancel">Cancel</button>
    </form>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  modal.querySelector("#edit-cancel").addEventListener("click", () => overlay.remove());

  modal.querySelector("#edit-item-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const newName = modal.querySelector("#edit-name").value.trim();
    const newLab = modal.querySelector("#edit-lab").value;
    const newCondition = modal.querySelector("#edit-condition").value;

    if (!newName || !newLab || !newCondition) {
      alert("❌ Please fill all fields.");
      return;
    }

    try {
      await updateDoc(doc(db, "inventory", itemId), {
        Name: newName,
        Laboratory: newLab,
        Condition: newCondition
      });
      alert("✅ Item updated!");
      overlay.remove();
      fetchInventory();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update item.");
    }
  });
}

/* -------------------------
   Event Listeners
------------------------- */
document.getElementById("add-item-btn")?.addEventListener("click", showAddItemForm);
document.getElementById("trash-btn")?.addEventListener("click", showTrashModal);
fetchInventory();
