import { useState } from 'react';
import { collection, query, where, getDocs, getDoc, doc, setDoc } from "firebase/firestore";
import { db } from './firebaseSetup';
import type { UserProfile, AppView } from './types';
import type { User } from 'firebase/auth';

export function useCommunity(
  user: User | null, 
  profile: UserProfile, 
  setProfile: (p: UserProfile) => void,
  playlists: any,
  pushToCloud: (playlists: any, profile: UserProfile, user: User | null) => void,
  currentView: AppView,
  setCurrentView: (v: AppView) => void
) {
  const [communityQuery, setCommunityQuery] = useState('');
  const [communityResults, setCommunityResults] = useState<UserProfile[]>([]);
  const [isSearchingCommunity, setIsSearchingCommunity] = useState(false);
  const [userListResults, setUserListResults] = useState<UserProfile[]>([]);
  const [isLoadingUserList, setIsLoadingUserList] = useState(false);

  const handleUserSearch = async (queryStr: string) => {
    setCommunityQuery(queryStr);
    if (!queryStr.trim()) { setCommunityResults([]); return; }
    
    setIsSearchingCommunity(true);
    try {
      const lowerQ = queryStr.toLowerCase().trim();
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("profile.username", ">=", lowerQ), where("profile.username", "<=", lowerQ + '\uf8ff'));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: UserProfile[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.profile && docSnap.id !== user?.uid) {
          fetchedUsers.push({ ...data.profile, uid: docSnap.id });
        }
      });
      setCommunityResults(fetchedUsers);
    } catch (error) { console.error("Error searching community:", error); }
    setIsSearchingCommunity(false);
  };

  const toggleFollow = async (targetUid: string) => {
    if (!user || !targetUid) return;
    const isCurrentlyFollowing = profile.following.includes(targetUid);
    
    let updatedFollowing = [...profile.following];
    if (isCurrentlyFollowing) {
      updatedFollowing = updatedFollowing.filter(id => id !== targetUid);
    } else {
      updatedFollowing.push(targetUid);
    }
    const updatedProfile = { ...profile, following: updatedFollowing };
    setProfile(updatedProfile); 
    await pushToCloud(playlists, updatedProfile, user); 
    
    try {
      const targetDocRef = doc(db, "users", targetUid);
      const targetSnap = await getDoc(targetDocRef);
      if (targetSnap.exists()) {
        const targetData = targetSnap.data();
        const targetProfile = targetData.profile || {};
        let targetFollowers = targetProfile.followers || [];
        
        if (isCurrentlyFollowing) {
          targetFollowers = targetFollowers.filter((id: string) => id !== user.uid);
        } else {
          if (!targetFollowers.includes(user.uid)) targetFollowers.push(user.uid);
        }
        await setDoc(targetDocRef, { profile: { ...targetProfile, followers: targetFollowers } }, { merge: true });
        
        if (currentView.type === 'OTHER_PROFILE' && currentView.targetProfile.uid === targetUid) {
          setCurrentView({ type: 'OTHER_PROFILE', targetProfile: { ...targetProfile, followers: targetFollowers, uid: targetUid }});
        }
      }
    } catch (error) { console.error("Error updating target user's followers list", error); }
  };

  const loadUserList = async (title: string, uids: string[], returnPath: AppView) => {
    setCurrentView({ type: 'USER_LIST', listTitle: title, uids, returnPath });
    setIsLoadingUserList(true);
    setUserListResults([]);
    
    if (!uids || uids.length === 0) { setIsLoadingUserList(false); return; }

    try {
      const fetchedUsers: UserProfile[] = [];
      const promises = uids.map(id => getDoc(doc(db, "users", id)));
      const snaps = await Promise.all(promises);
      
      snaps.forEach(snap => {
        if (snap.exists() && snap.data().profile) {
          fetchedUsers.push({ ...snap.data().profile, uid: snap.id });
        }
      });
      setUserListResults(fetchedUsers);
    } catch (e) { console.error("Error loading user list:", e); }
    setIsLoadingUserList(false);
  };

  return {
    communityQuery, setCommunityQuery, communityResults, setCommunityResults,
    isSearchingCommunity, userListResults, setUserListResults, isLoadingUserList,
    handleUserSearch, toggleFollow, loadUserList
  };
}