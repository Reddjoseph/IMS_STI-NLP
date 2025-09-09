// ✅ item.js (with Feedback History + Working Save)

const firebaseConfig = {
  apiKey: "AIzaSyAw2rSjJ3f_S98dntbsyl9kyXvi9MC44Dw",
  authDomain: "fir-inventory-2e62a.firebaseapp.com",
  projectId: "fir-inventory-2e62a",
  storageBucket: "fir-inventory-2e62a.firebasestorage.app",
  messagingSenderId: "380849220480",
  appId: "1:380849220480:web:5a43b227bab9f9a197af65",
  measurementId: "G-ERT87GL4XC"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Get item ID from URL
const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");
let itemName = "";
let activeFeedbackTicketId = null;

async function loadItemDetails() {
  try {
    const doc = await db.collection("inventory").doc(itemId).get();
    if (!doc.exists) {
      document.querySelector(".item-wrapper").innerHTML = "<p>Item not found.</p>";
      return;
    }

    const data = doc.data();
    itemName = data.Name || "";

    document.getElementById("item-id").textContent = doc.id;
    document.getElementById("item-name").textContent = itemName;
    document.getElementById("item-lab").textContent = data.Laboratory || "N/A";
    document.getElementById("item-condition").textContent = data.Condition || "Unknown";
    document.getElementById("item-date").textContent = data["Date added"] || "N/A";
    document.getElementById("item-image").src =
      data.ImageURL || "https://via.placeholder.com/350x250?text=No+Image+Available";

    loadItemReports();
  } catch (err) {
    console.error("Error loading item:", err);
  }
}

async function loadItemReports() {
  const reportsBody = document.getElementById("item-reports-body");
  reportsBody.innerHTML = "";

  let snapshot = await db.collection("tickets").where("itemId", "==", itemId).get();

  if (snapshot.empty) {
    reportsBody.innerHTML = `<tr><td colspan="5">No reports found.</td></tr>`;
    return;
  }

  snapshot.forEach((doc) => {
    const data = doc.data();
    const tr = document.createElement("tr");
    const statusClass = (data.status || "Pending").toLowerCase();

    tr.innerHTML = `
      <td>${doc.id}</td>
      <td>${escapeHtml(data.concern)}</td>
      <td>
        <input 
          type="text" 
          class="editable-description" 
          value="${escapeHtml(data.description || "")}" 
          data-id="${doc.id}">
      </td>
      <td>
        <select class="ticket-status-dropdown ${statusClass}" data-id="${doc.id}">
          <option value="Pending" ${data.status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="Resolved" ${data.status === "Resolved" ? "selected" : ""}>Resolved</option>
          <option value="Closed" ${data.status === "Closed" ? "selected" : ""}>Closed</option>
        </select>
      </td>
      <td>
        <button class="feedback-btn" data-id="${doc.id}">Feedback</button>
      </td>
    `;
    reportsBody.appendChild(tr);
  });

  attachListeners();
}

function attachListeners() {
  // Editable description
  document.querySelectorAll(".editable-description").forEach((input) => {
    input.addEventListener("blur", async (e) => {
      const ticketId = e.target.dataset.id;
      const newDesc = e.target.value.trim();
      try {
        await db.collection("tickets").doc(ticketId).update({ description: newDesc });
      } catch (err) {
        console.error("Error updating description:", err);
      }
    });
  });

  // Status dropdown
  document.querySelectorAll(".ticket-status-dropdown").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const ticketId = e.target.dataset.id;
      const newStatus = e.target.value;
      try {
        await db.collection("tickets").doc(ticketId).update({ status: newStatus });
        e.target.classList.remove("pending", "resolved", "closed");
        e.target.classList.add(newStatus.toLowerCase());
      } catch (err) {
        console.error("Error updating status:", err);
      }
    });
  });

  // ✅ Feedback button
  document.querySelectorAll(".feedback-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      activeFeedbackTicketId = e.target.dataset.id;
      const modal = document.getElementById("feedbackModal");
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");

      // Load history from Firestore
      const doc = await db.collection("tickets").doc(activeFeedbackTicketId).get();
      const history = doc.data().feedbackHistory || [];
      renderFeedbackHistory(history);
    });
  });
}

// ✅ Save feedback with admin name
document.getElementById("submitFeedbackBtn").addEventListener("click", async () => {
  const text = document.getElementById("feedbackText").value.trim();
  const admin = document.getElementById("adminName").value.trim();
  if (!text || !admin || !activeFeedbackTicketId) {
    alert("Please enter your name and feedback.");
    return;
  }

  try {
    const feedbackEntry = {
      admin,
      message: text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("tickets").doc(activeFeedbackTicketId).update({
      feedbackHistory: firebase.firestore.FieldValue.arrayUnion(feedbackEntry),
    });

    // Reset form
    document.getElementById("feedbackText").value = "";
    document.getElementById("adminName").value = "";

    // Reload history immediately
    const doc = await db.collection("tickets").doc(activeFeedbackTicketId).get();
    const history = doc.data().feedbackHistory || [];
    renderFeedbackHistory(history);

    alert("Feedback saved.");
  } catch (err) {
    console.error("Error saving feedback:", err);
    alert("Failed to save feedback. Try again.");
  }
});

// ✅ Close modal
document.getElementById("closeFeedbackModal").addEventListener("click", () => {
  const modal = document.getElementById("feedbackModal");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
});

// Render feedback timeline
function renderFeedbackHistory(history) {
  const container = document.getElementById("feedbackHistory");
  if (!history.length) {
    container.innerHTML = "<p style='color:#666;font-size:0.9rem;'>No feedback yet.</p>";
    return;
  }

  container.innerHTML = history
    .sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis()) // newest first
    .map(
      (f) => `
        <div class="feedback-entry">
          <strong>${escapeHtml(f.admin)}</strong>
          <span class="date">${f.timestamp ? f.timestamp.toDate().toLocaleString() : ""}</span>
          <p>${escapeHtml(f.message)}</p>
        </div>
      `
    )
    .join("");
}

function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

loadItemDetails();
