// Firebase config and initialization
const firebaseConfig = {
  apiKey: "AIzaSyAw2rSjJ3f_S98dntbsyl9kyXvi9MC44Dw",
  authDomain: "fir-inventory-2e62a.firebaseapp.com",
  projectId: "fir-inventory-2e62a",
  storageBucket: "fir-inventory-2e62a.firebasestorage.app",
  messagingSenderId: "380849220480",
  appId: "1:380849220480:web:5a43b227bab9f9a197af65",
  measurementId: "G-ERT87GL4XC"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements for auth and UI
const loginModal = document.getElementById('login-modal');
const loginBtn = document.querySelector('.login-btn');
const closeLoginBtn = document.getElementById('close-login');
const loginSubmitBtn = document.getElementById('login-btn');
const registerSubmitBtn = document.getElementById('register-btn');
const toggleToRegisterBtn = document.getElementById('toggle-register');
const toggleToLoginBtn = document.getElementById('toggle-login');
const loginError = document.getElementById('login-error');
const modalTitle = document.querySelector('#login-modal h2');

const userAvatarDiv = document.getElementById('user-avatar');
const userAvatarImg = userAvatarDiv ? userAvatarDiv.querySelector('img') : null;
const avatarDropdown = document.getElementById('avatar-dropdown');
const logoutBtn = document.getElementById('logout-btn');

const inventoryLink = document.getElementById('inventory-link');

// DOM elements for content toggle
const aboutLink = document.getElementById('about-link');
const homeLink = document.getElementById('home-link');
const mainContent = document.getElementById('main-content');
const aboutPage = document.getElementById('about-page');

// Show login modal
loginBtn.addEventListener('click', (e) => {
  e.preventDefault();
  showLoginForm();
  loginModal.style.display = 'block';
});

// Close login modal
closeLoginBtn.addEventListener('click', () => {
  loginModal.style.display = 'none';
  loginError.textContent = '';
});

// Login submit
loginSubmitBtn.addEventListener('click', () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if(!email || !password) {
    loginError.textContent = "Please enter email and password.";
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      loginError.textContent = '';
      loginModal.style.display = 'none';
      alert('Logged in successfully!');
    })
    .catch((error) => {
      loginError.textContent = error.message;
    });
});

// Register submit
registerSubmitBtn.addEventListener('click', () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if(!email || !password) {
    loginError.textContent = "Please enter email and password.";
    return;
  }

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      loginError.textContent = '';
      loginModal.style.display = 'none';
      alert('Registered and logged in successfully!');
    })
    .catch((error) => {
      loginError.textContent = error.message;
    });
});

// Toggle to register form
toggleToRegisterBtn.addEventListener('click', () => {
  showRegisterForm();
});

// Toggle back to login form
toggleToLoginBtn.addEventListener('click', () => {
  showLoginForm();
});

function showLoginForm() {
  modalTitle.textContent = 'Login';
  loginSubmitBtn.style.display = 'block';
  registerSubmitBtn.style.display = 'none';
  toggleToRegisterBtn.style.display = 'inline-block';
  toggleToLoginBtn.style.display = 'none';
  loginError.textContent = '';
}

function showRegisterForm() {
  modalTitle.textContent = 'Register';
  loginSubmitBtn.style.display = 'none';
  registerSubmitBtn.style.display = 'block';
  toggleToRegisterBtn.style.display = 'none';
  toggleToLoginBtn.style.display = 'inline-block';
  loginError.textContent = '';
}

// Update UI based on auth state
auth.onAuthStateChanged(user => {
  if (user) {
    loginBtn.style.display = 'none';
    userAvatarDiv.style.display = 'block';

    // Show inventory link for authenticated users
    inventoryLink.style.display = 'inline-flex';

    // Load user photoURL or default avatar
    if (user.photoURL) {
      userAvatarImg.src = user.photoURL;
    } else {
      userAvatarImg.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'; // default avatar
    }
  } else {
    loginBtn.style.display = 'flex';
    userAvatarDiv.style.display = 'none';
    inventoryLink.style.display = 'none';
  }
});

// Avatar dropdown toggle using .visible class
userAvatarDiv.addEventListener('click', (e) => {
  e.stopPropagation();
  avatarDropdown.classList.toggle('visible');
});


// Hide dropdown if clicking outside
document.addEventListener('click', () => {
  avatarDropdown.classList.remove('visible');
});

// Logout
logoutBtn.addEventListener('click', (e) => {
  e.preventDefault();
  auth.signOut();
  avatarDropdown.classList.remove('visible');
  alert('Logged out successfully!');
});

// Navigation for about and home
aboutLink.addEventListener('click', (e) => {
  e.preventDefault();
  mainContent.style.display = 'none';
  aboutPage.style.display = 'block';
  homeLink.classList.remove('active');
  aboutLink.classList.add('active');

  // Fill about content
  aboutPage.innerHTML = `
    <p>This is a custom website created by a custom programmer. All rights reserved 2024</p>
    <p>Visit the <a href="https://sti.edu/" target="_blank" style="color: yellow;">STI Website</a> for more info.</p>
  `;

});

homeLink.addEventListener('click', (e) => {
  e.preventDefault();
  mainContent.style.display = 'block';
  aboutPage.style.display = 'none';
  homeLink.classList.add('active');
  aboutLink.classList.remove('active');
});

