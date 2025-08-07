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

// DOM elements
const loginModal = document.getElementById('login-modal');
const loginBtn = document.querySelector('.login-btn');
const closeLoginBtn = document.getElementById('close-login');
const loginSubmitBtn = document.getElementById('login-btn');
const registerSubmitBtn = document.getElementById('register-btn');
const toggleToRegisterBtn = document.getElementById('toggle-register');
const toggleToLoginBtn = document.getElementById('toggle-login');
const loginError = document.getElementById('login-error');
const modalTitle = document.querySelector('#login-modal h2');

const userAvatarLi = document.getElementById('user-avatar');
const userAvatarImg = userAvatarLi ? userAvatarLi.querySelector('img') : null;
const avatarDropdown = document.getElementById('avatar-dropdown');
const logoutBtn = document.getElementById('logout-btn');

// Show login modal
loginBtn.addEventListener('click', () => {
  showLoginForm();
  loginModal.style.display = 'block';
});

// Close modal
closeLoginBtn.addEventListener('click', () => {
  loginModal.style.display = 'none';
  loginError.textContent = '';
});

// Login submit
loginSubmitBtn.addEventListener('click', () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

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

// Toggle to Register form
toggleToRegisterBtn.addEventListener('click', () => {
  showRegisterForm();
});

// Toggle back to Login form
toggleToLoginBtn.addEventListener('click', () => {
  showLoginForm();
});

// Functions to switch forms
function showLoginForm() {
  modalTitle.textContent = 'Login';
  loginSubmitBtn.style.display = 'block';
  registerSubmitBtn.style.display = 'none';
  toggleToRegisterBtn.style.display = 'inline-block';
  toggleToLoginBtn.style.display = 'none';
  loginError.textContent = '';
  clearInputs();
}

function showRegisterForm() {
  modalTitle.textContent = 'Register';
  loginSubmitBtn.style.display = 'none';
  registerSubmitBtn.style.display = 'block';
  toggleToRegisterBtn.style.display = 'none';
  toggleToLoginBtn.style.display = 'inline-block';
  loginError.textContent = '';
  clearInputs();
}

function clearInputs() {
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
}

// Logout button click inside dropdown
logoutBtn.addEventListener('click', () => {
  auth.signOut();
  avatarDropdown.style.display = 'none';
});

// Toggle dropdown on avatar click
if (userAvatarImg) {
  userAvatarImg.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent click from bubbling to document
    if (avatarDropdown.style.display === 'block') {
      avatarDropdown.style.display = 'none';
    } else {
      avatarDropdown.style.display = 'block';
    }
  });
}

// Close dropdown if click outside
document.addEventListener('click', () => {
  if (avatarDropdown) {
    avatarDropdown.style.display = 'none';
  }
});

auth.onAuthStateChanged(user => {
  if (user) {
    console.log('User logged in:', user.email);

    if (loginBtn) loginBtn.style.display = 'none';

    if (userAvatarLi && userAvatarImg) {
      userAvatarLi.style.display = 'inline-block';

      if (user.photoURL) {
        userAvatarImg.src = user.photoURL;
      } else {
        userAvatarImg.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.email) + '&background=FFFF00&color=000000&rounded=true&size=128';
      }
    }
  } else {
    console.log('User logged out');
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (userAvatarLi) userAvatarLi.style.display = 'none';
    if (avatarDropdown) avatarDropdown.style.display = 'none';
  }
});
