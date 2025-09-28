// profile.js
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    firebase.firestore().collection("users").doc(user.uid).get()
      .then(doc => {
        if (doc.exists) {
          const data = doc.data();

          // ✅ Display full name at the top
          const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
          document.getElementById("profile-name").textContent =
            fullName || user.email.split("@")[0];

          // ✅ Keep showing email under "Email"
          document.getElementById("profile-email").textContent = user.email;

          // ✅ Role
          document.getElementById("profile-role").textContent = data.role || "User";

          // ✅ Created date
          if (data.createdAt) {
            document.getElementById("profile-created").textContent =
              data.createdAt.toDate().toLocaleString();
          } else {
            document.getElementById("profile-created").textContent = "N/A";
          }
        } else {
          document.getElementById("profile-name").textContent = user.email.split("@")[0];
          document.getElementById("profile-email").textContent = user.email;
          document.getElementById("profile-role").textContent = "N/A";
          document.getElementById("profile-created").textContent = "N/A";
        }
      })
      .catch(err => {
        console.error("Error loading profile:", err);
      });

    // Sync avatar from navbar
    const avatarImg = document.querySelector("#user-avatar img");
    if (avatarImg) {
      document.getElementById("profile-avatar").src = avatarImg.src;
    }
  } else {
    // If not logged in → redirect to login
    document.getElementById("main-content").innerHTML =
      "<p style='color:red; text-align:center;'>Please log in to view your profile.</p>";
  }
});
