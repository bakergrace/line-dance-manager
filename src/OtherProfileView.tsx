import React from 'react';
import type { UserProfile, AppView } from './types';
import { COLORS } from './utils';

interface OtherProfileViewProps {
  handleBack: () => void;
  targetProfile: UserProfile;
  loadUserList: (title: string, uids: string[], returnPath: AppView) => void;
  currentView: AppView;
  currentUserProfile: UserProfile;
  toggleFollow: (targetUid: string) => void;
}

export const OtherProfileView: React.FC<OtherProfileViewProps> = ({
  handleBack,
  targetProfile,
  loadUserList,
  currentView,
  currentUserProfile,
  toggleFollow
}) => {
  return (
    <div style={{ backgroundColor: COLORS.WHITE, padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <button onClick={handleBack} style={{ background: 'none', color: COLORS.PRIMARY, border: `1px solid ${COLORS.PRIMARY}`, padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>← Back</button>
      
      <div style={{ textAlign: 'center' }}>
        {targetProfile.photoUrl ? (
          <img src={targetProfile.photoUrl} alt="Profile" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto', border: `3px solid ${COLORS.PRIMARY}`, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
        ) : (
          <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: `3px solid ${COLORS.PRIMARY}`, fontSize: '40px', color: '#999' }}>👤</div>
        )}
        
        {(targetProfile.firstName || targetProfile.lastName) && (
          <h2 style={{ color: '#333', marginTop: '15px', marginBottom: '5px' }}>{targetProfile.firstName} {targetProfile.lastName}</h2>
        )}
        <p style={{ fontWeight: 'bold', color: COLORS.PRIMARY, fontSize: '1.1rem', marginTop: (targetProfile.firstName || targetProfile.lastName) ? '0' : '15px', marginBottom: '15px' }}>@{targetProfile.username}</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px', color: COLORS.NEUTRAL, fontSize: '14px' }}>
          <div onClick={() => loadUserList(`${targetProfile.firstName || 'User'}'s Followers`, targetProfile.followers || [], currentView)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
            <strong style={{ color: COLORS.PRIMARY }}>{targetProfile.followers?.length || 0}</strong> Followers
          </div>
          <div onClick={() => loadUserList(`Following`, targetProfile.following || [], currentView)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
            <strong style={{ color: COLORS.PRIMARY }}>{targetProfile.following?.length || 0}</strong> Following
          </div>
        </div>

        {targetProfile.bio && (
          <p style={{ color: '#555', fontSize: '14px', maxWidth: '400px', margin: '0 auto 15px auto', fontStyle: 'italic' }}>"{targetProfile.bio}"</p>
        )}
        
        {targetProfile.location && (
          <p style={{ color: COLORS.NEUTRAL, fontSize: '13px', marginBottom: '20px' }}>📍 {targetProfile.location}</p>
        )}
        
        {targetProfile.uid && (
          <button 
            onClick={() => toggleFollow(targetProfile.uid!)} 
            style={{ 
              backgroundColor: currentUserProfile.following.includes(targetProfile.uid) ? COLORS.WHITE : COLORS.PRIMARY, 
              color: currentUserProfile.following.includes(targetProfile.uid) ? COLORS.PRIMARY : COLORS.WHITE, 
              border: `2px solid ${COLORS.PRIMARY}`, 
              padding: '10px 30px', 
              borderRadius: '20px', 
              fontWeight: 'bold', 
              cursor: 'pointer', 
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
          >
            {currentUserProfile.following.includes(targetProfile.uid) ? 'Following' : 'Follow'}
          </button>
        )}
      </div>
    </div>
  );
};