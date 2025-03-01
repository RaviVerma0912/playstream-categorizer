
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
  setSelectedCategory: (category: IPTVCategory | null) => void;
  setSelectedChannel: (channel: IPTVChannel | null) => void;
  refreshPlaylist: () => Promise<void>;
  toggleFavorite: (channel: IPTVChannel) => Promise<void>;
  isFavorite: (channelId: string) => boolean;
  clearHistory: () => Promise<void>;
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
      // First try to fetch the actual playlist
      const data = await fetchPlaylist();
      
      if (data.categories.length === 0) {
        // If no categories were found in the actual playlist, load the mock playlist
        console.log("No categories found in actual playlist, loading mock data");
        const mockData = await fetchMockPlaylist();
        setPlaylist(mockData);
        
        if (mockData.categories.length > 0) {
          setSelectedCategory(mockData.categories[0]);
        }
        
        toast({
          title: "Using Demo Data",
          description: "Unable to load the actual playlist. Showing demo content instead.",
          variant: "destructive",
        });
      } else {
        console.log(`Loaded playlist with ${data.categories.length} categories and ${data.allChannels.length} channels`);
        setPlaylist(data);
        
        if (data.categories.length > 0 && !selectedCategory) {
          setSelectedCategory(data.categories[0]);
        }
        
        toast({
          title: "Playlist Loaded",
          description: `Successfully loaded ${data.allChannels.length} channels in ${data.categories.length} categories.`,
        });
      }
    } catch (err) {
      console.error("Failed to load playlist:", err);
      setError("Failed to load playlist. Please try again later.");
      
      // Load mock data as fallback
      console.log("Loading mock data as fallback");
      const mockData = await fetchMockPlaylist();
      setPlaylist(mockData);
      
      if (mockData.categories.length > 0) {
        setSelectedCategory(mockData.categories[0]);
      }
      
      toast({
        title: "Error Loading Playlist",
        description: "Falling back to demo content.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
            .update({ status: 'offline' })
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

  const value = {
    playlist,
    isLoading,
    error,
    selectedCategory,
    selectedChannel,
    favoriteChannels,
    watchHistory,
    setSelectedCategory,
    setSelectedChannel,
    refreshPlaylist,
    toggleFavorite,
    isFavorite,
    clearHistory,
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
