window.onload = function () {
  console.log("Script loaded and window.onload triggered");
  loadPage('home');

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

  // DOM Elements
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
  const myTicketsLink = document.getElementById('my-tickets-link');
  const loginGroup = document.querySelector('.login-avatar-group');

  loginBtn.addEventListener('click', () => loginModal.style.display = 'block');
  closeLogin.addEventListener('click', () => loginModal.style.display = 'none');

  const roleSelect = document.getElementById('role-select');

  toggleRegister.addEventListener('click', () => {
    registerBtn.style.display = 'block';
    loginActionBtn.style.display = 'none';
    toggleRegister.style.display = 'none';
    toggleLogin.style.display = 'block';
    roleSelect.style.display = 'block';
  });

  toggleLogin.addEventListener('click', () => {
    registerBtn.style.display = 'none';
    loginActionBtn.style.display = 'block';
    toggleRegister.style.display = 'block';
    toggleLogin.style.display = 'none';
    roleSelect.style.display = 'none';
  });

  registerBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    const role = roleSelect.value;

    auth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        const user = userCredential.user;
        return db.collection('users').doc(user.uid).set({
          email: email,
          role: role,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(() => {
        loginModal.style.display = 'none';
        loginError.textContent = '';
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

            if (role === 'Admin' || role === 'Maintenance') {
              inventoryLink.style.display = 'block';
              myTicketsLink.style.display = 'none';
            } else if (role === 'User') {
              inventoryLink.style.display = 'none';
              myTicketsLink.style.display = 'block';
            } else {
              inventoryLink.style.display = 'none';
              myTicketsLink.style.display = 'none';
            }
          } else {
            inventoryLink.style.display = 'none';
            myTicketsLink.style.display = 'none';
          }
        })
        .catch(error => {
          console.error("Error fetching user role:", error);
          inventoryLink.style.display = 'none';
          myTicketsLink.style.display = 'none';
        });
    } else {
      avatar.style.display = 'none';
      loginBtn.style.display = 'flex';
      inventoryLink.style.display = 'none';
      myTicketsLink.style.display = 'none';
      document.getElementById('user-role').style.display = 'none';
    }
  });

  // Navigation Handling
  const navUl = document.querySelector('nav.navbar ul');

  navUl.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      const id = e.target.id;
      const pageMap = {
        'home-link': 'home',
        'about-link': 'about',
        'my-tickets-link-a': 'mytickets',
        'inventory-link-a': 'inventory'
      };

      if (pageMap[id]) {
        e.preventDefault();
        loadPage(pageMap[id]);
        setActiveLink(e.target);
      }
    }
  });

  function setActiveLink(activeLink) {
    const allLinks = navUl.querySelectorAll('li a');
    allLinks.forEach(l => l.classList.remove('active'));
    activeLink.classList.add('active');
  }

  function loadPage(page) {
    let fileName = '';
    let bgImage = '';

    switch (page) {
      case 'home':
        fileName = 'home.html';
        bgImage = "url('Assets/BG_Main.jpg')";
        break;
      case 'about':
        fileName = 'about.html';
        bgImage = "url('Assets/BG_About.jpg')";
        break;
      case 'mytickets':
        fileName = 'tickets-content.html';
        bgImage = "url('Assets/BG_Main.jpg')";
        break;
      case 'inventory':
        fileName = 'inventory.html';
        bgImage = "url('Assets/BG_Inventory.jpg')";
        break;
      default:
        fileName = 'home.html';
        bgImage = "url('Assets/BG_Main.jpg')";
    }

    fetch(fileName)
      .then(response => {
        if (!response.ok) throw new Error('Page not found');
        return response.text();
      })
      .then(html => {
        document.getElementById('main-content').innerHTML = html;
        document.body.style.backgroundImage = bgImage;

        // Load inventory.js and inventory.css only if inventory page
        if (page === 'inventory') {
          // Load CSS if not already
          if (!document.getElementById('inventory-css')) {
            const cssLink = document.createElement('link');
            cssLink.id = 'inventory-css';
            cssLink.rel = 'stylesheet';
            cssLink.href = 'inventory.css';
            document.head.appendChild(cssLink);
          }

          // Remove old inventory.js if present
          const oldScript = document.getElementById('inventory-js');
          if (oldScript) oldScript.remove();

          // Load JS dynamically (with cache-busting to force re-run)
          const script = document.createElement('script');
          script.id = 'inventory-js';
          script.src = `inventory.js?t=${Date.now()}`;
          script.type = 'module'; // only if you're using ES6 modules
          document.body.appendChild(script);
        }
      })
      .catch(err => {
        document.getElementById('main-content').innerHTML = '<p>Error loading page.</p>';
        console.error(err);
      });
  }
};
