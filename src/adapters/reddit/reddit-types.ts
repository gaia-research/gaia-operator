export interface RedditComment {
  id: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
}

export interface RedditThread {
  id: string;
  title: string;
  subreddit: string;
  selftext: string;
  score: number;
  url: string;
  author: string;
  num_comments: number;
  created_utc: number;
  comments?: RedditComment[];
}

export interface RedditSearchResponse {
  query: string;
  threads: RedditThread[];
}
