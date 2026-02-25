import React from 'react';
import type { User } from "firebase/auth";
import type { UserProfile, AppView } from './types';
import { COLORS } from './utils';

// We define all the tools and data this view needs to receive from the Master Controller
interface AccountViewProps {
  user: User | null;
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  isEditingProfile: boolean;
  setIsEditingProfile: (val: boolean) => void;
  usernameStatus: string;
  checkUsername: (name: string) => void;
  saveProfile: () => void;
  profileMessage: string | null;
  isUploadingPhoto: boolean;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDeleteAccount: () => void;
  pullFromCloud: () => void;
  pushToCloud: (playlists: any, profile: UserProfile) => void;
  playlists: any;
  syncMessage: string | null;
  signOut: (auth: any) => void;
  auth: any;
  handleGoogle: () => void;
  handleAuth: (isLogin: boolean) => void;
  isLoginView: boolean;
  setIsLoginView: (val: boolean) => void;
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
  handlePasswordReset: () => void;
  authMessage: string | null;
  loadUserList: (title: string, uids: string[], returnPath: AppView) => void;
  currentView: AppView;
}

export const AccountView: React.FC<AccountViewProps> = (props) => {
  // Destructure the props so we don't have to type "props." every time
  const {
    user, profile, setProfile, isEditingProfile, setIsEditingProfile,
    usernameStatus, checkUsername, saveProfile, profileMessage, isUploadingPhoto,
    handlePhotoUpload, handleDeleteAccount, pullFromCloud, pushToCloud,
    playlists, syncMessage, signOut, auth, handleGoogle, handleAuth,
    isLoginView, setIsLoginView, email, setEmail, password, setPassword,
    showPassword, setShowPassword, handlePasswordReset, authMessage, loadUserList, currentView
  } = props;

  return (
    <div style={{ backgroundColor: COLORS.WHITE, padding: '30px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
      {user ? (
        // LOGGED IN STATE
        <div>
          <div style={{ borderBottom: `2px solid ${COLORS.PRIMARY}20`, paddingBottom: '20px', marginBottom: '20px' }}>
            {!isEditingProfile ? (
              // DISPLAY PROFILE
              <div style={{ textAlign: 'center' }}>
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt="Profile" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto', border: `3px solid ${COLORS.PRIMARY}`, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
                ) : (
                  <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: `3px solid ${COLORS.PRIMARY}`, fontSize: '40px', color: '#999' }}>👤</div>
                )}
                {(profile.firstName || profile.lastName) && (
                  <h2 style={{ color: '#333', marginTop: '15px', marginBottom: '5px' }}>{profile.firstName} {profile.lastName}</h2>
                )}
                <p style={{ fontWeight: 'bold', color: COLORS.PRIMARY, fontSize: '1.1rem', marginTop: (profile.firstName || profile.lastName) ? '0' : '15px', marginBottom: '15px' }}>@{profile.username}</p>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px', color: COLORS.NEUTRAL, fontSize: '14px' }}>
                  <div onClick={() => loadUserList("Followers", profile.followers || [], currentView)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                    <strong style={{ color: COLORS.PRIMARY }}>{profile.followers?.length || 0}</strong> Followers
                  </div>
                  <div onClick={() => loadUserList("Following", profile.following || [], currentView)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                    <strong style={{ color: COLORS.PRIMARY }}>{profile.following?.length || 0}</strong> Following
                  </div>
                </div>

                {profile.bio && <p style={{ color: '#555', fontSize: '14px', maxWidth: '400px', margin: '0 auto 15px auto', fontStyle: 'italic' }}>"{profile.bio}"</p>}
                {profile.location && <p style={{ color: COLORS.NEUTRAL, fontSize: '13px', marginBottom: '20px' }}>📍 {profile.location}</p>}
                
                <button onClick={() => setIsEditingProfile(true)} style={{ backgroundColor: COLORS.WHITE, color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                  Edit Account
                </button>
              </div>
            ) : (
              // EDIT PROFILE FORM
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, color: COLORS.PRIMARY }}>Edit Profile</h3>
                  {profile.username && <button onClick={() => setIsEditingProfile(false)} style={{ background: 'none', border: 'none', color: COLORS.NEUTRAL, textDecoration: 'underline', cursor: 'pointer' }}>Cancel</button>}
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <input type="file" accept="image/*" id="photo-upload" style={{ display: 'none' }} onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
                  <label htmlFor="photo-upload" style={{ display: 'inline-block', backgroundColor: COLORS.SECONDARY, color: COLORS.WHITE, padding: '10px 16px', borderRadius: '8px', cursor: isUploadingPhoto ? 'default' : 'pointer', fontSize: '14px', fontWeight: 'bold', opacity: isUploadingPhoto ? 0.7 : 1 }}>
                    {isUploadingPhoto ? 'Uploading...' : '📷 Choose or Take Photo'}
                  </label>
                </div>
                
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.NEUTRAL }}>Username (Required & Unique)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: COLORS.PRIMARY, fontWeight: 'bold' }}>@</span>
                    <input type="text" value={profile.username} onChange={e => { const val = e.target.value.replace(/[^a-zA-Z0-9.\-_]/g, ''); setProfile({...profile, username: val}); checkUsername(val); }} placeholder="Username" style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${usernameStatus === 'taken' ? COLORS.ERROR : COLORS.PRIMARY}`, outline: 'none' }} />
                  </div>
                  {usernameStatus === 'checking' && <span style={{ fontSize: '11px', color: COLORS.NEUTRAL }}>Checking availability...</span>}
                  {usernameStatus === 'available' && profile.username && <span style={{ fontSize: '11px', color: COLORS.SUCCESS }}>Username available!</span>}
                  {usernameStatus === 'taken' && <span style={{ fontSize: '11px', color: COLORS.ERROR }}>Username taken. Please choose another.</span>}
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.NEUTRAL }}>First Name</label>
                    <input type="text" value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.PRIMARY}`, boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.NEUTRAL }}>Last Name</label>
                    <input type="text" value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.PRIMARY}`, boxSizing: 'border-box' }} />
                  </div>
                </div>
                
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.NEUTRAL }}>Bio</label>
                  <textarea value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} placeholder="Tell people about your dancing..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.PRIMARY}`, boxSizing: 'border-box', minHeight: '60px', fontFamily: 'inherit' }} />
                </div>
                
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: COLORS.NEUTRAL }}>Location</label>
                  <input type="text" value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})} placeholder="e.g. Austin, TX" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${COLORS.PRIMARY}`, boxSizing: 'border-box' }} />
                </div>
                
                <button onClick={saveProfile} disabled={!profile.username || usernameStatus === 'taken' || isUploadingPhoto} style={{ backgroundColor: (!profile.username || usernameStatus === 'taken' || isUploadingPhoto) ? COLORS.NEUTRAL : COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                  Save Profile
                </button>
                
                {profileMessage && <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: profileMessage.includes('Error') || profileMessage.includes('failed') ? COLORS.ERROR : COLORS.SUCCESS }}>{profileMessage}</div>}
                
                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: `1px solid ${COLORS.ERROR}40`, textAlign: 'center' }}>
                  <button onClick={handleDeleteAccount} style={{ backgroundColor: 'transparent', color: COLORS.ERROR, border: `1px solid ${COLORS.ERROR}`, padding: '8px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Delete Account Permanently</button>
                </div>
              </div>
            )}
          </div>

          {/* CLOUD SYNC & LOGOUT */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: COLORS.NEUTRAL }}>Signed in as: {user.email}</p>
            <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#F5F5F7', borderRadius: '8px' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '15px' }}>Data Synchronization</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => pullFromCloud()} style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>⬇️ Force Download</button>
                <button onClick={() => pushToCloud(playlists, profile)} style={{ backgroundColor: COLORS.WHITE, color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>⬆️ Force Upload</button>
              </div>
              {syncMessage && <p style={{ color: syncMessage.includes('Fail') ? COLORS.ERROR : COLORS.SUCCESS, fontWeight: 'bold', marginTop: '10px', fontSize: '13px' }}>{syncMessage}</p>}
            </div>
            <button onClick={() => signOut(auth)} style={{ backgroundColor: 'transparent', color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Sign Out</button>
          </div>
        </div>
      ) : (
        // LOGGED OUT STATE (LOGIN / SIGNUP FORM)
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <button onClick={handleGoogle} style={{ backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Sign in with Google</button>
          
          <div style={{ borderTop: `1px solid ${COLORS.PRIMARY}40`, margin: '10px 0' }}></div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleAuth(isLoginView); }} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}` }} required />
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}`, width: '100%', boxSizing: 'border-box' }} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>{showPassword ? '👁️' : '🔒'}</button>
            </div>
            <button type="submit" style={{ backgroundColor: 'transparent', color: COLORS.PRIMARY, border: `2px solid ${COLORS.PRIMARY}`, padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{isLoginView ? 'Login' : 'Sign Up'}</button>
          </form>
          
          {isLoginView && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={handlePasswordReset} style={{ background: 'none', border: 'none', color: COLORS.NEUTRAL, fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>Forgot Password?</button>
            </div>
          )}
          
          <div onClick={() => setIsLoginView(!isLoginView)} style={{ textAlign: 'center', fontSize: '12px', cursor: 'pointer', color: COLORS.SECONDARY }}>{isLoginView ? 'Need an account? Sign up' : 'Have an account? Log in'}</div>
          {authMessage && <div style={{ color: COLORS.ERROR, textAlign: 'center', fontSize: '13px', marginTop: '10px' }}>{authMessage}</div>}
        </div>
      )}
    </div>
  );
};