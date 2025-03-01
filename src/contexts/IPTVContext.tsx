
import React, { createContext, useContext, useState, useEffect } from "react";
import { IPTVChannel, IPTVPlaylist, IPTVCategory } from "@/types/iptv";
import { fetchPlaylist, fetchMockPlaylist } from "@/services/iptvService";
import { useToast } from "@/hooks/use-toast";

interface IPTVContextType {
  playlist: IPTVPlaylist;
  isLoading: boolean;
  error: string | null;
  selectedCategory: IPTVCategory | null;
  selectedChannel: IPTVChannel | null;
  setSelectedCategory: (category: IPTVCategory | null) => void;
  setSelectedChannel: (channel: IPTVChannel | null) => void;
  refreshPlaylist: () => Promise<void>;
}

const IPTVContext = createContext<IPTVContextType | undefined>(undefined);

export function IPTVProvider({ children }: { children: React.ReactNode }) {
  const [playlist, setPlaylist] = useState<IPTVPlaylist>({ categories: [], allChannels: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<IPTVCategory | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<IPTVChannel | null>(null);
  const { toast } = useToast();

  const refreshPlaylist = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to fetch real playlist first
      const data = await fetchPlaylist();
      
      // If we get no categories, fall back to mock data
      if (data.categories.length === 0) {
        const mockData = await fetchMockPlaylist();
        setPlaylist(mockData);
        toast({
          title: "Using Demo Data",
          description: "Unable to load the actual playlist. Showing demo content instead.",
          variant: "destructive",
        });
      } else {
        setPlaylist(data);
        toast({
          title: "Playlist Loaded",
          description: `Successfully loaded ${data.allChannels.length} channels in ${data.categories.length} categories.`,
        });
      }
      
      // Select the first category by default
      if (data.categories.length > 0 && !selectedCategory) {
        setSelectedCategory(data.categories[0]);
      }
    } catch (err) {
      console.error("Failed to load playlist:", err);
      setError("Failed to load playlist. Please try again later.");
      
      // Load mock data when real data fails
      const mockData = await fetchMockPlaylist();
      setPlaylist(mockData);
      
      // Select the first category by default
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

  useEffect(() => {
    refreshPlaylist();
  }, []);

  const value = {
    playlist,
    isLoading,
    error,
    selectedCategory,
    selectedChannel,
    setSelectedCategory,
    setSelectedChannel,
    refreshPlaylist,
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
