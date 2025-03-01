
import { IPTVChannel, IPTVPlaylist, IPTVCategory } from "@/types/iptv";
import { supabase } from "@/integrations/supabase/client";

const PLAYLIST_URL = "https://sprl.in/Shailu_Indian_chanels_follow_iptvlinksp-m3u";

export async function fetchPlaylist(): Promise<IPTVPlaylist> {
  try {
    // First try using our Supabase Edge Function which handles CORS and caching
    const { data, error } = await supabase.functions.invoke('fetch-playlist');
    
    if (error) {
      console.error("Edge function error:", error);
      // Fall back to direct fetching if edge function fails
      return fetchDirectPlaylist();
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching playlist from edge function:", error);
    // Fall back to direct fetching if edge function fails
    return fetchDirectPlaylist();
  }
}

async function fetchDirectPlaylist(): Promise<IPTVPlaylist> {
  try {
    // Try direct fetch with CORS proxy as fallback
    const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
    
    const response = await fetch(`${CORS_PROXY}${PLAYLIST_URL}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${response.status}`);
    }
    
    const data = await response.text();
    return parseM3U(data);
  } catch (error) {
    console.error("Error fetching playlist directly:", error);
    // Return empty playlist on error
    return { categories: [], allChannels: [] };
  }
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
  
  return {
    categories: categoriesArray,
    allChannels: channels,
  };
}

export async function fetchMockPlaylist(): Promise<IPTVPlaylist> {
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
  
  return {
    categories,
    allChannels,
  };
}
