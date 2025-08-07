import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAw2rSjJ3f_S98dntbsyl9kyXvi9MC44Dw",
  authDomain: "fir-inventory-2e62a.firebaseapp.com",
  projectId: "fir-inventory-2e62a",
  storageBucket: "fir-inventory-2e62a.firebasestorage.app",
  messagingSenderId: "380849220480",
  appId: "1:380849220480:web:5a43b227bab9f9a197af65",
  measurementId: "G-ERT87GL4XC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const inventoryRef = collection(db, "inventory");

const categories = ["Good", "Deteriorating", "Damaged"];
const laboratories = ["Laboratory 1", "Laboratory 2", "Laboratory 3", "Laboratory 4"];

function showNotification(message, isError = false) {
  const notif = document.getElementById('notification');
  notif.textContent = message;
  notif.className = 'notification show' + (isError ? ' error' : '');
  setTimeout(() => notif.classList.remove('show'), 3000);
}

function openModal() {
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('newItemForm').reset();
}

async function handleAddItem(event) {
  event.preventDefault();
  const name = document.getElementById('newName').value.trim();
  const category = document.getElementById('newCategory').value;
  const laboratory = document.getElementById('newLab').value;

  if (!name) return showNotification("Name is required", true);

  try {
    await addDoc(inventoryRef, {
      name,
      category,
      laboratory,
      createdAt: new Date()
    });
    closeModal();
    showNotification("Item added!");
  } catch (e) {
    console.error("Error adding item:", e);
    showNotification("Failed to add item.", true);
  }
}

async function deleteItem(id) {
  try {
    await deleteDoc(doc(db, "inventory", id));
    showNotification("Item deleted.");
  } catch (e) {
    console.error("Error deleting item:", e);
    showNotification("Failed to delete item.", true);
  }
}

async function updateItem(id, newData) {
  try {
    await updateDoc(doc(db, "inventory", id), newData);
    showNotification("Item updated.");
  } catch (e) {
    console.error("Error updating item:", e);
    showNotification("Failed to update item.", true);
  }
}

function displayItems() {
  const list = document.getElementById('itemList');
  const labFilter = document.getElementById('labFilter');
  const searchInput = document.getElementById('searchInput');

  let allItems = [];

  const renderFilteredItems = () => {
    const selectedLab = labFilter.value;
    const searchTerm = searchInput.value.toLowerCase();
    list.innerHTML = '';

    allItems
      .filter(item => {
        const matchesLab = selectedLab === 'all' || item.data.laboratory === selectedLab;
        const matchesName = item.data.name.toLowerCase().includes(searchTerm);
        return matchesLab && matchesName;
      })
      .forEach(({ id, data }) => {
        const li = document.createElement('li');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'field item-name';
        nameSpan.textContent = data.name;

        const nameInput = document.createElement('input');
        nameInput.value = data.name;
        nameInput.style.display = 'none';

        const categorySpan = document.createElement('span');
        categorySpan.className = 'field';
        categorySpan.textContent = "Category: " + data.category;

        const categorySelect = document.createElement('select');
        categorySelect.style.display = 'none';
        categories.forEach(cat => {
          const option = document.createElement('option');
          option.value = cat;
          option.textContent = cat;
          if (cat === data.category) option.selected = true;
          categorySelect.appendChild(option);
        });

        const labSpan = document.createElement('span');
        labSpan.className = 'field';
        labSpan.textContent = "Laboratory: " + data.laboratory;

        const labSelect = document.createElement('select');
        labSelect.style.display = 'none';
        laboratories.forEach(lab => {
          const option = document.createElement('option');
          option.value = lab;
          option.textContent = lab;
          if (lab === data.laboratory) option.selected = true;
          labSelect.appendChild(option);
        });

        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'edit-btn';
        editBtn.onclick = () => {
          nameSpan.style.display = 'none';
          categorySpan.style.display = 'none';
          labSpan.style.display = 'none';

          nameInput.style.display = 'block';
          categorySelect.style.display = 'block';
          labSelect.style.display = 'block';

          editBtn.style.display = 'none';
          saveBtn.style.display = 'inline-block';
        };

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'edit-btn save-btn';
        saveBtn.style.display = 'none';
        saveBtn.onclick = () => {
          const newName = nameInput.value.trim();
          const newCategory = categorySelect.value;
          const newLab = labSelect.value;

          if (newName !== "") {
            updateItem(id, {
              name: newName,
              category: newCategory,
              laboratory: newLab
            });
            nameSpan.textContent = "Name: " + newName;
            categorySpan.textContent = "Category: " + newCategory;
            labSpan.textContent = "Laboratory: " + newLab;
          }

          nameSpan.style.display = 'block';
          categorySpan.style.display = 'block';
          labSpan.style.display = 'block';
          nameInput.style.display = 'none';
          categorySelect.style.display = 'none';
          labSelect.style.display = 'none';
          editBtn.style.display = 'inline-block';
          saveBtn.style.display = 'none';
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'delete-btn';
        deleteBtn.onclick = () => deleteItem(id);

        li.appendChild(nameSpan);
        li.appendChild(nameInput);
        li.appendChild(categorySpan);
        li.appendChild(categorySelect);
        li.appendChild(labSpan);
        li.appendChild(labSelect);

        const createdSpan = document.createElement('span');
        createdSpan.className = 'field';
        if (data.createdAt && data.createdAt.toDate) {
          const createdDate = data.createdAt.toDate();
          createdSpan.textContent = "Created on: " + createdDate.toLocaleString();
        } else {
          createdSpan.textContent = "Created on: N/A";
        }

        const actions = document.createElement('div');
        actions.className = 'actions';
        actions.appendChild(editBtn);
        actions.appendChild(saveBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(createdSpan);
        li.appendChild(actions);
        list.appendChild(li);
      });
  };

  onSnapshot(inventoryRef, (snapshot) => {
    allItems = [];
    snapshot.forEach((docSnap) => {
      allItems.push({ id: docSnap.id, data: docSnap.data() });
    });
    renderFilteredItems();
  });

  labFilter.addEventListener('change', renderFilteredItems);
  searchInput.addEventListener('input', renderFilteredItems);
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addButton').addEventListener('click', openModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('newItemForm').addEventListener('submit', handleAddItem);
  displayItems();
});
