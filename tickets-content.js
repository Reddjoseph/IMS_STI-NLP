//  tickets-content.js (Admin: Review Modal + Clickable Handler + Deadline Modal + Full Feature)

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

    const viewFeedbackModal = document.getElementById("viewFeedbackModal");
    const closeViewFeedback = document.getElementById("closeViewFeedback");
    const feedbackTimeline = document.getElementById("feedbackTimeline");

    const viewDescriptionModal = document.getElementById("viewDescriptionModal");
    const closeViewDescription = document.getElementById("closeViewDescription");
    const fullDescriptionText = document.getElementById("fullDescriptionText");

    const headerRow = document.getElementById("tc-headerRow");

    const ticketsCollection = firebase.firestore().collection("tickets");
    const inventoryCollection = firebase.firestore().collection("inventory");
    const notificationsCollection = firebase.firestore().collection("notifications");
    const auth = firebase.auth();
    const db = firebase.firestore();

    async function getUserRole() {
      const user = auth.currentUser;
      if (!user) return null;
      const doc = await db.collection("users").doc(user.uid).get();
      return doc.exists ? doc.data().role : null;
    }

    async function getMaintenanceUsers() {
      const snapshot = await db.collection("users").where("role", "==", "Maintenance").get();
      return snapshot.docs.map(d => ({
        id: d.id,
        name: `${d.data().firstName || ""} ${d.data().lastName || ""}`.trim() || d.data().email
      }));
    }

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

    const currentRole = await getUserRole();
    let maintenanceUsers = [];

    if (currentRole === "Admin") {
      maintenanceUsers = await getMaintenanceUsers();
      const feedbackTh = [...headerRow.children].find(th => th.textContent.trim() === "Feedback");
      if (feedbackTh) feedbackTh.remove();
      const handlerTh = document.createElement("th");
      handlerTh.textContent = "Handler";
      headerRow.appendChild(handlerTh);
    }

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

    function shortenId(id = "") {
      return id.slice(-5);
    }

    function renderTickets() {
      ticketsTableBody.innerHTML = "";
      const pageTickets = paginate(filteredTickets, currentPage, pageSize);

      pageTickets.forEach((t, index) => {
        const tr = document.createElement("tr");

        //  Store the createdAt timestamp as a dataset for Automate feature
        const createdAtValue = t.createdAt?.toDate ? t.createdAt.toDate().toISOString() : "";
        tr.dataset.createdAt = createdAtValue;

        const statusClass = "status-" + (t.status || "pending").toLowerCase();
        const desc = t.description || "";
        const showButton = desc.length > 80;

        let assignColumn = "";
        if (currentRole === "Admin") {
          if (t.status === "Review" && t.assignedToName) {
            assignColumn = `
              <td>
                <span class="handler-clickable" data-id="${t.id}" data-user="${t.assignedToName}">
                  ${t.assignedToName}
                </span>
              </td>`;
          } else if (t.status === "Solved" && t.assignedToName) {
            assignColumn = `
              <td>
                <span class="handler-name">${t.assignedToName}</span>
              </td>`;
          } else {
            const assignedTo = t.assignedToName || "Unassigned";
            assignColumn = `
              <td>
                <select class="assign-select" data-id="${t.id}">
                  <option value="">${assignedTo}</option>
                  ${maintenanceUsers
                    .map(
                      (u) =>
                        `<option value="${u.id}" ${
                          u.name === assignedTo ? "selected" : ""
                        }>${u.name}</option>`
                    )
                    .join("")}
                </select>
              </td>`;
          }
        }

        tr.innerHTML = `
          <td>${shortenId(t.id)}</td>
          <td>${escapeHtml(t.item)}</td>
          <td>${escapeHtml(t.concern)}</td>
          <td class="ticket-description">
            ${escapeHtml(desc)}
            ${
              showButton
                ? `<button class="btn-view-description" data-desc="${escapeHtml(desc)}">View Details</button>`
                : ""
            }
          </td>
          <td>
            <span class="status-badge ${statusClass}" 
              data-id="${t.id}" 
              data-status="${t.status}">
              ${escapeHtml(t.status)}
            </span>
          </td>
          <td><button class="btn-delete" data-index="${index}" title="Delete Ticket">Delete</button></td>
          ${
            currentRole === "Admin"
              ? assignColumn
              : `<td><button class="btn-feedback" data-id="${t.id}">View Feedback</button></td>`
          }
        `;

        ticketsTableBody.appendChild(tr);
      });

      //  Admin handler modal logic
      if (currentRole === "Admin") {
        // --- Handler select for new assignment ---
        ticketsTableBody.querySelectorAll(".assign-select").forEach(select => {
          select.addEventListener("change", async (e) => {
            const ticketId = e.target.dataset.id;
            const selectedId = e.target.value;
            if (!selectedId) return;
            const selectedUser = maintenanceUsers.find(u => u.id === selectedId);
            if (!selectedUser) return;
            const modal = document.getElementById("setDeadlineModal");
            modal.style.display = "flex";
            modal.dataset.ticketId = ticketId;
            modal.dataset.userId = selectedId;
            modal.dataset.userName = selectedUser.name;
          });
        });

        // --- Clickable handler for review modal ---
        document.querySelectorAll(".handler-clickable").forEach((el) => {
          el.addEventListener("click", () => {
            const ticketId = el.dataset.id;
            const submittedBy = el.dataset.user;
            const modal = document.getElementById("reviewSubmissionModal");
            modal.dataset.ticketId = ticketId;
            document.getElementById("submittedByName").textContent = submittedBy;
            modal.style.display = "flex";
          });
        });

        // --- Deadline modal actions ---
        const closeBtn = document.getElementById("closeDeadlineModal");
        if (closeBtn) {
          closeBtn.addEventListener("click", () => {
            const modal = document.getElementById("setDeadlineModal");
            modal.style.display = "none";
            document.getElementById("deadlineDate").value = "";
            document.getElementById("deadlineNote").value = "";
          });
        }

        const saveBtn = document.getElementById("saveDeadlineBtn");
        if (saveBtn) {
          saveBtn.addEventListener("click", async () => {
            const modal = document.getElementById("setDeadlineModal");
            const ticketId = modal.dataset.ticketId;
            const userId = modal.dataset.userId;
            const userName = modal.dataset.userName;
            const deadline = document.getElementById("deadlineDate").value;
            const note = document.getElementById("deadlineNote").value.trim();
            if (!deadline) {
              alert("Please select a deadline date before saving.");
              return;
            }
            try {
              await ticketsCollection.doc(ticketId).update({
                assignedTo: userId,
                assignedToName: userName,
                deadline: firebase.firestore.Timestamp.fromDate(new Date(deadline)),
                assignmentNote: note,
                status: "Assigned",
              });
              alert(`✅ Ticket assigned to ${userName} with deadline set!`);
              modal.style.display = "none";
              document.getElementById("deadlineDate").value = "";
              document.getElementById("deadlineNote").value = "";
              tickets = await getTickets();
              filteredTickets = [...tickets];
              renderTickets();
            } catch (err) {
              console.error("Error saving deadline:", err);
              alert("Failed to save deadline.");
            }
          });
        }

        // --- Review modal actions ---
        const closeReviewModal = document.getElementById("closeReviewModal");
        const markSolvedBtn = document.getElementById("markSolvedBtn");
        const markUnsolvedBtn = document.getElementById("markUnsolvedBtn");
        const reviewModal = document.getElementById("reviewSubmissionModal");

        if (closeReviewModal) {
          closeReviewModal.onclick = () => (reviewModal.style.display = "none");
        }

        async function updateReviewStatus(ticketId, newStatus) {
          try {
            await ticketsCollection.doc(ticketId).update({ status: newStatus });
            alert(`✅ Ticket marked as ${newStatus}!`);
            reviewModal.style.display = "none";
            tickets = await getTickets();
            filteredTickets = [...tickets];
            renderTickets();
          } catch (err) {
            console.error("Failed to update review status:", err);
          }
        }

        if (markSolvedBtn && markUnsolvedBtn) {
          markSolvedBtn.onclick = () => {
            const ticketId = reviewModal.dataset.ticketId;
            updateReviewStatus(ticketId, "Solved");
          };
          markUnsolvedBtn.onclick = () => {
            const ticketId = reviewModal.dataset.ticketId;
            updateReviewStatus(ticketId, "Unsolved");
          };
        }
      }

      //  Admin can click "Assigned" status to mark as urgent
      if (currentRole === "Admin") {
        const statusModal = document.getElementById("statusModal");
        const closeStatusModal = document.getElementById("closeStatusModal");
        const markUrgentBtn = document.getElementById("markUrgentBtn");

        ticketsTableBody.querySelectorAll(".status-badge").forEach((badge) => {
          badge.addEventListener("click", () => {
            const ticketId = badge.dataset.id;
            const status = badge.dataset.status;
            if (status === "Assigned") {
              statusModal.style.display = "flex";
              statusModal.dataset.ticketId = ticketId;
            }
          });
        });

        closeStatusModal.addEventListener("click", () => {
          statusModal.style.display = "none";
        });

        markUrgentBtn.addEventListener("click", async () => {
          const ticketId = statusModal.dataset.ticketId;
          if (!ticketId) return;
          try {
            await ticketsCollection.doc(ticketId).update({ status: "Urgent" });
            alert("🚨 Ticket marked as Urgent!");
            statusModal.style.display = "none";
            tickets = await getTickets();
            filteredTickets = [...tickets];
            renderTickets();
          } catch (err) {
            console.error("Failed to mark urgent:", err);
            alert("Failed to update status.");
          }
        });
      }

      //  Delete buttons
      ticketsTableBody.querySelectorAll(".btn-delete").forEach((btn, idx) => {
        btn.addEventListener("click", () =>
          onDeleteTicket((currentPage - 1) * pageSize + idx)
        );
      });

      //  Feedback buttons
      if (currentRole !== "Admin") {
        ticketsTableBody.querySelectorAll(".btn-feedback").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const ticketId = btn.dataset.id;
            const doc = await ticketsCollection.doc(ticketId).get();
            const history = doc.data().feedbackHistory || [];
            feedbackTimeline.innerHTML = history.length
              ? history.map(f => `
                <div class="feedback-entry">
                  <strong>${escapeHtml(f.admin)}</strong>
                  <span class="date">${f.timestamp?.toDate().toLocaleString() || ""}</span>
                  <p>${escapeHtml(f.message)}</p>
                </div>`).join("")
              : "<p>No feedback yet.</p>";
            viewFeedbackModal.style.display = "flex";
            viewFeedbackModal.setAttribute("aria-hidden", "false");
          });
        });
      }

      //  Description buttons
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
        await notificationsCollection.add({
          message: `${newTicket.issuedBy} issued a ticket regarding ${itemName}`,
          itemName,
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

    closeViewFeedback.addEventListener("click", () => {
      viewFeedbackModal.style.display = "none";
      viewFeedbackModal.setAttribute("aria-hidden", "true");
    });

    closeViewDescription.addEventListener("click", () => {
      viewDescriptionModal.style.display = "none";
      viewDescriptionModal.setAttribute("aria-hidden", "true");
    });

    renderTickets();
  } catch (err) {
    console.error("tickets-content init error:", err);
  }
})();

