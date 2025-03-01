import React, { useState } from "react";
import { IPTVProvider, useIPTV } from "@/contexts/IPTVContext";
import CategorySelector from "@/components/CategorySelector";
import ChannelGrid from "@/components/ChannelGrid";
import VideoPlayer from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { RefreshCw, List, History, Heart, X, Tv } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const IPTVApp = () => {
  const {
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
  } = useIPTV();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <div className="flex items-center space-x-2">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <List className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[450px]">
                <SheetHeader>
                  <SheetTitle>Your IPTV Collection</SheetTitle>
                </SheetHeader>
                <Tabs defaultValue="favorites" className="mt-6">
                  <TabsList className="w-full">
                    <TabsTrigger value="favorites" className="flex-1">
                      <Heart className="w-4 h-4 mr-2" />
                      Favorites
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex-1">
                      <History className="w-4 h-4 mr-2" />
                      History
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="favorites" className="mt-4">
                    {favoriteChannels.length === 0 ? (
                      <div className="text-center p-6">
                        <Heart className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No favorite channels yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Add channels to your favorites by clicking the heart icon
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[calc(100vh-200px)]">
                        <div className="grid grid-cols-2 gap-3 pb-4">
                          {favoriteChannels.map(channel => (
                            <div 
                              key={channel.id}
                              className={`relative border rounded-md p-3 cursor-pointer transition-all ${
                                selectedChannel?.id === channel.id ? 'border-primary' : 'border-border'
                              }`}
                              onClick={() => {
                                setSelectedChannel(channel);
                                setSidebarOpen(false);
                              }}
                            >
                              <div className="absolute top-2 right-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(channel);
                                  }}
                                >
                                  <Heart className="h-4 w-4 fill-primary text-primary" />
                                </Button>
                              </div>
                              <div className="flex flex-col items-center">
                                <div className="w-full aspect-square rounded-md overflow-hidden bg-muted flex items-center justify-center mb-2">
                                  {channel.logo ? (
                                    <img 
                                      src={channel.logo} 
                                      alt={channel.name} 
                                      className="w-full h-full object-contain"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=No+Logo";
                                      }} 
                                    />
                                  ) : (
                                    <Tv className="h-8 w-8 text-muted-foreground" />
                                  )}
                                </div>
                                <p className="text-sm font-medium line-clamp-2 text-center">
                                  {channel.name}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="history" className="mt-4">
                    <div className="flex justify-end mb-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearHistory}
                        className="text-xs"
                        disabled={watchHistory.length === 0}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear History
                      </Button>
                    </div>
                    
                    {watchHistory.length === 0 ? (
                      <div className="text-center p-6">
                        <History className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No watch history yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your recently watched channels will appear here
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[calc(100vh-200px)]">
                        <div className="space-y-2 pb-4">
                          {watchHistory.map((item, index) => (
                            <div 
                              key={`${item.channel.id}-${index}`}
                              className={`flex items-center border rounded-md p-2 cursor-pointer transition-all ${
                                selectedChannel?.id === item.channel.id ? 'border-primary' : 'border-border'
                              }`}
                              onClick={() => {
                                setSelectedChannel(item.channel);
                                setSidebarOpen(false);
                              }}
                            >
                              <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex items-center justify-center mr-3">
                                {item.channel.logo ? (
                                  <img 
                                    src={item.channel.logo} 
                                    alt={item.channel.name} 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=No+Logo";
                                    }} 
                                  />
                                ) : (
                                  <Tv className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm line-clamp-1">
                                  {item.channel.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(item.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <div className="ml-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(item.channel);
                                  }}
                                >
                                  <Heart 
                                    className={`h-4 w-4 ${isFavorite(item.channel.id) ? 'fill-primary text-primary' : ''}`} 
                                  />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </Tabs>
              </SheetContent>
            </Sheet>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshPlaylist}
              className="flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          {playlist.allChannels.length} channels in {playlist.categories.length} categories
        </p>
      </header>

      <main className="flex-1 flex flex-col space-y-6">
        <div className="video-section w-full">
          <VideoPlayer 
            channel={selectedChannel} 
            onToggleFavorite={
              selectedChannel ? () => toggleFavorite(selectedChannel) : undefined
            }
            isFavorite={selectedChannel ? isFavorite(selectedChannel.id) : false}
          />
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
            onToggleFavorite={toggleFavorite}
            favoriteChannels={favoriteChannels}
          />
        </div>
      </main>
    </div>
  );
};

const Index = () => (
  <IPTVProvider>
    <IPTVApp />
  </IPTVProvider>
);

export default Index;
