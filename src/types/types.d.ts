export interface Artist {
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  name: string;
  type: string;
  uri: string;
}

export interface Album {
  album_type: string;
  total_tracks: number;
  available_markets: string[];
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  images: {
    url: string;
    height: number;
    width: number;
  }[];
  name: string;
  release_date: string;
  release_date_precision: string;
  restrictions: {
    reason: string;
  };
  type: string;
  uri: string;
  artists: Artist[];
}

export interface User {
  id: string;
  name: string;
  userId: string;
  username: string;
}

export interface QueueItemUser {
  id: string;
  name: string;
}

export interface TokenResponse {
  access_token: string;
  access_token_expires: number;
  refresh_token: string;
}

export interface NowPlayingData {
  isPlaying: boolean;
  title: string;
  album: Album;
  artists: Artist[];
  albumImageUrl: string;
  songUrl: string;
  progressMs: number;
  durationMs: number;
  user?: User;
}

export interface NowPlaying {
  isPlaying?: boolean;
  data?: NowPlayingData;
  queue?: TrackObject[];

  queueEnabled?: boolean;
}

export interface TrackObject {
  album: Album;
  artists: Artist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_ids: {
    isrc: string;
    ean: string;
    upc: string;
  };
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  is_playable: boolean;
  linked_from: object;
  restrictions: {
    reason: string;
  };
  name: string;
  popularity: number;
  preview_url: string;
  track_number: number;
  type: string;
  uri: string;
  is_local: boolean;
  user?: User;
}
