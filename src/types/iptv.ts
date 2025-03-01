
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
