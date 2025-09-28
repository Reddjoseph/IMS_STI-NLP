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
  const profileBtn = document.getElementById('profile-btn');

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');

  const avatar = document.getElementById('user-avatar');
  const avatarDropdown = document.getElementById('avatar-dropdown');
  const inventoryLink = document.getElementById('inventory-link');
  const myTicketsLink = document.getElementById('my-tickets-link');
  const loginGroup = document.querySelector('.login-avatar-group');

  const roleSelect = document.getElementById('role-select');
  const modalTitle = loginModal.querySelector('h2');

  // 🔔 Notification Elements
  const notifWrapper = document.getElementById('notification-wrapper');
  const notifBtn = document.getElementById('notification-btn');
  const notifCount = document.getElementById('notification-count');
  const notifDropdown = document.getElementById('notification-dropdown');
  const notifList = document.getElementById('notification-list');

  // 🔔 Keep track of listeners
  let ticketUnsub = null;
  let notifUnsub = null;

  // ========== Firestore-based Dismissed Helpers ==========
  async function getDismissed(uid) {
    if (!uid) return [];
    try {
      const doc = await db.collection("users").doc(uid).get();
      return doc.exists && Array.isArray(doc.data().dismissedNotifs)
        ? doc.data().dismissedNotifs
        : [];
    } catch (e) {
      console.error("Error fetching dismissed notifications:", e);
      return [];
    }
  }

  async function addDismissed(uid, notifId) {
    if (!uid || !notifId) return;
    try {
      await db.collection("users").doc(uid).set(
        { dismissedNotifs: firebase.firestore.FieldValue.arrayUnion(notifId) },
        { merge: true }
      );
    } catch (e) {
      console.error("Error adding dismissed notification:", e);
    }
  }

function showNotification(count) {
  if (!notifCount) return;

  if (count > 0) {
    // Animate change
    notifCount.classList.remove("count-animate");
    void notifCount.offsetWidth; // restart animation
    notifCount.classList.add("count-animate");

    notifCount.textContent = count;
    notifCount.style.display = "inline-flex";
  } else {
    notifCount.style.display = "none";
  }
}

  // ✅ Render notifications with fade-out dismissal
  async function renderNotifications(docs, isAdmin = false) {
    notifList.innerHTML = "";
    const uid = auth.currentUser ? auth.currentUser.uid : null;
    if (!uid) return;

    const dismissed = await getDismissed(uid);
    let activeDocs = docs.filter(doc => !dismissed.includes(doc.id));

    if (activeDocs.length === 0) {
      const emptyEl = notifDropdown.querySelector(".notif-empty");
      if (emptyEl) emptyEl.style.display = "block";
    } else {
      const emptyEl = notifDropdown.querySelector(".notif-empty");
      if (emptyEl) emptyEl.style.display = "none";

      activeDocs.forEach(doc => {
        const data = doc.data();
        const li = document.createElement("li");

        const rawDate = data.createdAt?.toDate() || new Date();
        const dateStr = rawDate.toLocaleString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true
        });

        const titleSpan = document.createElement("span");
        titleSpan.classList.add("notif-text");
        titleSpan.textContent = isAdmin
          ? "New ticket issued"
          : (data.message || "Notification");

        if (isAdmin) {
          const descDiv = document.createElement("div");
          descDiv.classList.add("notif-desc");

          const userSpan = document.createElement("span");
          userSpan.style.fontWeight = "600";
          userSpan.style.color = "#000";
          userSpan.textContent = data.issuedByName || data.issuedBy || "Unknown user";

          const middleSpan = document.createElement("span");
          middleSpan.style.color = "#444";
          middleSpan.textContent = " issued a ticket regarding ";

          const itemSpan = document.createElement("span");
          itemSpan.style.fontWeight = "600";
          itemSpan.style.color = "#000";
          itemSpan.textContent = data.itemName || "an item";

          descDiv.appendChild(userSpan);
          descDiv.appendChild(middleSpan);
          descDiv.appendChild(itemSpan);

          li.appendChild(titleSpan);
          li.appendChild(descDiv);
        } else {
          li.appendChild(titleSpan);
          if (data.message && !isAdmin) {
            const msgDiv = document.createElement("div");
            msgDiv.classList.add("notif-desc");
            msgDiv.textContent = data.message;
            li.appendChild(msgDiv);
          }
        }

        const timeSpan = document.createElement("span");
        timeSpan.classList.add("notif-time");
        timeSpan.textContent = dateStr;

        const dismissBtn = document.createElement("span");
        dismissBtn.textContent = "×";
        dismissBtn.classList.add("dismiss-btn");
        dismissBtn.addEventListener("click", async (e) => {
          e.stopPropagation();

          // 🔥 Add fade-out effect
          li.classList.add("fade-out");

          // Wait for transition to finish, then remove
          li.addEventListener("transitionend", async () => {
            li.remove();

            await addDismissed(uid, doc.id);
            activeDocs = activeDocs.filter(d => d.id !== doc.id);
            showNotification(activeDocs.length);

            if (activeDocs.length === 0) {
              const emptyEl = notifDropdown.querySelector(".notif-empty");
              if (emptyEl) emptyEl.style.display = "block";
            }
          }, { once: true });
        });

        li.addEventListener("click", () => {
          notifDropdown.classList.remove("visible");
          loadPage("mytickets");
          setActiveLink(document.getElementById("my-tickets-link-a"));
        });

        li.appendChild(timeSpan);
        li.appendChild(dismissBtn);
        notifList.appendChild(li);
      });
    }

    showNotification(activeDocs.length);
  }

