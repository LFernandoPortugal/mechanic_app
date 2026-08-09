"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getUserProfile, getWorkshopSettings } from "@/lib/db";
import { UserProfile, UserRole, WorkshopSettings } from "@/types";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  workshopSettings: WorkshopSettings | null;
  loading: boolean;
  trialExpired: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  workshopSettings: null,
  loading: true,
  trialExpired: false,
  signOut: async () => {},
  hasRole: () => false,
  hasAnyRole: () => false,
  refreshProfile: async () => {},
  refreshSettings: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [workshopSettings, setWorkshopSettings] = useState<WorkshopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Listen in real-time. If profile doc is deleted, evict session immediately.
        const userRef = doc(db, "users", firebaseUser.uid);
        unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
          if (!docSnap.exists()) {
            console.log("User profile deleted. Evicting session immediately...");
            await firebaseSignOut(auth);
            setUser(null);
            setUserProfile(null);
            setWorkshopSettings(null);
            setTrialExpired(false);
            setLoading(false);
            return;
          }
          const profile = docSnap.data() as UserProfile;
          setUserProfile(profile);

          const isSuperAdmin = profile?.roles?.includes('SUPER_ADMIN');
          const workshopId = typeof profile?.workshopId === "string"
            ? profile.workshopId.trim()
            : "";

          if (!workshopId) {
            console.log("User profile has no workshop. Evicting session immediately...");
            await firebaseSignOut(auth);
            setUser(null);
            setUserProfile(null);
            setWorkshopSettings(null);
            setTrialExpired(false);
            setLoading(false);
            return;
          }

          const settings = await getWorkshopSettings(workshopId);

          // If the workshop was deleted in SuperAdmin (and user is not SuperAdmin), evict session
          if (!settings && !isSuperAdmin) {
            console.log("Workshop deleted. Evicting user session...");
            await firebaseSignOut(auth);
            setUser(null);
            setUserProfile(null);
            setWorkshopSettings(null);
            setTrialExpired(false);
            setLoading(false);
            return;
          }

          setWorkshopSettings(settings);

          if (settings && settings.expiresAt && !isSuperAdmin) {
            const expirationDate = new Date(settings.expiresAt);
            if (new Date() > expirationDate) {
              setTrialExpired(true);
              setLoading(false);
              return;
            }
          }
          setTrialExpired(false);
          setLoading(false);
        }, async (err) => {
          console.error("Error listening to user profile:", err);
          if (err.code === "permission-denied") {
            await firebaseSignOut(auth);
            setUser(null);
            setUserProfile(null);
            setWorkshopSettings(null);
          }
          setLoading(false);
        });
      } else {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setUserProfile(null);
        setWorkshopSettings(null);
        setTrialExpired(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserProfile(null);
    setWorkshopSettings(null);
    setTrialExpired(false);
  };

  const hasRole = (role: UserRole): boolean => {
    if (!userProfile) return false;
    return userProfile.roles.includes('SUPER_ADMIN') || userProfile.roles.includes(role);
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!userProfile) return false;
    return userProfile.roles.includes('SUPER_ADMIN') || roles.some((role) => userProfile.roles.includes(role));
  };

  const refreshProfile = async () => {
    if (user) {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
      
      const isSuperAdmin = profile?.roles.includes('SUPER_ADMIN');
      if (workshopSettings && workshopSettings.expiresAt && !isSuperAdmin) {
        if (new Date() > new Date(workshopSettings.expiresAt)) {
          setTrialExpired(true);
          return;
        }
      }
      setTrialExpired(false);
    }
  };

  const refreshSettings = async () => {
    const wId = userProfile?.workshopId;
    if (!wId) {
      setWorkshopSettings(null);
      setTrialExpired(false);
      return;
    }
    const settings = await getWorkshopSettings(wId);
    setWorkshopSettings(settings);
    
    const isSuperAdmin = userProfile?.roles.includes('SUPER_ADMIN');
    if (settings && settings.expiresAt && !isSuperAdmin) {
      if (new Date() > new Date(settings.expiresAt)) {
        setTrialExpired(true);
        return;
      }
    }
    setTrialExpired(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      workshopSettings, 
      loading, 
      trialExpired,
      signOut, 
      hasRole, 
      hasAnyRole, 
      refreshProfile, 
      refreshSettings 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
