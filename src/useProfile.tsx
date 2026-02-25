import { useState } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { deleteUser } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { db, storage } from './firebaseSetup';
import type { UserProfile } from './types';
import { STORAGE_KEYS, normalizeDanceData } from './utils';

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<UserProfile>({ username: '', firstName: '', lastName: '', bio: '', location: '', photoUrl: '', following: [], followers: [] });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const pushToCloud = async (playlistsToSave: any, profileToSave: UserProfile, currentUser: User | null = user) => {
    if (!currentUser) return;
    setSyncMessage("Saving to cloud...");
    try {
      await setDoc(doc(db, "users", currentUser.uid), { playlists: playlistsToSave, profile: profileToSave }, { merge: true });
      setSyncMessage("Successfully saved to cloud!");
    } catch (error: any) {
      console.error(error); setSyncMessage(`Upload Failed: ${error.message}`);
    }
    setTimeout(() => setSyncMessage(null), 3000);
  };

  // We return the playlists here so the MasterController can pass them to usePlaylists
  const pullFromCloud = async (currentUser: User | null = user) => {
    if (!currentUser) return null;
    setSyncMessage("Loading from cloud...");
    let fetchedPlaylists = null;
    try {
      const docRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.playlists) {
            const cleaned: any = {};
            Object.keys(data.playlists).forEach(key => { cleaned[key] = (data.playlists[key] || []).map((d: any) => normalizeDanceData(d)); });
            fetchedPlaylists = cleaned;
            localStorage.setItem(STORAGE_KEYS.PERMANENT, JSON.stringify(cleaned));
        }
        if (data.profile) {
            setProfile({ ...data.profile, following: data.profile.following || [], followers: data.profile.followers || [] });
            if (data.profile.username) setIsEditingProfile(false);
        } else {
            setIsEditingProfile(true); 
        }
        setSyncMessage("Successfully downloaded data!");
      } else {
        setSyncMessage("No cloud data found. Saving local data to cloud.");
        setIsEditingProfile(true);
      }
    } catch (error: any) {
      console.error(error); setSyncMessage(`Download Failed: ${error.message}`);
    }
    setTimeout(() => setSyncMessage(null), 3000);
    return fetchedPlaylists;
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingPhoto(true);
    setProfileMessage("Uploading photo...");

    try {
      const fileRef = ref(storage, `profile_pictures/${user.uid}`);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);

      setProfile({ ...profile, photoUrl: downloadUrl });
      setProfileMessage("Photo uploaded! Click 'Save Profile' to keep changes.");
    } catch (error: any) {
      console.error("Upload error:", error);
      setProfileMessage(`Upload failed: ${error.message}`);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const checkUsername = async (requestedUsername: string) => {
    if (!requestedUsername.trim()) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    try {
        const usernameLower = requestedUsername.toLowerCase().trim();
        const docRef = doc(db, "usernames", usernameLower);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().uid !== user?.uid) {
            setUsernameStatus('taken');
        } else {
            setUsernameStatus('available');
        }
    } catch (e) { console.error("Error checking username", e); setUsernameStatus('idle'); }
  };

  const saveProfile = async (currentPlaylists: any) => {
    if (!user) return;
    if (usernameStatus === 'taken') {
        setProfileMessage("Cannot save: Username is already taken.");
        return;
    }
    setProfileMessage("Saving profile...");
    try {
        const usernameLower = profile.username.toLowerCase().trim();
        if (usernameLower) {
            await setDoc(doc(db, "usernames", usernameLower), { uid: user.uid });
        }
        await pushToCloud(currentPlaylists, { ...profile, username: usernameLower }, user);
        setProfileMessage("Profile updated successfully!");
        setIsEditingProfile(false);
    } catch (e: any) {
        setProfileMessage(`Error saving profile: ${e.message}`);
    }
    setTimeout(() => setProfileMessage(null), 3000);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirmDelete = prompt("Type 'DELETE' to permanently delete your account. This cannot be undone.");
    if (confirmDelete !== 'DELETE') return;

    try {
        await deleteDoc(doc(db, "users", user.uid));
        if (profile.username) {
            await deleteDoc(doc(db, "usernames", profile.username));
        }
        await deleteUser(user);
        alert("Account deleted.");
    } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') {
            alert("Security Check: You must log out and log back in to delete your account.");
        } else {
            alert("Error deleting account: " + error.message);
        }
    }
  };

  return {
    profile, setProfile, isEditingProfile, setIsEditingProfile, isUploadingPhoto,
    profileMessage, usernameStatus, syncMessage, pullFromCloud, pushToCloud,
    handlePhotoUpload, checkUsername, saveProfile, handleDeleteAccount
  };
}