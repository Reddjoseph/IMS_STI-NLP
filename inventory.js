console.log("✅ inventory.js loaded");

// Create and insert a message into the page
const root = document.getElementById("inventory-root") || document.getElementById("main-content");

// Optional: remove previous message if it exists
const existingMsg = document.getElementById("inventory-js-msg");
if (existingMsg) {
  existingMsg.remove();
}

if (root) {
  const msg = document.createElement("div");
  msg.id = "inventory-js-msg"; // Set an ID to track the message
  msg.textContent = "🔧 Inventory.js is connected and running!";
  msg.style.fontSize = "24px";
  msg.style.color = "yellow";
  msg.style.padding = "20px";
  msg.style.background = "rgba(0, 0, 0, 0.5)";
  msg.style.border = "2px solid yellow";
  msg.style.borderRadius = "8px";
  msg.style.marginTop = "20px";

  root.appendChild(msg);
} else {
  console.warn("❌ inventory-root or main-content not found.");
}