// ========== Login/Register Transition ==========
function animateTransition(showRegister) {
  loginModal.classList.add('fade-transition');
  setTimeout(() => {
    if (showRegister) {
      modalTitle.textContent = 'Create Account';
      registerBtn.style.display = 'block';
      loginActionBtn.style.display = 'none';
      toggleRegister.style.display = 'none';
      toggleLogin.style.display = 'block';
      roleSelect.style.display = 'block';

      // 🔹 Show name fields
      document.getElementById('first-name').style.display = 'block';
      document.getElementById('last-name').style.display = 'block';
    } else {
      modalTitle.textContent = 'Login';
      registerBtn.style.display = 'none';
      loginActionBtn.style.display = 'block';
      toggleRegister.style.display = 'block';
      toggleLogin.style.display = 'none';
      roleSelect.style.display = 'none';

      // 🔹 Hide name fields
      document.getElementById('first-name').style.display = 'none';
      document.getElementById('last-name').style.display = 'none';
    }
    loginModal.classList.remove('fade-transition');
  }, 200);
}


  // Show modal
  loginBtn.addEventListener('click', () => loginModal.style.display = 'block');
  closeLogin.addEventListener('click', () => loginModal.style.display = 'none');

  // Switch to Register
  toggleRegister.addEventListener('click', () => animateTransition(true));
  toggleLogin.addEventListener('click', () => animateTransition(false));


  // Register with auto-login
  registerBtn.addEventListener('click', () => {
    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const role = roleSelect.value;

    if (!firstName || !lastName) {
      loginError.textContent = "Please enter your first and last name.";
      return;
    }

    auth.createUserWithEmailAndPassword(email, password)
      .then(userCredential => {
        const user = userCredential.user;
        return db.collection('users').doc(user.uid).set({
          firstName: firstName,
          lastName: lastName,
          email: email,
          role: role,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          dismissedNotifs: [] // 🔥 initialize field
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


  // Login
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

  // Logout
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await auth.signOut();
      avatarDropdown.classList.remove('visible');

      avatar.style.display = 'none';
      loginBtn.style.display = 'flex';
      inventoryLink.style.display = 'none';
      myTicketsLink.style.display = 'none';
      document.getElementById('user-role').style.display = 'none';
      if (notifWrapper) notifWrapper.style.display = 'none';

      if (ticketUnsub) { ticketUnsub(); ticketUnsub = null; }
      if (notifUnsub) { notifUnsub(); notifUnsub = null; }

      notifList.innerHTML = "";
      showNotification(0);

      if (notifDropdown.querySelector(".notif-empty")) {
        notifDropdown.querySelector(".notif-empty").style.display = "block";
      }

      loadPage('home');
      setActiveLink(document.getElementById('home-link'));

      alert('You have been logged out.');
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Error logging out. Try again.');
    }
  });

  // Profile button
  if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loadPage('profile');
      setActiveLink(document.getElementById('home-link'));
      avatarDropdown.classList.remove('visible');
    });
  }

  avatar.addEventListener('click', () => {
    avatarDropdown.classList.toggle('visible');
  });

  document.addEventListener('click', (event) => {
    const isClickInside = avatar.contains(event.target) || avatarDropdown.contains(event.target);
    if (!isClickInside) {
      avatarDropdown.classList.remove('visible');
    }
  });

  // ========== Auth state change ==========
  auth.onAuthStateChanged(user => {
    if (ticketUnsub) { ticketUnsub(); ticketUnsub = null; }
    if (notifUnsub) { notifUnsub(); notifUnsub = null; }

    if (user) {
      avatar.style.display = 'block';
      loginBtn.style.display = 'none';

      db.collection('users').doc(user.uid).get()
        .then(doc => {
          if (doc.exists) {
            const role = doc.data().role || 'User';
            const userRoleDiv = document.getElementById('user-role');
            userRoleDiv.textContent = user.email;
            userRoleDiv.style.display = 'block';

            if (role === 'Admin' || role === 'Maintenance') {
              inventoryLink.style.display = 'block';
              myTicketsLink.style.display = 'none';
              if (notifWrapper) notifWrapper.style.display = 'flex';

              ticketUnsub = db.collection('tickets')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .onSnapshot(snapshot => {
                  renderNotifications(snapshot.docs, true);
                });

            } else if (role === 'User') {
              inventoryLink.style.display = 'none';
              myTicketsLink.style.display = 'block';
              if (notifWrapper) notifWrapper.style.display = 'flex';

              notifUnsub = db.collection('notifications')
                .where("createdByRole", "==", "Admin")
                .orderBy("createdAt", "desc")
                .limit(20)
                .onSnapshot(snapshot => {
                  renderNotifications(snapshot.docs, false);

                  if (snapshot.empty) {
                    const emptyEl = notifDropdown.querySelector(".notif-empty");
                    if (emptyEl) emptyEl.style.display = "block";
                    notifList.innerHTML = "";
                    showNotification(0);
                  }
                });

            } else {
              inventoryLink.style.display = 'none';
              myTicketsLink.style.display = 'none';
              if (notifWrapper) notifWrapper.style.display = 'none';
            }
          } else {
            inventoryLink.style.display = 'none';
            myTicketsLink.style.display = 'none';
            if (notifWrapper) notifWrapper.style.display = 'none';
          }
        })
        .catch(error => {
          console.error("Error fetching user role:", error);
          inventoryLink.style.display = 'none';
          myTicketsLink.style.display = 'none';
          if (notifWrapper) notifWrapper.style.display = 'none';
        });

    } else {
      avatar.style.display = 'none';
      loginBtn.style.display = 'flex';
      inventoryLink.style.display = 'none';
      myTicketsLink.style.display = 'none';
      document.getElementById('user-role').style.display = 'none';
      if (notifWrapper) notifWrapper.style.display = 'none';

      notifList.innerHTML = "";
      showNotification(0);

      if (notifDropdown.querySelector(".notif-empty")) {
        notifDropdown.querySelector(".notif-empty").style.display = "block";
      }
    }
  });

  // 🔔 Dropdown toggle
  if (notifBtn) {
    notifBtn.addEventListener('click', () => {
      notifDropdown.classList.toggle('visible');
    });

    document.addEventListener('click', (event) => {
      if (notifWrapper && !notifWrapper.contains(event.target)) {
        notifDropdown.classList.remove('visible');
      }
    });
  }

  // ========== Nav ==========
  const navUl = document.querySelector('nav.navbar ul');

  navUl.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      const id = e.target.id;
      const pageMap = {
        'home-link': 'home',
        'my-tickets-link-a': 'mytickets',
        'inventory-link-a': 'inventory',
        'profile-link': 'profile'
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

  // ========== Dynamic Page Loader ==========
  function loadPage(page) {
    let fileName = '';
    let bgImage = '';

    switch (page) {
      case 'home':
        fileName = 'home.html';
        bgImage = "url('Assets/BG_Main.jpg')";
        break;
      case 'mytickets':
        fileName = 'tickets-content.html';
        bgImage = "url('Assets/BG_Inventory.jpg')";
        break;
      case 'inventory':
        fileName = 'inventory.html';
        bgImage = "url('Assets/BG_Inventory.jpg')";
        break;
      case 'profile':
        fileName = 'profile.html';
        bgImage = "url('Assets/BG_Main.jpg')";
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

        function loadCSS(id, href) {
          if (!document.getElementById(id)) {
            const cssLink = document.createElement('link');
            cssLink.id = id;
            cssLink.rel = 'stylesheet';
            cssLink.href = href;
            document.head.appendChild(cssLink);
          }
        }

        function loadJS(id, src) {
          const oldScript = document.getElementById(id);
          if (oldScript) oldScript.remove();

          const script = document.createElement('script');
          script.id = id;
          script.src = `${src}?t=${Date.now()}`;
          script.type = 'module';
          script.defer = true;
          document.body.appendChild(script);
        }

        if (page === 'inventory') {
          loadCSS('inventory-css', 'inventory.css');
          loadJS('inventory-js', 'inventory.js');
        }

        if (page === 'mytickets') {
          loadCSS('tickets-css', 'tickets-content.css');
          loadJS('tickets-js', 'tickets-content.js');
        }

        if (page === 'profile') {
          loadCSS('profile-css', 'profile.css');
          loadJS('profile-js', 'profile.js');
        }

      })
      .catch(err => {
        document.getElementById('main-content').innerHTML = '<p>Error loading page.</p>';
        console.error(err);
      });
  }
};
