import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const PLAYLIST_URL = "https://sprl.in/Shailu_Indian_chanels_follow_iptvlinksp-m3u";
const CACHE_TIME = 3600; // Cache for 1 hour

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Fetching playlist from source...");
    const response = await fetch(PLAYLIST_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${response.status}`);
    }
    
    const content = await response.text();
    const contentType = response.headers.get('content-type') || '';
    
    // Parse the playlist content based on content type
    let playlist;
    if (contentType.includes('application/json')) {
      // Handle JSON format
      playlist = parseJSON(content);
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      // Handle XML format
      playlist = parseXML(content);
    } else {
      // Default to M3U parsing for text/plain or unknown formats
      playlist = parseM3U(content);
    }
    
    // Cache the result in Supabase database
    await cachePlaylist(content);
    
    console.log(`Playlist loaded: ${playlist.allChannels.length} channels in ${playlist.categories.length} categories`);
    
    return new Response(
      JSON.stringify(playlist),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${CACHE_TIME}`
        } 
      }
    );
  } catch (error) {
    console.error("Error fetching playlist:", error);
    
    // Try to get the cached playlist
    try {
      const cachedPlaylist = await getCachedPlaylist();
      if (cachedPlaylist) {
        console.log("Using cached playlist");
        return new Response(
          JSON.stringify(cachedPlaylist),
          { 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'max-age=300'  // Short cache time for stale data
            } 
          }
        );
      }
    } catch (cacheError) {
      console.error("Error fetching cached playlist:", cacheError);
    }
    
    // If all else fails, return error
    return new Response(
      JSON.stringify({ 
        error: "Failed to fetch playlist", 
        message: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});

async function cachePlaylist(content: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials for caching");
    return;
  }
  
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    
    // Check if we already have a cached playlist
    const { data: existingData } = await supabaseAdmin
      .from('iptvPlaylists')
      .select('id')
      .eq('name', 'main_playlist')
      .maybeSingle();
    
    const timestamp = new Date().toISOString();
    
    if (existingData) {
      // Update existing playlist
      await supabaseAdmin
        .from('iptvPlaylists')
        .update({ 
          content: content,
          updated_at: timestamp
        })
        .eq('id', existingData.id);
    } else {
      // Insert new playlist
      await supabaseAdmin
        .from('iptvPlaylists')
        .insert({
          name: 'main_playlist',
          content: content,
          created_at: timestamp,
          updated_at: timestamp
        });
    }
    
    console.log("Playlist cached successfully");
  } catch (error) {
    console.error("Error caching playlist:", error);
  }
}

async function getCachedPlaylist() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials for fetching cache");
    return null;
  }
  
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
    
    const { data: playlist } = await supabaseAdmin
      .from('iptvPlaylists')
      .select('content, updated_at')
      .eq('name', 'main_playlist')
      .maybeSingle();
    
    if (!playlist || !playlist.content) {
      return null;
    }
    
    // Parse the cached content
    const parsedPlaylist = parseM3U(playlist.content);
    
    return parsedPlaylist;
  } catch (error) {
    console.error("Error fetching cached playlist:", error);
    return null;
  }
}

