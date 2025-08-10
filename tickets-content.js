// Robust initializer: waits up to `timeout` ms for the selector to exist, then resolves.
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
        reject(new Error('Timed out waiting for ' + selector));
      }
    }, 40);
  });
}

(async function initTicketsContent() {
  try {
    await waitForElement('#tc-ticketsTableBody');

    const ticketsTableBody = document.getElementById('tc-ticketsTableBody');
    const createTicketBtn = document.getElementById('tc-createTicketBtn');
    const modal = document.getElementById('tc-ticketModal');
    const closeModal = document.getElementById('tc-closeModal');
    const submitTicketBtn = document.getElementById('tc-submitTicketBtn');
    const ticketConcern = document.getElementById('tc-ticketConcern');
    const ticketDescription = document.getElementById('tc-ticketDescription');
    const ticketItem = document.getElementById('tc-ticketItem');

    if (!ticketsTableBody || !createTicketBtn || !modal || !ticketItem) {
      console.warn('tickets-content: missing expected elements, aborting init.');
      return;
    }

    // Ensure a lab-filter element exists inside the modal; if not, create it dynamically.
    let ticketLabFilter = document.getElementById('tc-ticketLabFilter');
    if (!ticketLabFilter) {
      ticketLabFilter = document.createElement('select');
      ticketLabFilter.id = 'tc-ticketLabFilter';
      ticketLabFilter.innerHTML = `
          <option value="">All Laboratories</option>
          <option value="Laboratory 1">Laboratory 1</option>
          <option value="Laboratory 2">Laboratory 2</option>
          <option value="Laboratory 3">Laboratory 3</option>
          <option value="Laboratory 4">Laboratory 4</option>
      `;

      // Create label
      const labLabel = document.createElement('label');
      labLabel.htmlFor = 'tc-ticketLabFilter';
      labLabel.textContent = 'Filter by Laboratory:';
      labLabel.style.display = 'block';
      labLabel.style.marginBottom = '4px';

      try {
        // Insert before the "Item" label
        const itemLabel = ticketItem.previousElementSibling; // Label for Item dropdown
        itemLabel.parentNode.insertBefore(labLabel, itemLabel);
        itemLabel.parentNode.insertBefore(ticketLabFilter, itemLabel);
      } catch (e) {
        modal.querySelector('.tc-modal__content')?.appendChild(labLabel);
        modal.querySelector('.tc-modal__content')?.appendChild(ticketLabFilter);
      }
    }

    // Firestore reference to your tickets collection
    const ticketsCollection = firebase.firestore().collection('tickets');

    // Load tickets from Firestore
    async function getTickets() {
      try {
        const snapshot = await ticketsCollection.orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error loading tickets from Firestore:', error);
        return [];
      }
    }

    // Save ticket to Firestore
    async function saveTicket(ticket) {
      try {
        const docRef = await ticketsCollection.add(ticket);
        return docRef.id;
      } catch (error) {
        console.error('Error saving ticket to Firestore:', error);
        throw error;
      }
    }

    // Delete ticket from Firestore
    async function deleteTicket(id) {
      try {
        await ticketsCollection.doc(id).delete();
      } catch (error) {
        console.error('Error deleting ticket:', error);
        throw error;
      }
    }

    let tickets = await getTickets();

    // Render tickets into the table
    function renderTickets() {
      ticketsTableBody.innerHTML = '';

      tickets.forEach((t, index) => {
        const tr = document.createElement('tr');
        const statusClass = 'status-' + (t.status || 'pending').toLowerCase();
        tr.innerHTML = `
          <td>${t.id}</td>
          <td>${escapeHtml(t.item)}</td>
          <td>${escapeHtml(t.concern)}</td>
          <td>${escapeHtml(t.description)}</td>
          <td class="${statusClass}">${escapeHtml(t.status)}</td>
          <td>
            <button class="btn-delete" data-index="${index}" title="Delete Ticket">Delete</button>
          </td>
        `;
        ticketsTableBody.appendChild(tr);
      });

      // Attach event listeners for Delete buttons
      ticketsTableBody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', onDeleteTicket);
      });
    }

    function escapeHtml(s = '') {
      return String(s)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    // Get inventory items as array of objects { name, lab }
    async function getInventoryItems() {
      if (window.firebase && firebase.firestore) {
        try {
          const snapshot = await firebase.firestore().collection('inventory').get();
          const items = snapshot.docs.map(d => {
            const data = d.data();
            return {
              name: data.Name ?? d.id,
              lab: data.Laboratory ?? null
            };
          });
          if (items.length) {
            return items;
          }
        } catch (err) {
          console.warn('tickets-content: firestore fetch failed', err);
        }
      }

      // fallback sample data
      return [
        { name: 'Sample Item 1', lab: 'Laboratory 1' },
        { name: 'Sample Item 2', lab: 'Laboratory 2' }
      ];
    }

    // Populate item dropdown, optionally filter by labFilter
    async function loadItemsDropdown(labFilter = '') {
      const items = await getInventoryItems();
      ticketItem.innerHTML = '';

      const filterNormalized = labFilter.toLowerCase();

      const filtered = items.filter(it => {
        const itemLabNormalized = (it.lab || '').toLowerCase();
        return !filterNormalized || itemLabNormalized === filterNormalized;
      });

      if (filtered.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No items found';
        ticketItem.appendChild(opt);
        return;
      }

      filtered.forEach(it => {
        const opt = document.createElement('option');
        opt.value = it.name;
        opt.textContent = it.name;
        if (it.lab) opt.dataset.lab = it.lab;
        ticketItem.appendChild(opt);
      });
    }

    // When lab filter changes inside modal, reload items using that filter
    ticketLabFilter.addEventListener('change', () => {
      loadItemsDropdown(ticketLabFilter.value || '');
    });

    // Show modal: reset lab filter to All and load items (All)
    createTicketBtn.addEventListener('click', async () => {
      ticketLabFilter.value = '';
      await loadItemsDropdown('');
      modal.style.display = 'block';
      modal.setAttribute('aria-hidden', 'false');
      ticketConcern.value = '';
      ticketDescription.value = '';
      submitTicketBtn.textContent = 'Submit';
      ticketConcern.focus();
    });

    // Close modal handlers
    closeModal?.addEventListener('click', () => {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      submitTicketBtn.textContent = 'Submit';
    });
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        submitTicketBtn.textContent = 'Submit';
      }
    });

    // Submit (create only)
    submitTicketBtn.addEventListener('click', async () => {
      const concern = ticketConcern.value.trim();
      const description = ticketDescription.value.trim();
      const selectedOpt = ticketItem.options[ticketItem.selectedIndex];
      const itemName = selectedOpt ? selectedOpt.value : '';
      const labFromOpt = selectedOpt ? (selectedOpt.dataset.lab || '') : '';
      const labFromFilter = ticketLabFilter.value || '';

      if (!concern || !description || !itemName) {
        alert('Please fill in all fields.');
        return;
      }

      const ticketLabValue = labFromOpt || labFromFilter || '';

      const newTicket = {
        item: itemName,
        lab: ticketLabValue,
        concern,
        description,
        status: 'Pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        const newId = await saveTicket(newTicket);
        newTicket.id = newId;
        tickets.unshift(newTicket);  // Add new ticket at the start for descending order
        renderTickets();

        ticketConcern.value = '';
        ticketDescription.value = '';
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
      } catch (err) {
        alert('Failed to save ticket. Please try again.');
      }
    });

    // Delete ticket handler
    async function onDeleteTicket(event) {
      const index = parseInt(event.target.dataset.index);
      if (isNaN(index)) return;

      const ticketToDelete = tickets[index];
      if (!ticketToDelete) return;

      if (confirm('Are you sure you want to delete this ticket?')) {
        try {
          await deleteTicket(ticketToDelete.id);
          tickets.splice(index, 1);
          renderTickets();
        } catch {
          alert('Failed to delete ticket. Please try again.');
        }
      }
    }

    // initial render
    renderTickets();
    console.log('tickets-content initialized (Firestore-backed)');
  } catch (err) {
    console.error('tickets-content init error:', err);
  }
})();
