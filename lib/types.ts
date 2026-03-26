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
  article_type: 'article' | 'video'
  created_at: string
  bullets?: Bullet[]
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
  url: string
}
