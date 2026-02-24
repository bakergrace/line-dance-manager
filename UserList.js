import React from 'react';

export default function UserList({ title, users, onBack }) {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Header with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
        <button 
          onClick={onBack} 
          style={{ marginRight: '15px', padding: '8px 12px', cursor: 'pointer', background: 'none', border: '1px solid #ccc', borderRadius: '5px' }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>

      {/* The List of Users */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* What to show if the real data hasn't loaded or is empty */}
        {users.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>No users found.</p>
        ) : (
          /* What to show when real users exist */
          users.map((user, index) => (
            <div key={user.id || index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {/* Real Profile Picture Placeholder */}
                <img 
                  src={user.profileImageUrl || 'https://via.placeholder.com/40'} 
                  alt={user.username}
                  style={{ width: '40px', height: '40px', backgroundColor: '#ccc', borderRadius: '50%', objectFit: 'cover' }} 
                />
                
                {/* User Info */}
                <div>
                  <div style={{ fontWeight: 'bold' }}>{user.username}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>{user.fullname}</div>
                </div>
              </div>

              {/* Follow Button */}
              <button style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: user.isFollowing ? '#eee' : '#007bff',
                color: user.isFollowing ? '#333' : 'white',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}>
                {user.isFollowing ? "Following" : "Follow"}
              </button>
              
            </div>
          ))
        )}
      </div>
    </div>
  );
}