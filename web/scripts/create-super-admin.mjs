/**
 * create-super-admin.mjs
 * Creates the SuperAdmin user document in Firestore via REST API.
 * 
 * Usage:
 *   node scripts/create-super-admin.mjs <FIREBASE_UID> <EMAIL>
 *
 * Example:
 *   node scripts/create-super-admin.mjs abc123xyz falconbladex1@gmail.com
 *
 * Find your UID at:
 *   https://console.firebase.google.com/project/mechanic-app-7d459/authentication/users
 */

const PROJECT_ID = "mechanic-app-7d459";
const API_KEY = "AIzaSyDlMdDK87zecrJgVXufAvNkJ3ZcasXrloE";

const uid = process.argv[2];
const email = process.argv[3];

if (!uid || !email) {
  console.error("\n❌ Usage: node scripts/create-super-admin.mjs <UID> <EMAIL>\n");
  console.error("   Find your UID at:");
  console.error(`   https://console.firebase.google.com/project/${PROJECT_ID}/authentication/users\n`);
  process.exit(1);
}

const now = new Date().toISOString();

// Firestore REST API document structure
const document = {
  fields: {
    email:      { stringValue: email },
    name:       { stringValue: "Super Admin" },
    roles:      { arrayValue: { values: [{ stringValue: "SUPER_ADMIN" }] } },
    workshopId: { stringValue: "" },
    createdAt:  { stringValue: now },
  }
};

const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${API_KEY}`;

console.log(`\n🔧 Creating SuperAdmin document for UID: ${uid}`);
console.log(`   Email: ${email}`);
console.log(`   URL: ${url}\n`);

try {
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(document),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("❌ Firestore API error:", JSON.stringify(error, null, 2));
    process.exit(1);
  }

  const result = await response.json();
  console.log("✅ SuperAdmin document created successfully!");
  console.log(`   Document path: ${result.name}`);
  console.log("\n🚀 You can now log in at the app with your credentials.\n");
} catch (err) {
  console.error("❌ Network error:", err.message);
  process.exit(1);
}
