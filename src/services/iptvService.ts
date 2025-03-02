
import { IPTVChannel, IPTVPlaylist, IPTVCategory, PlaylistUrl } from "@/types/iptv";
import { supabase } from "@/integrations/supabase/client";

// Default fallback playlist URLs if no custom playlists are available
const DEFAULT_PLAYLISTS = [
  "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/in.m3u", // India channels
  "https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us.m3u", // US channels
  "https://iptv-org.github.io/iptv/index.m3u", // Global index
];

// Multiple CORS proxies to try
const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://cors.eu.org/",
  "https://cors-proxy.fringe.zone/",
  "", // Direct attempt without proxy (for GitHub URLs)
];

export async function fetchPlaylist(): Promise<IPTVPlaylist> {
  console.log("Starting playlist fetch process...");
  
  // First try custom playlists from Supabase
  try {
    const { data: playlistUrls, error } = await supabase
      .from('playlist_urls')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: true });
    
    if (!error && playlistUrls && playlistUrls.length > 0) {
      console.log(`Found ${playlistUrls.length} custom playlists in database`);
      
      for (const playlistItem of playlistUrls as PlaylistUrl[]) {
        console.log(`Trying custom playlist: ${playlistItem.url}`);
        const result = await tryFetchWithProxies(playlistItem.url);
        if (result) {
          console.log(`Successfully fetched custom playlist: ${playlistItem.url}`);
          return result;
        }
      }
    } else {
      console.log("No custom playlists found in database or error occurred, using default playlists");
    }
  } catch (err) {
    console.error("Error fetching custom playlists from database:", err);
  }
  
  // If custom playlists fail, try default playlists
  console.log("Custom playlists failed or not available, trying default playlists...");
  for (const defaultPlaylist of DEFAULT_PLAYLISTS) {
    console.log(`Trying default playlist: ${defaultPlaylist}`);
    const result = await tryFetchWithProxies(defaultPlaylist);
    if (result) {
      console.log(`Successfully fetched default playlist: ${defaultPlaylist}`);
      return result;
    }
  }
  
  // If all remote fetches fail, return mock data
  console.log("All remote playlists failed, returning mock data");
  return fetchMockPlaylist();
}

async function tryFetchWithProxies(playlistUrl: string): Promise<IPTVPlaylist | null> {
  for (const proxy of CORS_PROXIES) {
    try {
      console.log(`Attempting fetch with ${proxy ? proxy : 'direct access'} for ${playlistUrl}`);
      const fullUrl = `${proxy}${playlistUrl}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain, application/x-mpegURL, */*',
        },
        // Add a timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch with ${proxy ? proxy : 'direct access'}: ${response.status}`);
        continue;
      }
      
      console.log(`Success with ${proxy ? proxy : 'direct access'}`);
      const data = await response.text();
      
      // If the data doesn't look like an M3U file, skip it
      if (!data.trim().startsWith('#EXTM3U')) {
        console.warn('Response doesn\'t appear to be a valid M3U file');
        continue;
      }
      
      return parseM3U(data);
    } catch (error) {
      console.warn(`Error with ${proxy ? proxy : 'direct access'}:`, error);
    }
  }
  
  return null;
}

function parseM3U(content: string): IPTVPlaylist {
  const lines = content.split("\n");
  const channels: IPTVChannel[] = [];
  const categories: Record<string, IPTVChannel[]> = {};
  
  let currentChannel: Partial<IPTVChannel> | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Header line
    if (line.startsWith("#EXTINF:")) {
      // Parse channel info
      currentChannel = {};
      
      // Extract channel name
      const nameMatch = line.match(/,(.+)$/);
      if (nameMatch && nameMatch[1]) {
        currentChannel.name = nameMatch[1].trim();
      }
      
      // Extract group info
      const groupMatch = line.match(/group-title="([^"]*)"/);
      currentChannel.group = groupMatch && groupMatch[1] ? groupMatch[1] : "Uncategorized";
      
      // Extract logo URL
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      currentChannel.logo = logoMatch && logoMatch[1] ? logoMatch[1] : undefined;
      
    } else if (line.startsWith("http") && currentChannel) {
      // This is a URL for the current channel
      currentChannel.url = line;
      currentChannel.id = `channel-${channels.length}`;
      
      // Add channel to our lists
      const channel = currentChannel as IPTVChannel;
      channels.push(channel);
      
      // Add to category
      if (!categories[channel.group]) {
        categories[channel.group] = [];
      }
      categories[channel.group].push(channel);
      
      // Reset currentChannel
      currentChannel = null;
    }
  }
  
  // Convert categories object to array format
  const categoriesArray = Object.entries(categories).map(([name, channels]) => ({
    id: `category-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    channels,
  }));
  
  console.log(`Parsed M3U: Found ${channels.length} channels in ${categoriesArray.length} categories`);
  return {
    categories: categoriesArray,
    allChannels: channels,
  };
}

export async function fetchMockPlaylist(): Promise<IPTVPlaylist> {
  console.log("Generating mock playlist data");
  // For testing when API is not available
  const mockCategories = [
    "Entertainment", 
    "News", 
    "Sports", 
    "Movies", 
    "Music"
  ];
  
  const allChannels: IPTVChannel[] = [];
  const categories: IPTVCategory[] = [];
  
  mockCategories.forEach((categoryName, catIndex) => {
    const categoryChannels: IPTVChannel[] = [];
    
    // Create 8-12 channels per category
    const channelCount = 8 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < channelCount; i++) {
      const channel: IPTVChannel = {
        id: `mock-channel-${catIndex}-${i}`,
        name: `${categoryName} Channel ${i + 1}`,
        logo: `https://picsum.photos/id/${(catIndex * 10 + i) % 100}/200/200`,
        group: categoryName,
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" // Sample video
      };
      
      categoryChannels.push(channel);
      allChannels.push(channel);
    }
    
    categories.push({
      id: `category-${categoryName.toLowerCase()}`,
      name: categoryName,
      channels: categoryChannels,
    });
  });
  
  console.log(`Generated mock playlist with ${categories.length} categories and ${allChannels.length} channels`);
  return {
    categories,
    allChannels,
  };
}

// Admin-related functions
export async function addPlaylistUrl(url: string, name: string, priority: number = 10): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('playlist_urls')
      .insert({
        url,
        name,
        priority,
        active: true
      });
    
    return !error;
  } catch (err) {
    console.error('Error adding playlist URL:', err);
    return false;
  }
}

export async function updatePlaylistUrl(id: string, data: { url?: string, name?: string, priority?: number, active?: boolean }): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('playlist_urls')
      .update(data)
      .eq('id', id);
    
    return !error;
  } catch (err) {
    console.error('Error updating playlist URL:', err);
    return false;
  }
}

export async function deletePlaylistUrl(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('playlist_urls')
      .delete()
      .eq('id', id);
    
    return !error;
  } catch (err) {
    console.error('Error deleting playlist URL:', err);
    return false;
  }
}

export async function getPlaylistUrls(): Promise<PlaylistUrl[]> {
  try {
    const { data, error } = await supabase
      .from('playlist_urls')
      .select('*')
      .order('priority', { ascending: true });
    
    if (error) {
      console.error('Error fetching playlist URLs:', error);
      return [];
    }
    
    return data as PlaylistUrl[] || [];
  } catch (err) {
    console.error('Error fetching playlist URLs:', err);
    return [];
  }
}
