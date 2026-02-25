export interface Dance {
  id: string; 
  title: string; 
  difficultyLevel: string; 
  counts: number;
  songTitle: string; 
  songArtist: string; 
  stepSheetContent?: any[]; 
  originalStepSheetUrl?: string; 
  stepSheetId?: string; 
  wallCount: number;
}

export interface UserProfile {
  uid?: string;
  username: string; 
  firstName: string; 
  lastName: string;
  bio: string; 
  location: string; 
  photoUrl: string;
  following: string[];
  followers: string[]; 
}

export interface PostComment {
  id: string;
  uid: string;
  username: string;
  photoUrl: string;
  text: string;
  timestamp: number;
}

export interface Post {
  id: string;
  authorUid: string;
  authorUsername: string;
  authorPhotoUrl: string;
  content: string;
  visibility: 'public' | 'followers' | 'friends' | 'private';
  likes: string[]; 
  comments: PostComment[];
  createdAt: number;
}

export type ReturnPath = { type: 'SEARCH' } | { type: 'PLAYLIST_DETAIL'; name: string } | { type: 'COMMUNITY' } | { type: 'HOME' };

export type AppView = 
  | { type: 'HOME' } 
  | { type: 'SEARCH' } 
  | { type: 'PLAYLISTS_LIST' } 
  | { type: 'PLAYLIST_DETAIL'; name: string } 
  | { type: 'ACCOUNT' } 
  | { type: 'COMMUNITY' }
  | { type: 'OTHER_PROFILE'; targetProfile: UserProfile }
  | { type: 'DANCE_PROFILE'; dance: Dance; returnPath: ReturnPath }
  | { type: 'USER_LIST'; listTitle: string; uids: string[]; returnPath: AppView };