const PROJECT_ID = 'mechanic-app-7d459';
const API_KEY = 'AIzaSyDlMdDK87zecrJgVXufAvNkJ3ZcasXrloE';
const uid = 'Hntvk7Nyb2d7V7MRIhopT1MjaQ62';
const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}?key=${API_KEY}`;

const docData = {
  fields: {
    uid: { stringValue: uid },
    email: { stringValue: 'falconbladex1@gmail.com' },
    displayName: { stringValue: 'Super Admin' },
    roles: { arrayValue: { values: [{ stringValue: 'SUPER_ADMIN' }] } },
    workshopId: { stringValue: 'master-control' },
    createdAt: { timestampValue: new Date().toISOString() },
    updatedAt: { timestampValue: new Date().toISOString() }
  }
};

async function fixSuperAdmin() {
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docData)
    });
    const result = await response.json();
    console.log('✅ SuperAdmin document fixed:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Error fixing document:', err);
  }
}

fixSuperAdmin();
