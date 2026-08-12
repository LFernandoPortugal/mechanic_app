import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  // storageBucket removed — images are stored as base64 in Firestore
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
});

const firebaseRuntime = globalThis as typeof globalThis & {
  __mechanicFirebaseEmulatorsConnected?: boolean;
};
const useFirebaseEmulators = typeof window !== "undefined"
  && process.env.NODE_ENV !== "production"
  && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

if (useFirebaseEmulators && !firebaseRuntime.__mechanicFirebaseEmulatorsConnected) {
  const authHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
  const firestoreHost = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  const separatorIndex = firestoreHost.lastIndexOf(":");
  const firestoreHostname = firestoreHost.slice(0, separatorIndex);
  const firestorePort = Number.parseInt(firestoreHost.slice(separatorIndex + 1), 10);

  if (!firestoreHostname || !Number.isInteger(firestorePort)) {
    throw new Error("Invalid NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST value.");
  }

  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  connectFirestoreEmulator(db, firestoreHostname, firestorePort);
  firebaseRuntime.__mechanicFirebaseEmulatorsConnected = true;
}

export { app, auth, db };
