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
      
      // Create an array to hold all channels and categories
      let allChannels: IPTVChannel[] = [];
      let categoriesMap: Record<string, IPTVChannel[]> = {};
      
      // Try to fetch all playlists
      for (const playlistItem of playlistUrls as PlaylistUrl[]) {
        console.log(`Trying custom playlist: ${playlistItem.url}`);
        const result = await tryFetchWithProxies(playlistItem.url);
        
        if (result) {
          console.log(`Successfully fetched custom playlist: ${playlistItem.url}`);
          
          // Add channels to our combined list
          allChannels = [...allChannels, ...result.allChannels];
          
          // Merge categories
          for (const category of result.categories) {
            if (!categoriesMap[category.name]) {
              categoriesMap[category.name] = [];
            }
            categoriesMap[category.name] = [...categoriesMap[category.name], ...category.channels];
          }
        }
      }
      
      // If we have any channels, return the combined playlist
      if (allChannels.length > 0) {
        console.log(`Combined ${allChannels.length} channels from multiple playlists`);
        
        // Deduplicate channels by URL
        const uniqueChannels = deduplicateChannels(allChannels);
        console.log(`Deduplicated to ${uniqueChannels.length} unique channels`);
        
        // Convert categories map to array format
        const categories = Object.entries(categoriesMap).map(([name, channels]) => {
          // Deduplicate channels within each category
          const uniqueCategoryChannels = deduplicateChannels(channels);
          
          return {
            id: `category-${name.toLowerCase().replace(/\s+/g, '-')}`,
            name,
            channels: uniqueCategoryChannels,
          };
        });
        
        return {
          categories,
          allChannels: uniqueChannels,
        };
      }
    } else {
      console.log("No custom playlists found in database or error occurred, using default playlists");
    }
  } catch (err) {
    console.error("Error fetching custom playlists from database:", err);
  }
  
  // If custom playlists fail, try default playlists
  console.log("Custom playlists failed or not available, trying default playlists...");
  let allChannels: IPTVChannel[] = [];
  let categoriesMap: Record<string, IPTVChannel[]> = {};
  
  for (const defaultPlaylist of DEFAULT_PLAYLISTS) {
    console.log(`Trying default playlist: ${defaultPlaylist}`);
    const result = await tryFetchWithProxies(defaultPlaylist);
    
    if (result) {
      console.log(`Successfully fetched default playlist: ${defaultPlaylist}`);
      
      // Add channels to our combined list
      allChannels = [...allChannels, ...result.allChannels];
      
      // Merge categories
      for (const category of result.categories) {
        if (!categoriesMap[category.name]) {
          categoriesMap[category.name] = [];
        }
        categoriesMap[category.name] = [...categoriesMap[category.name], ...category.channels];
      }
    }
  }
  
  // If we have any channels from default playlists, return the combined playlist
  if (allChannels.length > 0) {
    console.log(`Combined ${allChannels.length} channels from default playlists`);
    
    // Deduplicate channels
    const uniqueChannels = deduplicateChannels(allChannels);
    console.log(`Deduplicated to ${uniqueChannels.length} unique channels`);
    
    // Convert categories map to array format
    const categories = Object.entries(categoriesMap).map(([name, channels]) => {
      // Deduplicate channels within each category
      const uniqueCategoryChannels = deduplicateChannels(channels);
      
      return {
        id: `category-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        channels: uniqueCategoryChannels,
      };
    });
    
    return {
      categories,
      allChannels: uniqueChannels,
    };
  }
  
  // If all remote fetches fail, return mock data
  console.log("All remote playlists failed, returning mock data");
  return fetchMockPlaylist();
}

// Helper function to deduplicate channels by URL
function deduplicateChannels(channels: IPTVChannel[]): IPTVChannel[] {
  const uniqueUrls = new Set<string>();
  const uniqueChannels: IPTVChannel[] = [];
  
  for (const channel of channels) {
    if (!uniqueUrls.has(channel.url)) {
      uniqueUrls.add(channel.url);
      uniqueChannels.push(channel);
    }
  }
  
  return uniqueChannels;
}

async function tryFetchWithProxies(playlistUrl: string): Promise<IPTVPlaylist | null> {
  for (const proxy of CORS_PROXIES) {
    try {
      console.log(`Attempting fetch with ${proxy ? proxy : 'direct access'} for ${playlistUrl}`);
      const fullUrl = `${proxy}${playlistUrl}`;
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain, application/x-mpegURL, application/json, text/xml, */*',
        },
        // Add a timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch with ${proxy ? proxy : 'direct access'}: ${response.status}`);
        continue;
      }
      
      console.log(`Success with ${proxy ? proxy : 'direct access'}`);
      
      // Check the content type
      const contentType = response.headers.get('content-type') || '';
      
      // Handle different content types
      if (contentType.includes('application/json')) {
        const data = await response.json();
        return parsePlaylistJSON(data);
      } else {
        const data = await response.text();
        
        // If the data doesn't look like an M3U file but looks like JSON, try parsing as JSON
        if (!data.trim().startsWith('#EXTM3U') && data.trim().startsWith('{')) {
          try {
            const jsonData = JSON.parse(data);
            return parsePlaylistJSON(jsonData);
          } catch (e) {
            // If JSON parsing fails, continue with M3U parsing
            console.warn('JSON parsing failed, falling back to M3U parsing');
          }
        }
        
        // Default to M3U parsing
        return parseM3U(data);
      }
    } catch (error) {
      console.warn(`Error with ${proxy ? proxy : 'direct access'}:`, error);
    }
  }
  
  return null;
}

