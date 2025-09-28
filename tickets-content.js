// ✅ tickets-content.js (with Notifications + Full Data)

function waitForElement(selector, timeout = 2500) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const start = Date.now();
    const iv = setInterval(() => {
      const found = document.querySelector(selector);
      if (found) {
        clearInterval(iv);
        resolve(found);
      } else if (Date.now() - start > timeout) {
        clearInterval(iv);
        reject(new Error("Timed out waiting for " + selector));
      }
    }, 40);
  });
}

(async function initTicketsContent() {
  try {
    await waitForElement("#tc-ticketsTableBody");

    const ticketsTableBody = document.getElementById("tc-ticketsTableBody");
    const createTicketBtn = document.getElementById("tc-createTicketBtn");
    const modal = document.getElementById("tc-ticketModal");
    const closeModal = document.getElementById("tc-closeModal");
    const submitTicketBtn = document.getElementById("tc-submitTicketBtn");
    const ticketConcern = document.getElementById("tc-ticketConcern");
    const ticketDescription = document.getElementById("tc-ticketDescription");
    const ticketItem = document.getElementById("tc-ticketItem");
    const searchInput = document.getElementById("tc-searchInput");
    const prevPageBtn = document.getElementById("tc-prevPage");
    const nextPageBtn = document.getElementById("tc-nextPage");

    // Feedback modal (view)
    const viewFeedbackModal = document.getElementById("viewFeedbackModal");
    const closeViewFeedback = document.getElementById("closeViewFeedback");
    const feedbackTimeline = document.getElementById("feedbackTimeline");

    // Description modal
    const viewDescriptionModal = document.getElementById("viewDescriptionModal");
    const closeViewDescription = document.getElementById("closeViewDescription");
    const fullDescriptionText = document.getElementById("fullDescriptionText");

    const ticketsCollection = firebase.firestore().collection("tickets");
    const inventoryCollection = firebase.firestore().collection("inventory");
    const notificationsCollection = firebase.firestore().collection("notifications");
    const auth = firebase.auth();
    const db = firebase.firestore();

    async function getTickets() {
      try {
        const snapshot = await ticketsCollection.orderBy("createdAt", "desc").get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error loading tickets:", error);
        return [];
      }
    }

    async function saveTicket(ticket) {
      const docRef = await ticketsCollection.add(ticket);
      return docRef.id;
    }

    async function deleteTicket(id) {
      await ticketsCollection.doc(id).delete();
    }

    async function getInventoryItems() {
      try {
        const snapshot = await inventoryCollection.get();
        return snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.Name ?? d.id,
            lab: data.Laboratory ?? "",
          };
        });
      } catch (err) {
        console.error("Error fetching inventory items:", err);
        return [];
      }
    }

    async function loadItemsDropdown() {
      const items = await getInventoryItems();
      ticketItem.innerHTML = "";

      if (items.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No items available";
        ticketItem.appendChild(opt);
        return;
      }

      items.forEach((it) => {
        const opt = document.createElement("option");
        opt.value = it.id;
        opt.textContent = `${it.name} (${it.lab || "No Lab"})`;
        opt.dataset.name = it.name;
        ticketItem.appendChild(opt);
      });
    }

    let tickets = await getTickets();
    let filteredTickets = [...tickets];
    let currentPage = 1;
    const pageSize = 5;

    function paginate(array, pageNumber, size) {
      const start = (pageNumber - 1) * size;
      return array.slice(start, start + size);
    }

    function escapeHtml(s = "") {
      return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function renderTickets() {
      ticketsTableBody.innerHTML = "";
      const pageTickets = paginate(filteredTickets, currentPage, pageSize);

      pageTickets.forEach((t, index) => {
        const tr = document.createElement("tr");
        const statusClass = "status-" + (t.status || "pending").toLowerCase();

        const desc = t.description || "";
        const showButton = desc.length > 80;

        tr.innerHTML = `
          <td>${t.id}</td>
          <td>${escapeHtml(t.item)}</td>
          <td>${escapeHtml(t.concern)}</td>
          <td class="ticket-description">
            ${escapeHtml(desc)}
            ${
              showButton
                ? `<button class="btn-view-description" data-desc="${escapeHtml(desc)}">
                     View Details
                   </button>`
                : ""
            }
          </td>
          <td class="${statusClass}">${escapeHtml(t.status)}</td>
          <td>
            <button class="btn-delete" data-index="${index}" title="Delete Ticket">Delete</button>
          </td>
          <td>
            <button class="btn-feedback" data-id="${t.id}">View Feedback</button>
          </td>
        `;
        ticketsTableBody.appendChild(tr);
      });

      // Delete
      ticketsTableBody.querySelectorAll(".btn-delete").forEach((btn, idx) => {
        btn.addEventListener("click", () =>
          onDeleteTicket((currentPage - 1) * pageSize + idx)
        );
      });

      // Feedback
      ticketsTableBody.querySelectorAll(".btn-feedback").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const ticketId = btn.dataset.id;
          const doc = await ticketsCollection.doc(ticketId).get();
          const history = doc.data().feedbackHistory || [];

          feedbackTimeline.innerHTML = history.length
            ? history
                .map(
                  (f) => `
              <div class="feedback-entry">
                <strong>${escapeHtml(f.admin)}</strong>
                <span class="date">${f.timestamp?.toDate().toLocaleString() || ""}</span>
                <p>${escapeHtml(f.message)}</p>
              </div>
            `
                )
                .join("")
            : "<p>No feedback yet.</p>";

          viewFeedbackModal.style.display = "flex";
          viewFeedbackModal.setAttribute("aria-hidden", "false");
        });
      });

      // Full description
      ticketsTableBody.querySelectorAll(".btn-view-description").forEach((btn) => {
        btn.addEventListener("click", () => {
          const desc = btn.dataset.desc || "No description available.";
          fullDescriptionText.textContent = desc;
          viewDescriptionModal.style.display = "flex";
          viewDescriptionModal.setAttribute("aria-hidden", "false");
        });
      });

      prevPageBtn.disabled = currentPage === 1;
      nextPageBtn.disabled = currentPage * pageSize >= filteredTickets.length;
    }

    // Search
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.toLowerCase();
      filteredTickets = tickets.filter(
        (t) =>
          (t.id && t.id.toLowerCase().includes(q)) ||
          (t.item && t.item.toLowerCase().includes(q)) ||
          (t.concern && t.concern.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.status && t.status.toLowerCase().includes(q))
      );
      currentPage = 1;
      renderTickets();
    });

    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTickets();
      }
    });

    nextPageBtn.addEventListener("click", () => {
      if (currentPage * pageSize < filteredTickets.length) {
        currentPage++;
        renderTickets();
      }
    });

    async function onDeleteTicket(index) {
      const ticketToDelete = filteredTickets[index];
      if (!ticketToDelete) return;

      if (confirm("Are you sure you want to delete this ticket?")) {
        try {
          await deleteTicket(ticketToDelete.id);
          tickets = tickets.filter((t) => t.id !== ticketToDelete.id);
          filteredTickets = [...tickets];
          renderTickets();
        } catch {
          alert("Failed to delete ticket. Please try again.");
        }
      }
    }

    // ➕ Create ticket modal
    createTicketBtn.addEventListener("click", async () => {
      await loadItemsDropdown();
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
      ticketConcern.value = "";
      ticketDescription.value = "";
      submitTicketBtn.textContent = "Submit";
    });

    closeModal.addEventListener("click", () => {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    });

    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      }
      if (e.target === viewDescriptionModal) {
        viewDescriptionModal.style.display = "none";
        viewDescriptionModal.setAttribute("aria-hidden", "true");
      }
    });

    // ✅ Save new ticket + notification
    submitTicketBtn.addEventListener("click", async () => {
      const concern = ticketConcern.value.trim();
      const description = ticketDescription.value.trim();
      const selectedOption = ticketItem.options[ticketItem.selectedIndex];
      const itemId = selectedOption?.value;
      const itemName = selectedOption?.dataset.name;

      if (!concern || !description || !itemId || !itemName) {
        alert("Please fill in all fields.");
        return;
      }

      const currentUser = auth.currentUser;
      let role = "User";
      if (currentUser) {
        const userDoc = await db.collection("users").doc(currentUser.uid).get();
        role = userDoc.exists ? userDoc.data().role : "User";
      }

      const newTicket = {
        item: itemName,
        itemId,
        concern,
        description,
        status: "Pending",
        feedbackHistory: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        issuedBy: currentUser?.email || "Unknown user",
        issuedById: currentUser?.uid || null,
        createdByRole: role,
      };

      try {
        const newId = await saveTicket(newTicket);
        newTicket.id = newId;

        // 🔔 Create notification for Admins
        await notificationsCollection.add({
          message: `${newTicket.issuedBy} issued a ticket regarding ${itemName}`,
          itemName: itemName,
          issuedBy: newTicket.issuedBy,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdByRole: role,
        });

        tickets.unshift(newTicket);
        filteredTickets = [...tickets];
        currentPage = 1;
        renderTickets();

        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      } catch (err) {
        console.error("Ticket save failed:", err);
        alert("Failed to save ticket. Please try again.");
      }
    });

    // Close feedback modal
    closeViewFeedback.addEventListener("click", () => {
      viewFeedbackModal.style.display = "none";
      viewFeedbackModal.setAttribute("aria-hidden", "true");
    });

    // Close description modal
    closeViewDescription.addEventListener("click", () => {
      viewDescriptionModal.style.display = "none";
      viewDescriptionModal.setAttribute("aria-hidden", "true");
    });

    renderTickets();
  } catch (err) {
    console.error("tickets-content init error:", err);
  }
})();
