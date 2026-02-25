import React from 'react';
import type { UserProfile, AppView } from './types';
import { COLORS } from './utils';

interface UserListViewProps {
  handleBack: () => void;
  listTitle: string;
  isLoadingUserList: boolean;
  userListResults: UserProfile[];
  setCurrentView: (view: AppView) => void;
}

export const UserListView: React.FC<UserListViewProps> = ({
  handleBack,
  listTitle,
  isLoadingUserList,
  userListResults,
  setCurrentView
}) => {
  return (
    <div style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <button onClick={handleBack} style={{ background: 'none', color: COLORS.PRIMARY, border: `1px solid ${COLORS.PRIMARY}`, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>
        ← Back
      </button>
      <h2 style={{ color: COLORS.PRIMARY, textAlign: 'center', marginBottom: '20px' }}>{listTitle}</h2>
      
      {isLoadingUserList ? (
        <div style={{ textAlign: 'center', color: COLORS.NEUTRAL, marginTop: '20px' }}>Loading users...</div>
      ) : userListResults.length === 0 ? (
        <div style={{ textAlign: 'center', color: COLORS.NEUTRAL, marginTop: '20px' }}>No users found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {userListResults.map(targetUser => (
            <div 
              key={targetUser.uid} 
              onClick={() => setCurrentView({ type: 'OTHER_PROFILE', targetProfile: targetUser })} 
              style={{ backgroundColor: '#F9F9F9', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', border: '1px solid #EEE' }}
            >
              {targetUser.photoUrl ? (
                <img src={targetUser.photoUrl} alt="Profile" style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#999' }}>👤</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', color: '#333' }}>{targetUser.firstName} {targetUser.lastName}</div>
                <div style={{ fontSize: '13px', color: COLORS.PRIMARY }}>@{targetUser.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};