import React, { createContext, useContext, useState, useEffect } from "react";
import { IPTVChannel, IPTVPlaylist, IPTVCategory } from "@/types/iptv";
import { fetchPlaylist, fetchMockPlaylist } from "@/services/iptvService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface IPTVContextType {
  playlist: IPTVPlaylist;
  isLoading: boolean;
  error: string | null;
  selectedCategory: IPTVCategory | null;
  selectedChannel: IPTVChannel | null;
  favoriteChannels: IPTVChannel[];
  watchHistory: { channel: IPTVChannel; timestamp: number }[];
  searchResults: IPTVChannel[];
  searching: boolean;
  setSelectedCategory: (category: IPTVCategory | null) => void;
  setSelectedChannel: (channel: IPTVChannel | null) => void;
  refreshPlaylist: () => Promise<void>;
  toggleFavorite: (channel: IPTVChannel) => Promise<void>;
  isFavorite: (channelId: string) => boolean;
  clearHistory: () => Promise<void>;
  searchChannels: (term: string) => void;
  checkChannelStatus: (channelId: string) => Promise<boolean>;
  startChannelHealthCheck: () => Promise<void>;
}

const IPTVContext = createContext<IPTVContextType | undefined>(undefined);

export function IPTVProvider({ children }: { children: React.ReactNode }) {
  const [playlist, setPlaylist] = useState<IPTVPlaylist>({ categories: [], allChannels: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<IPTVCategory | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<IPTVChannel | null>(null);
  const [favoriteChannels, setFavoriteChannels] = useState<IPTVChannel[]>([]);
  const [watchHistory, setWatchHistory] = useState<{ channel: IPTVChannel; timestamp: number }[]>([]);
  const [searchResults, setSearchResults] = useState<IPTVChannel[]>([]);
  const [searching, setSearching] = useState(false);
  const [healthCheckInProgress, setHealthCheckInProgress] = useState(false);
  const { toast } = useToast();

  const loadFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('status', 'online');

      if (error) {
        console.error('Error loading favorites:', error);
        const storedFavorites = localStorage.getItem('favoriteChannels');
        if (storedFavorites) {
          setFavoriteChannels(JSON.parse(storedFavorites));
        }
        return;
      }

      if (data && data.length > 0) {
        const favChannels = data.map(item => ({
          id: item.id,
          name: item.title,
          logo: item.thumbnail_url || undefined,
          group: 'Favorites',
          url: item.stream_url,
        }));
        setFavoriteChannels(favChannels);
      }
    } catch (err) {
      console.error('Failed to load favorites:', err);
      const storedFavorites = localStorage.getItem('favoriteChannels');
      if (storedFavorites) {
        setFavoriteChannels(JSON.parse(storedFavorites));
      }
    }
  };

  const loadWatchHistory = () => {
    const storedHistory = localStorage.getItem('watchHistory');
    if (storedHistory) {
      setWatchHistory(JSON.parse(storedHistory));
    }
  };

  useEffect(() => {
    loadFavorites();
    loadWatchHistory();
    refreshPlaylist(); // Automatically load the playlist when the component mounts
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      const newHistoryItem = {
        channel: selectedChannel,
        timestamp: Date.now(),
      };

      setWatchHistory(prevHistory => {
        const filteredHistory = prevHistory.filter(
          item => item.channel.id !== selectedChannel.id
        );
        
        const updatedHistory = [newHistoryItem, ...filteredHistory].slice(0, 20);
        localStorage.setItem('watchHistory', JSON.stringify(updatedHistory));
        return updatedHistory;
      });
    }
  }, [selectedChannel]);

  const refreshPlaylist = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Refreshing playlist with improved fetch mechanism...");
      const data = await fetchPlaylist();
      
      if (!data || data.categories.length === 0 || data.allChannels.length === 0) {
        console.warn("No valid data in playlist response");
        throw new Error("No valid channels found in playlist");
      }
      
      console.log(`Successfully loaded playlist with ${data.categories.length} categories and ${data.allChannels.length} channels`);
      
      // Filter out channels marked as offline in Supabase
      const { data: offlineChannels } = await supabase
        .from('channels')
        .select('id')
        .eq('status', 'offline');
      
      if (offlineChannels && offlineChannels.length > 0) {
        const offlineIds = new Set(offlineChannels.map(c => c.id));
        
        // Filter offline channels from allChannels
        data.allChannels = data.allChannels.filter(channel => !offlineIds.has(channel.id));
        
        // Filter offline channels from each category
        data.categories.forEach(category => {
          category.channels = category.channels.filter(channel => !offlineIds.has(channel.id));
        });
        
        console.log(`Filtered out ${offlineChannels.length} offline channels`);
      }
      
      setPlaylist(data);
      
      if (data.categories.length > 0 && (!selectedCategory || !data.categories.some(c => c.id === selectedCategory.id))) {
        setSelectedCategory(data.categories[0]);
      }
      
      toast({
        title: "Playlist Loaded",
        description: `Successfully loaded ${data.allChannels.length} working channels in ${data.categories.length} categories.`,
      });
      
      // Schedule automatic health check
      if (!healthCheckInProgress) {
        startChannelHealthCheck();
      }
    } catch (err) {
      console.error("Failed to load playlist:", err);
      setError("Failed to load playlist. Showing sample data instead.");
      
      // Load mock data as fallback
      console.log("Loading mock data as fallback");
      const mockData = await fetchMockPlaylist();
      setPlaylist(mockData);
      
      if (mockData.categories.length > 0) {
        setSelectedCategory(mockData.categories[0]);
      }
      
      toast({
        title: "Using Sample Data",
        description: "Unable to load real channels. Showing sample content instead.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkChannelStatus = async (channelId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from('channels')
        .select('status')
        .eq('id', channelId)
        .single();
      
      return data?.status === 'online';
    } catch (err) {
      console.error('Error checking channel status:', err);
      return true; // Assume working if we can't check
    }
  };

  const toggleFavorite = async (channel: IPTVChannel) => {
    const isFav = isFavorite(channel.id);
    
    try {
      if (isFav) {
        setFavoriteChannels(prev => prev.filter(ch => ch.id !== channel.id));
        
        try {
          const { error } = await supabase
            .from('channels')
            .update({ 
              status: 'offline',
              title: channel.name,
              stream_url: channel.url,
              thumbnail_url: channel.logo || null
            })
            .eq('id', channel.id);
            
          if (error) throw error;
        } catch (err) {
          console.error('Error updating Supabase:', err);
        }
        
        toast({
          title: "Removed from Favorites",
          description: `${channel.name} has been removed from your favorites.`,
        });
      } else {
        setFavoriteChannels(prev => [...prev, channel]);
        
        try {
          const { data } = await supabase
            .from('channels')
            .select('id')
            .eq('id', channel.id);
            
          if (data && data.length > 0) {
            await supabase
              .from('channels')
              .update({ 
                status: 'online',
                title: channel.name,
                stream_url: channel.url,
                thumbnail_url: channel.logo || null
              })
              .eq('id', channel.id);
          } else {
            await supabase
              .from('channels')
              .insert({
                id: channel.id,
                status: 'online',
                title: channel.name,
                stream_url: channel.url,
                thumbnail_url: channel.logo || null
              });
          }
        } catch (err) {
          console.error('Error updating Supabase:', err);
        }
        
        toast({
          title: "Added to Favorites",
          description: `${channel.name} has been added to your favorites.`,
        });
      }
      
      localStorage.setItem('favoriteChannels', JSON.stringify(
        isFav 
          ? favoriteChannels.filter(ch => ch.id !== channel.id)
          : [...favoriteChannels, channel]
      ));
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isFavorite = (channelId: string) => {
    return favoriteChannels.some(ch => ch.id === channelId);
  };

  const clearHistory = async () => {
    setWatchHistory([]);
    localStorage.removeItem('watchHistory');
    toast({
      title: "History Cleared",
      description: "Your watch history has been cleared.",
    });
  };

  const searchChannels = (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    const results = playlist.allChannels.filter(channel => 
      channel.name.toLowerCase().includes(term.toLowerCase()) ||
      channel.group.toLowerCase().includes(term.toLowerCase())
    );
    
    setSearchResults(results);
    setSearching(false);
  };

  const startChannelHealthCheck = async () => {
    if (healthCheckInProgress || playlist.allChannels.length === 0) return;
    
    setHealthCheckInProgress(true);
    
    try {
      // Only test a small batch of channels at a time to avoid overwhelming the system
      const channelsToTest = playlist.allChannels
        .slice(0, 10) // Test 10 channels at a time
        .map(channel => ({
          id: channel.id,
          url: channel.url,
          name: channel.name,
          logo: channel.logo
        }));
      
      // Use a web worker or background process to test channels
      for (const channel of channelsToTest) {
        try {
          // Simple fetch test to see if URL is reachable
          const response = await fetch(channel.url, { 
            method: 'HEAD',
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });
          
          const isWorking = response.ok;
          
          await supabase
            .from('channels')
            .upsert({
              id: channel.id,
              status: isWorking ? 'online' : 'offline',
              title: channel.name, 
              stream_url: channel.url,
              thumbnail_url: channel.logo || null
            }, { 
              onConflict: 'id' 
            });
          
          if (!isWorking) {
            console.log(`Marked channel ${channel.id} as offline`);
          }
        } catch (err) {
          // If fetch fails, mark channel as offline
          await supabase
            .from('channels')
            .upsert({
              id: channel.id,
              status: 'offline',
              title: channel.name,
              stream_url: channel.url,
              thumbnail_url: channel.logo || null
            }, { 
              onConflict: 'id' 
            });
          
          console.log(`Marked channel ${channel.id} as offline due to error:`, err);
        }
      }
    } catch (err) {
      console.error('Error during channel health check:', err);
    } finally {
      setHealthCheckInProgress(false);
    }
  };

  const value = {
    playlist,
    isLoading,
    error,
    selectedCategory,
    selectedChannel,
    favoriteChannels,
    watchHistory,
    searchResults,
    searching,
    setSelectedCategory,
    setSelectedChannel,
    refreshPlaylist,
    toggleFavorite,
    isFavorite,
    clearHistory,
    searchChannels,
    checkChannelStatus,
    startChannelHealthCheck,
  };

  return <IPTVContext.Provider value={value}>{children}</IPTVContext.Provider>;
}

export function useIPTV() {
  const context = useContext(IPTVContext);
  if (context === undefined) {
    throw new Error("useIPTV must be used within an IPTVProvider");
  }
  return context;
}