// Create Supabase client
function createClient(supabaseUrl: string, supabaseKey: string) {
  return {
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: any) => ({
          maybeSingle: async () => {
            const url = `${supabaseUrl}/rest/v1/${table}?select=${columns}&${column}=eq.${value}&limit=1`;
            const response = await fetch(url, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            });
            
            if (!response.ok) {
              throw new Error(`Supabase API error: ${response.status}`);
            }
            
            const data = await response.json();
            return { data: data.length > 0 ? data[0] : null };
          }
        })
      }),
      insert: (data: any) => ({
        execute: async () => {
          const url = `${supabaseUrl}/rest/v1/${table}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(data)
          });
          
          if (!response.ok) {
            throw new Error(`Supabase API error: ${response.status}`);
          }
          
          return { data: null, error: null };
        }
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          execute: async () => {
            const url = `${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}`;
            const response = await fetch(url, {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(data)
            });
            
            if (!response.ok) {
              throw new Error(`Supabase API error: ${response.status}`);
            }
            
            return { data: null, error: null };
          }
        })
      })
    })
  };
}

// Parse JSON format
function parseJSON(content: string) {
  try {
    const jsonData = JSON.parse(content);
    const channels = [];
    const categories: Record<string, any[]> = {};
    
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
      
      channelArray.forEach((item, index) => {
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
  } catch (error) {
    console.error("Error parsing JSON:", error);
    // Fallback to M3U parsing
    return parseM3U(content);
  }
}

// Parse XML format
function parseXML(content: string) {
  try {
    // Basic XML parsing using regex (for simplicity)
    // In a real-world scenario, use a proper XML parser library
    const channels = [];
    const categories: Record<string, any[]> = {};
    
    // Extract channels using regex
    const channelRegex = /<channel[^>]*>([\s\S]*?)<\/channel>/g;
    let match;
    let index = 0;
    
    while ((match = channelRegex.exec(content)) !== null) {
      const channelContent = match[1];
      
      // Extract channel details
      const nameMatch = /<name[^>]*>(.*?)<\/name>/i.exec(channelContent);
      const logoMatch = /<logo[^>]*>(.*?)<\/logo>|<icon[^>]*>(.*?)<\/icon>/i.exec(channelContent);
      const urlMatch = /<url[^>]*>(.*?)<\/url>|<stream[^>]*>(.*?)<\/stream>/i.exec(channelContent);
      const groupMatch = /<group[^>]*>(.*?)<\/group>|<category[^>]*>(.*?)<\/category>/i.exec(channelContent);
      
      const channel = {
        id: `channel-${index}`,
        name: nameMatch ? nameMatch[1] : `Channel ${index}`,
        logo: logoMatch ? (logoMatch[1] || logoMatch[2]) : undefined,
        group: groupMatch ? (groupMatch[1] || groupMatch[2] || "Uncategorized") : "Uncategorized",
        url: urlMatch ? (urlMatch[1] || urlMatch[2]) : "",
      };
      
      if (channel.url) {
        channels.push(channel);
        
        // Add to category
        if (!categories[channel.group]) {
          categories[channel.group] = [];
        }
        categories[channel.group].push(channel);
        index++;
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
  } catch (error) {
    console.error("Error parsing XML:", error);
    // Fallback to M3U parsing
    return parseM3U(content);
  }
}

// Parse M3U format
function parseM3U(content: string) {
  const lines = content.split("\n");
  const channels = [];
  const categories: Record<string, any[]> = {};
  
  let currentChannel = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Header line (could be different formats)
    if (line.startsWith("#EXTINF:") || line.startsWith("#EXTM3U:") || line.includes('tvg-name=') || line.includes('tvg-id=')) {
      // Parse channel info
      currentChannel = {};
      
      // Extract channel name
      const nameMatch = line.match(/,(.+)$/) || line.match(/tvg-name="([^"]*)"/);
      if (nameMatch && nameMatch[1]) {
        currentChannel.name = nameMatch[1].trim();
      }
      
      // Extract group info
      const groupMatch = line.match(/group-title="([^"]*)"/);
      currentChannel.group = groupMatch && groupMatch[1] ? groupMatch[1] : "Uncategorized";
      
      // Extract logo URL
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      currentChannel.logo = logoMatch && logoMatch[1] ? logoMatch[1] : undefined;
      
    } else if ((line.startsWith("http") || line.startsWith("https") || line.startsWith("rtmp") || line.startsWith("udp")) && currentChannel) {
      // This is a URL for the current channel
      currentChannel.url = line;
      currentChannel.id = `channel-${channels.length}`;
      
      // Add channel to our lists
      channels.push(currentChannel);
      
      // Add to category
      if (!categories[currentChannel.group]) {
        categories[currentChannel.group] = [];
      }
      categories[currentChannel.group].push(currentChannel);
      
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