// ==================================================
// =                    AUTOMATE                    =
// ============================= ====================
window.showTicketsAutomateModal = function () {
  const existing = document.getElementById('tickets-automate-overlay');
  if (existing) existing.remove();

  const tableBody = document.getElementById('tc-ticketsTableBody');
  if (!tableBody) {
    alert('No ticket data found.');
    return;
  }

  const rows = Array.from(tableBody.querySelectorAll('tr'));
  const total = rows.length;
  let pending = 0, assigned = 0, urgent = 0, solved = 0, unsolved = 0, review = 0;

  rows.forEach(row => {
    const badge = row.querySelector('.status-badge');
    if (!badge) return;
    const s = badge.textContent.trim().toLowerCase();
    if (s.includes('pending')) pending++;
    else if (s.includes('assigned')) assigned++;
    else if (s.includes('urgent')) urgent++;
    else if (s.includes('solved')) solved++;
    else if (s.includes('unsolved')) unsolved++;
    else if (s.includes('review')) review++;
  });

  const summaryHTML = `
    As of this moment, there are a total of <strong>${total}</strong> <u>tickets</u> currently listed in the system. 
    Out of these, <strong>${pending}</strong> are still <u>pending</u>, 
    <strong>${assigned}</strong> have been <u>assigned</u>, 
    and <strong>${urgent}</strong> are flagged as <u>urgent</u>. 
    Meanwhile, <strong>${solved}</strong> have already been <u>resolved</u>, 
    <strong>${unsolved}</strong> remain <u>unsolved</u>, and 
    <strong>${review}</strong> are currently under <u>review</u>. 
    This provides administrators with a clear snapshot of the current ticket distribution and workload.
  `.replace(/\s+/g, ' ').trim();

  // create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'tickets-automate-overlay';
  overlay.className = 'tc-modal';
  overlay.style.display = 'flex';

  const content = document.createElement('div');
  content.className = 'tc-modal__content';
  content.innerHTML = `
    <h3 style="text-align:center; font-weight:600;">🤖 Automated Tickets Summary</h3>
    <div id="tickets-automate-text" style="font-size:15px; line-height:1.6; text-align:justify; color:#111;"></div>
    <div id="tickets-qa-container" style="margin-top:15px; font-size:15px; line-height:1.6; text-align:justify;"></div>
    <div id="tickets-automate-qa" style="margin-top:20px; display:none;">
      <input id="tickets-qa-input" type="text" placeholder="Ask something..." 
        style="padding:8px; width:70%; border-radius:6px; border:1px solid #ccc; font-size:0.9rem;">
      <button id="tickets-qa-btn" class="ask-btn">
        <span class="btn-text">Ask</span>
        <span class="spinner" style="display:none;"></span>
      </button>
    </div>
    <div style="text-align:center; margin-top:20px;">
      <button id="close-tickets-automate-btn" class="close-automate-btn">Close</button>
    </div>
  `;
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  // helper: try to extract createdAt string from a row (many fallbacks)
  function extractCreatedAtFromRow(row) {
    if (row.dataset && row.dataset.createdAt) return row.dataset.createdAt;

    const byData = row.querySelector('[data-createdat], [data-created-at]');
    if (byData) {
      return byData.dataset.createdat || byData.dataset['createdAt'] || byData.dataset['created-at'] || byData.textContent.trim();
    }

    const byClass = row.querySelector('.created-at');
    if (byClass) return byClass.textContent.trim();

    const text = row.textContent || '';
    const isoMatch = text.match(/\d{4}-\d{2}-\d{2}T?\d{0,2}:?\d{0,2}:?\d{0,2}Z?/);
    if (isoMatch) return isoMatch[0];

    const readableMatch = text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?/i);
    if (readableMatch) return readableMatch[0];

    const slashMatch = text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
    if (slashMatch) return slashMatch[0];

    return null;
  }

  function parseMaybeDate(str) {
    if (!str) return null;
    try {
      const d = new Date(str);
      if (isNaN(d)) return null;
      return d;
    } catch {
      return null;
    }
  }

  function typeText(element, htmlText, speed = 22, onComplete) {
    document.querySelectorAll('.typing-cursor').forEach(c => c.remove());
    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.textContent = '|';
    cursor.style.display = 'inline-block';
    cursor.style.marginLeft = '3px';
    cursor.style.color = '#111';
    element.appendChild(cursor);

    function typeStep() {
      if (i >= htmlText.length) {
        cursor.classList.add('blink-tickets');
        if (onComplete) onComplete();
        return;
      }
      i++;
      const upto = (() => {
        const partial = htmlText.slice(0, i);
        const lastOpen = partial.lastIndexOf('<');
        const lastClose = partial.lastIndexOf('>');
        if (lastOpen > lastClose) {
          const nextClose = htmlText.indexOf('>', i);
          return nextClose === -1 ? htmlText.length : nextClose + 1;
        }
        return i;
      })();
      element.innerHTML = htmlText.substring(0, upto);
      element.appendChild(cursor);
      i = upto;
      setTimeout(typeStep, speed);
    }
    typeStep();
  }

  // type summary
  const textEl = document.getElementById('tickets-automate-text');
  typeText(textEl, summaryHTML, 22, () => {
    document.getElementById('tickets-automate-qa').style.display = 'block';
  });

  // Q&A handler
  document.getElementById('tickets-qa-btn').addEventListener('click', () => {
    const inputEl = document.getElementById('tickets-qa-input');
    const btnEl = document.getElementById('tickets-qa-btn');
    const spinner = btnEl.querySelector('.spinner');
    const btnText = btnEl.querySelector('.btn-text');

    const question = inputEl.value.trim();
    if (!question) return;

    // disable while processing
    inputEl.disabled = true;
    btnEl.disabled = true;
    spinner.style.display = 'inline-block';
    btnText.style.display = 'none';

    const qaContainer = document.getElementById('tickets-qa-container');

    // append question block
    const qBlock = document.createElement('div');
    qBlock.style.marginTop = '15px';
    qBlock.innerHTML = `<strong>Q:</strong> ${escapeHtml(question)}`;
    qaContainer.appendChild(qBlock);

    // prepare answer block
    const aBlock = document.createElement('div');
    aBlock.style.marginTop = '5px';
    aBlock.style.fontSize = '15px';
    aBlock.style.lineHeight = '1.6';
    qaContainer.appendChild(aBlock);

    let answerText = `<em>Please ask questions related to this page only like "most recently created tickets", "oldest ticket", or "most reported ticket" information.</em>`;
    const qLower = question.toLowerCase();

    //  1. Most reported item
    if (qLower.includes('most') && qLower.includes('report')) {
      const counts = {};
      const itemReports = {};

      rows.forEach(row => {
        const itemCell = row.cells[1];
        const itemName = itemCell ? itemCell.textContent.trim() : null;
        if (!itemName) return;
        counts[itemName] = (counts[itemName] || 0) + 1;
        if (!itemReports[itemName]) itemReports[itemName] = [];
        itemReports[itemName].push(row);
      });

      let maxItem = null;
      let maxCount = 0;
      for (const [name, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxItem = name;
          maxCount = count;
        }
      }

      if (maxItem) {
        const reportRows = itemReports[maxItem];
        const rowsWithDates = reportRows.map(r => {
          const raw = extractCreatedAtFromRow(r);
          return { row: r, rawDateStr: raw, parsed: parseMaybeDate(raw) };
        });
        const withParsed = rowsWithDates.filter(e => e.parsed);
        let latestEntry;
        if (withParsed.length) {
          withParsed.sort((a, b) => b.parsed - a.parsed);
          latestEntry = withParsed[0];
        } else {
          const lastRow = reportRows[reportRows.length - 1];
          latestEntry = { row: lastRow, rawDateStr: extractCreatedAtFromRow(lastRow), parsed: null };
        }

        const latestRow = latestEntry.row;
        const descEl = latestRow.querySelector('.ticket-description');
        const latestDesc = descEl ? descEl.textContent.trim() : (latestRow.cells[2] ? latestRow.cells[2].textContent.trim() : 'No description available');
        const idCell = latestRow.cells[0];
        const itemId = idCell ? idCell.textContent.trim() : 'N/A';
        const latestDateStr = latestEntry.parsed ? latestEntry.parsed.toLocaleString() : (latestEntry.rawDateStr || 'date unavailable');

        answerText = `
          The current item with the most reports is
          <strong>${escapeHtml(maxItem)}</strong> (ID: <u>${escapeHtml(itemId)}</u>),
          with <strong>${maxCount}</strong> reports.
          The most recent report describes: "<em>${escapeHtml(latestDesc)}</em>",
          which was issued last on <strong>${escapeHtml(String(latestDateStr))}</strong>.
        `.replace(/\s+/g, ' ').trim();
      } else {
        answerText = `<em>No item reports found.</em>`;
      }
    }

    //  2. Most recently created ticket
    else if (qLower.includes('most') && qLower.includes('recent')) {
      const rowsWithDates = rows
        .map(r => ({
          row: r,
          parsed: parseMaybeDate(extractCreatedAtFromRow(r))
        }))
        .filter(e => e.parsed);

      if (rowsWithDates.length > 0) {
        rowsWithDates.sort((a, b) => b.parsed - a.parsed);
        const newest = rowsWithDates[0].row;
        const dateStr = rowsWithDates[0].parsed.toLocaleString();
        const id = newest.cells[0]?.textContent.trim() || 'N/A';
        const item = newest.cells[1]?.textContent.trim() || 'N/A';
        const status = newest.querySelector('.status-badge')?.textContent.trim() || 'N/A';

        answerText = `
          The most recently created ticket is
          <strong>ID: <u>${escapeHtml(id)}</u></strong> for
          <strong>${escapeHtml(item)}</strong>,
          issued on <strong>${escapeHtml(dateStr)}</strong>.
          Its current status is <strong>${escapeHtml(status)}</strong>.
        `.replace(/\s+/g, ' ').trim();
      } else {
        answerText = `<em>No valid ticket creation dates found.</em>`;
      }
    }

    //  3. Oldest ticket
    else if (qLower.includes('oldest')) {
      const rowsWithDates = rows
        .map(r => ({
          row: r,
          parsed: parseMaybeDate(extractCreatedAtFromRow(r))
        }))
        .filter(e => e.parsed);

      if (rowsWithDates.length > 0) {
        rowsWithDates.sort((a, b) => a.parsed - b.parsed);
        const oldest = rowsWithDates[0].row;
        const dateStr = rowsWithDates[0].parsed.toLocaleString();
        const id = oldest.cells[0]?.textContent.trim() || 'N/A';
        const item = oldest.cells[1]?.textContent.trim() || 'N/A';
        const status = oldest.querySelector('.status-badge')?.textContent.trim() || 'N/A';

        answerText = `
          The oldest ticket is
          <strong>ID: <u>${escapeHtml(id)}</u></strong> for
          <strong>${escapeHtml(item)}</strong>,
          issued on <strong>${escapeHtml(dateStr)}</strong>.
          Its current status is <strong>${escapeHtml(status)}</strong>.
        `.replace(/\s+/g, ' ').trim();
      } else {
        answerText = `<em>No valid ticket creation dates found.</em>`;
      }
    }

    typeText(aBlock, `<strong>A:</strong> ${answerText}`, 20, () => {
      inputEl.disabled = false;
      btnEl.disabled = false;
      spinner.style.display = 'none';
      btnText.style.display = 'inline';
      inputEl.value = '';
      inputEl.focus();
    });

    setTimeout(() => {
      aBlock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 600);
  });

  // ==================== Styles ====================
  if (!document.getElementById('tickets-automate-blink-style')) {
    const s = document.createElement('style');
    s.id = 'tickets-automate-blink-style';
    s.innerHTML = `
      @keyframes blink-caret { 50% { opacity: 0; } }
      .blink-tickets { animation: blink-caret 0.8s steps(1) infinite; }

      .close-automate-btn {
        background-color: #2D3E50;
        color: #fff;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: transform 0.15s ease, background-color 0.2s ease;
      }
      .close-automate-btn:hover { 
        transform: scale(1.05);
        background-color: #3a506b;
      }

      .ask-btn {
        background-color: #2D3E50;    /* 🔹 Same as close button */
        color: #fff;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 600;
        transition: transform 0.15s ease, background-color 0.2s ease;
      }
      .ask-btn:hover {
        transform: scale(1.05);
        background-color: #3a506b;   /* 🔹 Same hover color */
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #fff;
        border-top: 2px solid transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(s);
  }

  // ==================== Close ====================
  document.getElementById('close-tickets-automate-btn').addEventListener('click', () => {
    overlay.remove();
    document.body.style.overflow = '';
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      document.body.style.overflow = '';
    }
  });

  document.body.style.overflow = 'hidden';

  function escapeHtml(str) {
    return String(str || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
};

// ==================== FAQS HANDLER ====================
document.querySelectorAll(".faq-question").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".faq-item");
    const answer = item.querySelector(".faq-answer");
    const icon = btn.querySelector(".faq-icon");
    answer.classList.toggle("open");
    if (answer.classList.contains("open")) {
      icon.textContent = "−";
      answer.style.maxHeight = answer.scrollHeight + "px";
    } else {
      icon.textContent = "+";
      answer.style.maxHeight = null;
    }
  });
});
