import React from 'react';
import type { UserProfile, AppView } from './types';
import { COLORS } from './utils';

interface CommunityViewProps {
  communityQuery: string;
  handleUserSearch: (queryStr: string) => void;
  isSearchingCommunity: boolean;
  communityResults: UserProfile[];
  setCurrentView: (view: AppView) => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({
  communityQuery,
  handleUserSearch,
  isSearchingCommunity,
  communityResults,
  setCurrentView
}) => {
  return (
    <div>
      <h2 style={{ color: COLORS.PRIMARY, textAlign: 'center', marginBottom: '20px' }}>Find Dancers</h2>
      
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
        <input 
          value={communityQuery} 
          onChange={e => handleUserSearch(e.target.value)} 
          placeholder="Search usernames..." 
          style={{ padding: '12px', width: '100%', maxWidth: '400px', borderRadius: '8px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none', fontSize: '16px' }} 
        />
      </div>
      
      {isSearchingCommunity && (
        <div style={{ textAlign: 'center', color: COLORS.NEUTRAL, fontSize: '12px', marginBottom: '10px' }}>Searching...</div>
      )}
      
      {communityResults.length === 0 && communityQuery && !isSearchingCommunity && (
        <div style={{ textAlign: 'center', color: COLORS.NEUTRAL, marginTop: '10px' }}>No users found matching "@{communityQuery}"</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        {communityResults.map(targetUser => (
          <div 
            key={targetUser.uid} 
            onClick={() => setCurrentView({ type: 'OTHER_PROFILE', targetProfile: targetUser })} 
            style={{ backgroundColor: COLORS.WHITE, padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
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
    </div>
  );
};