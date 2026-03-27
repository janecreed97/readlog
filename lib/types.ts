export interface Article {
  id: string
  user_id: string
  url: string
  title: string
  source: string
  published_date: string | null
  category: string
  subcategory: string
  is_paywalled: boolean
  is_private: boolean
  article_type: 'article' | 'video'
  created_at: string
  bullets?: Bullet[]
  shared_by?: string | null
  shared_by_name?: string | null
}

export interface Bullet {
  id: string
  article_id: string
  content: string
  position: number
}

export interface ArticlePreview {
  title: string
  source: string
  published_date: string | null
  category: string
  subcategory: string
  bullets: string[]
  is_paywalled: boolean
  is_private: boolean
  url: string
  // Attribution when saving from another user's profile
  shared_by_id?: string
  shared_by_name?: string
}

export interface Profile {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  created_at: string
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted'
  created_at: string
  accepted_at: string | null
  profile?: Profile
}

export interface ShareReaction {
  id: string
  share_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface ShareComment {
  id: string
  share_id: string
  user_id: string
  content: string
  created_at: string
  author?: Profile
}

export interface ShareRecord {
  id: string
  article_id: string | null
  sender_id: string
  recipient_id: string
  note: string | null
  status: 'unread' | 'read' | 'saved' | 'dismissed'
  payload: {
    title: string
    source: string
    url: string
    published_date: string | null
    category: string
    subcategory: string
    bullets: string[]
  }
  sent_at: string
  read_at: string | null
  saved_at: string | null
  sender?: Profile
  recipient?: Profile
}
