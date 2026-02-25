import React from 'react';
import type { Dance, Post, UserProfile, PostComment } from './types';
import { COLORS, getDifficultyColor } from './utils';

interface HomeViewProps {
  user: any;
  profile: UserProfile;
  queryInput: string;
  setQueryInput: (val: string) => void;
  handleSearch: (query: string) => void;
  isSearchingDances: boolean;
  results: Dance[];
  paginatedList: Dance[];
  setResults: (results: Dance[]) => void;
  loadDanceDetails: (dance: Dance, path: any) => void;
  newPostContent: string;
  setNewPostContent: (content: string) => void;
  newPostVisibility: 'public' | 'followers' | 'friends' | 'private';
  setNewPostVisibility: (vis: any) => void;
  isPosting: boolean;
  handleCreatePost: () => void;
  feedPosts: Post[];
  handleLikePost: (id: string, likes: string[]) => void;
  commentInputs: { [key: string]: string };
  setCommentInputs: (inputs: any) => void;
  handleAddComment: (postId: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user, profile, queryInput, setQueryInput, handleSearch, isSearchingDances,
  results, paginatedList, setResults, loadDanceDetails, newPostContent,
  setNewPostContent, newPostVisibility, setNewPostVisibility, isPosting,
  handleCreatePost, feedPosts, handleLikePost, commentInputs, setCommentInputs, handleAddComment
}) => {
  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* 1. Search Bar */}
      <div style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(queryInput); }} style={{ display: 'flex', justifyContent: 'center' }}>
          <input value={queryInput} onChange={e => setQueryInput(e.target.value)} placeholder="Search dances to learn..." style={{ padding: '12px', width: '100%', maxWidth: '400px', borderRadius: '4px 0 0 4px', border: `1px solid ${COLORS.PRIMARY}`, outline: 'none', fontSize: '16px' }} />
          <button type="submit" style={{ padding: '12px 20px', backgroundColor: COLORS.PRIMARY, color: COLORS.WHITE, border: 'none', borderRadius: '0 4px 4px 0', fontWeight: 'bold', cursor: 'pointer' }}>Search</button>
        </form>
        
        {isSearchingDances && <div style={{ textAlign: 'center', marginTop: '10px', color: COLORS.NEUTRAL }}>Searching database...</div>}
        
        {results.length > 0 && (
          <div style={{ marginTop: '20px', borderTop: `1px solid #EEE`, paddingTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: COLORS.PRIMARY }}>Search Results</h3>
              <button onClick={() => setResults([])} style={{ background: 'none', border: 'none', color: COLORS.NEUTRAL, cursor: 'pointer', textDecoration: 'underline' }}>Clear</button>
            </div>
            {paginatedList.map((d: Dance) => (
              <div key={d.id} onClick={() => loadDanceDetails(d, { type: 'HOME' })} style={{ backgroundColor: '#F9F9F9', padding: '12px', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', border: '1px solid #EEE' }}>
                <div><div style={{ fontWeight: 'bold', color: COLORS.PRIMARY }}>{d.title}</div><div style={{ fontSize: '12px', color: COLORS.SECONDARY }}>{d.songTitle}</div></div>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getDifficultyColor(d.difficultyLevel) }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Post Composer */}
      {user && profile.username && (
        <div style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt="Profile" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👤</div>
            )}
            <div style={{ flex: 1 }}>
              <textarea 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What are you dancing to today?"
                style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #CCC', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <select 
                  value={newPostVisibility} 
                  onChange={(e: any) => setNewPostVisibility(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #CCC', fontSize: '12px', outline: 'none' }}
                >
                  <option value="public">🌐 Public</option>
                  <option value="followers">👥 Followers Only</option>
                  <option value="friends">🤝 Mutual Friends</option>
                  <option value="private">🔒 Private (Just Me)</option>
                </select>
                <button 
                  onClick={handleCreatePost}
                  disabled={!newPostContent.trim() || isPosting}
                  style={{ backgroundColor: newPostContent.trim() && !isPosting ? COLORS.PRIMARY : '#CCC', color: COLORS.WHITE, border: 'none', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: newPostContent.trim() && !isPosting ? 'pointer' : 'default' }}
                >
                  {isPosting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. The Activity Feed */}
      <div>
        <h3 style={{ color: COLORS.PRIMARY, borderBottom: '2px solid #EEE', paddingBottom: '10px', marginBottom: '15px' }}>Activity Feed</h3>
        {!user ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: COLORS.WHITE, borderRadius: '12px', color: COLORS.NEUTRAL }}>Please log in to see the community feed.</div>
        ) : feedPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: COLORS.WHITE, borderRadius: '12px', color: COLORS.NEUTRAL }}>No posts yet. Be the first to share!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {feedPosts.map(post => (
              <div key={post.id} style={{ backgroundColor: COLORS.WHITE, padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                  {post.authorPhotoUrl ? (
                    <img src={post.authorPhotoUrl} alt={post.authorUsername} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👤</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 'bold', color: COLORS.PRIMARY }}>@{post.authorUsername}</div>
                    <div style={{ fontSize: '11px', color: COLORS.NEUTRAL }}>
                      {new Date(post.createdAt).toLocaleDateString()} • {post.visibility === 'public' ? '🌐 Public' : post.visibility === 'followers' ? '👥 Followers' : post.visibility === 'friends' ? '🤝 Friends' : '🔒 Private'}
                    </div>
                  </div>
                </div>
                
                <div style={{ fontSize: '15px', color: '#333', marginBottom: '15px', lineHeight: '1.5' }}>{post.content}</div>

                <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid #EEE', paddingTop: '10px', borderBottom: '1px solid #EEE', paddingBottom: '10px' }}>
                  <button onClick={() => handleLikePost(post.id, post.likes)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: post.likes.includes(user.uid) ? COLORS.SECONDARY : COLORS.NEUTRAL, fontWeight: post.likes.includes(user.uid) ? 'bold' : 'normal' }}>
                    {post.likes.includes(user.uid) ? '❤️' : '🤍'} {post.likes.length} Likes
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: COLORS.NEUTRAL }}>
                    💬 {post.comments?.length || 0} Comments
                  </div>
                </div>

                <div style={{ marginTop: '15px' }}>
                  {(post.comments || []).map((comment: PostComment) => (
                    <div key={comment.id} style={{ display: 'flex', gap: '10px', marginBottom: '10px', backgroundColor: '#F9F9F9', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: COLORS.PRIMARY }}>@{comment.username}:</div>
                      <div style={{ fontSize: '13px', color: '#444' }}>{comment.text}</div>
                    </div>
                  ))}
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <input value={commentInputs[post.id] || ''} onChange={e => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })} placeholder="Write a comment..." style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid #CCC', outline: 'none', fontSize: '13px' }} />
                    <button onClick={() => handleAddComment(post.id)} disabled={!commentInputs[post.id]?.trim()} style={{ background: 'none', border: 'none', color: commentInputs[post.id]?.trim() ? COLORS.PRIMARY : '#CCC', fontWeight: 'bold', cursor: commentInputs[post.id]?.trim() ? 'pointer' : 'default' }}>
                      Post
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};