function parsePlaylistJSON(jsonData: any): IPTVPlaylist {
  const channels: IPTVChannel[] = [];
  const categories: Record<string, IPTVChannel[]> = {};
  
  try {
    // Try to determine the structure of the JSON
    if (Array.isArray(jsonData)) {
      // If it's an array of channels
      jsonData.forEach((item, index) => {
        const channel = {
          id: item.id || `channel-${index}`,
          name: item.name || item.title || `Channel ${index}`,
          logo: item.logo || item.icon || item.img || item.image || item.thumbnail,
          group: item.group || item.category || item.genre || "Uncategorized",
          url: item.url || item.stream || item.streamUrl || item.link || item.source
        };
        
        if (channel.url) {
          channels.push(channel);
          
          // Add to category
          if (!categories[channel.group]) {
            categories[channel.group] = [];
          }
          categories[channel.group].push(channel);
        }
      });
    } else if (jsonData.channels || jsonData.items || jsonData.streams) {
      // If it has a channels or items property
      const channelArray = jsonData.channels || jsonData.items || jsonData.streams || [];
      
      channelArray.forEach((item: any, index: number) => {
        const channel = {
          id: item.id || `channel-${index}`,
          name: item.name || item.title || `Channel ${index}`,
          logo: item.logo || item.icon || item.img || item.image || item.thumbnail,
          group: item.group || item.category || item.genre || "Uncategorized",
          url: item.url || item.stream || item.streamUrl || item.link || item.source
        };
        
        if (channel.url) {
          channels.push(channel);
          
          // Add to category
          if (!categories[channel.group]) {
            categories[channel.group] = [];
          }
          categories[channel.group].push(channel);
        }
      });
    }
  } catch (error) {
    console.error("Error processing JSON playlist:", error);
  }
  
  // Convert categories object to array format
  const categoriesArray = Object.entries(categories).map(([name, channelsList]) => ({
    id: `category-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    channels: channelsList,
  }));
  
  console.log(`Parsed JSON Playlist: Found ${channels.length} channels in ${categoriesArray.length} categories`);
  return {
    categories: categoriesArray,
    allChannels: channels,
  };
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

// Bulk import playlist URLs
export async function bulkAddPlaylistUrls(urls: string[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    if (!url) continue;
    
    try {
      const { error } = await supabase
        .from('playlist_urls')
        .insert({
          url,
          name: `Playlist ${i + 1}`,
          priority: 10 + i,
          active: true
        });
      
      if (!error) {
        success++;
      } else {
        failed++;
      }
    } catch (err) {
      console.error('Error adding playlist URL:', err);
      failed++;
    }
  }
  
  return { success, failed };
}
