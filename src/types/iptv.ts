
export interface IPTVChannel {
  id: string;
  name: string;
  logo?: string;
  group: string;
  url: string;
}

export interface IPTVCategory {
  id: string;
  name: string;
  channels: IPTVChannel[];
}

export interface IPTVPlaylist {
  categories: IPTVCategory[];
  allChannels: IPTVChannel[];
}

export interface PlaylistUrl {
  id: string;
  url: string;
  name: string;
  priority: number;
  active: boolean;
  created_at?: string;
}
