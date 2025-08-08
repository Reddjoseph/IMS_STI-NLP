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
const closeLogin = document.getElementById('close-login');
const toggleRegister = document.getElementById('toggle-register');
const toggleLogin = document.getElementById('toggle-login');
const registerBtn = document.getElementById('register-btn');
const loginActionBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

const avatar = document.getElementById('user-avatar');
const avatarDropdown = document.getElementById('avatar-dropdown');
const inventoryLink = document.getElementById('inventory-link');
const loginGroup = document.querySelector('.login-avatar-group');

loginBtn.addEventListener('click', () => loginModal.style.display = 'block');
closeLogin.addEventListener('click', () => loginModal.style.display = 'none');

const roleSelect = document.getElementById('role-select');

toggleRegister.addEventListener('click', () => {
  registerBtn.style.display = 'block';
  loginActionBtn.style.display = 'none';
  toggleRegister.style.display = 'none';
  toggleLogin.style.display = 'block';
  roleSelect.style.display = 'block'; // show roles dropdown
});

toggleLogin.addEventListener('click', () => {
  registerBtn.style.display = 'none';
  loginActionBtn.style.display = 'block';
  toggleRegister.style.display = 'block';
  toggleLogin.style.display = 'none';
  roleSelect.style.display = 'none'; // hide roles dropdown
});

registerBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  const role = roleSelect.value; // get selected role

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;

      // Save the role in Firestore under "users" collection with user.uid
      return db.collection('users').doc(user.uid).set({
        email: email,
        role: role,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      loginModal.style.display = 'none';
      loginError.textContent = ''; // clear any error
    })
    .catch(error => {
      loginError.textContent = error.message;
    });
});

loginActionBtn.addEventListener('click', () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      loginModal.style.display = 'none';
    })
    .catch(error => {
      loginError.textContent = error.message;
    });
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
  avatarDropdown.classList.remove('visible');
});

avatar.addEventListener('click', () => {
  avatarDropdown.classList.toggle('visible');
});

auth.onAuthStateChanged(user => {
  if (user) {
    avatar.style.display = 'block';
    loginBtn.style.display = 'none';

    db.collection('users').doc(user.uid).get()
      .then(doc => {
        if (doc.exists) {
          const role = doc.data().role || 'User';
          const userRoleDiv = document.getElementById('user-role');
          userRoleDiv.textContent = `Role: ${role}`;
          userRoleDiv.style.display = 'block';

          // Show inventory link only if role is Admin or Maintenance
          if (role === 'Admin' || role === 'Maintenance') {
            inventoryLink.style.display = 'block';
          } else {
            inventoryLink.style.display = 'none';
          }
        } else {
          // If no role found, hide inventory
          inventoryLink.style.display = 'none';
        }
      })
      .catch(error => {
        console.error("Error fetching user role:", error);
        inventoryLink.style.display = 'none';
      });

  } else {
    avatar.style.display = 'none';
    loginBtn.style.display = 'flex';
    inventoryLink.style.display = 'none';

    const userRoleDiv = document.getElementById('user-role');
    userRoleDiv.style.display = 'none';
  }
});



// About page dynamic content
document.getElementById("about-link").addEventListener("click", function () {
  document.getElementById("main-content").style.display = "none";
  const aboutPage = document.getElementById("about-page");
  aboutPage.style.display = "block";
  aboutPage.innerHTML = `
    <h1>About Our Inventory Management System</h1>
    <p>This system helps STI College manage, track, and maintain its inventory of IT equipment and devices with ease and efficiency.</p>
  `;
});

document.getElementById("home-link").addEventListener("click", function () {
  document.getElementById("main-content").style.display = "block";
  document.getElementById("about-page").style.display = "none";
});

// Handle active class on navbar links
const navLinks = document.querySelectorAll('nav.navbar ul li a');

navLinks.forEach(link => {
  link.addEventListener('click', function () {
    // Remove 'active' class from all nav links
    navLinks.forEach(l => l.classList.remove('active'));

    // Add 'active' class to the clicked link
    this.classList.add('active');
  });
});
