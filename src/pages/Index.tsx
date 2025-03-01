
import React from "react";
import { IPTVProvider, useIPTV } from "@/contexts/IPTVContext";
import CategorySelector from "@/components/CategorySelector";
import ChannelGrid from "@/components/ChannelGrid";
import VideoPlayer from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { RefreshCw, List } from "lucide-react";

const IPTVApp = () => {
  const {
    playlist,
    isLoading,
    error,
    selectedCategory,
    selectedChannel,
    setSelectedCategory,
    setSelectedChannel,
    refreshPlaylist,
  } = useIPTV();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold">Loading IPTV Playlist...</h2>
        <p className="text-muted-foreground mt-2">This may take a moment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive w-8 h-8">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-destructive mb-2">Failed to Load Playlist</h2>
        <p className="text-muted-foreground max-w-md mb-4">{error}</p>
        <Button onClick={refreshPlaylist} className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 mr-2" />
          <span>Try Again</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 animate-fadeIn overflow-hidden">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">IPTV Player</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshPlaylist}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <span>Refresh</span>
          </Button>
        </div>
        <p className="text-muted-foreground">
          {playlist.allChannels.length} channels in {playlist.categories.length} categories
        </p>
      </header>

      <main className="flex-1 flex flex-col space-y-6">
        <div className="video-section w-full">
          <VideoPlayer channel={selectedChannel} />
        </div>

        <div className="controls-section">
          <CategorySelector
            categories={playlist.categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>

        <div className="channels-section flex-1">
          <ChannelGrid
            category={selectedCategory}
            selectedChannel={selectedChannel}
            onSelectChannel={setSelectedChannel}
          />
        </div>
      </main>
    </div>
  );
};

// Wrap the app with the provider
const Index = () => (
  <IPTVProvider>
    <IPTVApp />
  </IPTVProvider>
);

export default Index;
