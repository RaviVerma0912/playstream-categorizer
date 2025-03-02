
import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useIPTV } from "@/contexts/IPTVContext";
import VideoPlayer from "@/components/VideoPlayer";
import { Heart, ArrowLeft, Tv } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const Channel = () => {
  const { channelId } = useParams<{ channelId: string }>();
  const { 
    selectedChannel, 
    setSelectedChannel, 
    playlist, 
    toggleFavorite, 
    isFavorite,
    isLoading,
    error
  } = useIPTV();

  useEffect(() => {
    if (channelId && playlist?.allChannels?.length > 0) {
      const channel = playlist.allChannels.find(c => c.id === channelId);
      if (channel) {
        setSelectedChannel(channel);
      }
    }
  }, [channelId, playlist.allChannels, setSelectedChannel]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold">Loading Channel...</h2>
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
        <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
        <p className="text-muted-foreground max-w-md mb-4">{error}</p>
        <Link to="/">
          <Button className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Channels</span>
          </Button>
        </Link>
      </div>
    );
  }

  if (!selectedChannel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="bg-muted p-6 rounded-full mb-4">
          <Tv className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Channel Not Found</h2>
        <p className="text-muted-foreground mb-6">The channel you're looking for doesn't exist or has been removed.</p>
        <Link to="/">
          <Button className="flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Browse Channels</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Find related channels from the same category
  const relatedChannels = selectedChannel.group 
    ? playlist.allChannels.filter(c => c.group === selectedChannel.group && c.id !== selectedChannel.id).slice(0, 8)
    : [];

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-4">
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Channels
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="video-section mb-4">
            <VideoPlayer 
              channel={selectedChannel} 
              onToggleFavorite={() => toggleFavorite(selectedChannel)}
              isFavorite={isFavorite(selectedChannel.id)}
            />
          </div>
          
          <div className="channel-info bg-card rounded-lg border p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold">{selectedChannel.name}</h1>
                <div className="text-sm text-muted-foreground mt-1">
                  Category: {selectedChannel.group}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => toggleFavorite(selectedChannel)}
                className="h-9 w-9"
              >
                <Heart 
                  className={`h-5 w-5 ${isFavorite(selectedChannel.id) ? 'fill-primary text-primary' : ''}`} 
                />
              </Button>
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-card rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold p-4 border-b">Related Channels</h3>
            <ScrollArea className="h-[600px]">
              <div className="p-4">
                {relatedChannels.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {relatedChannels.map(channel => (
                      <Link key={channel.id} to={`/channel/${channel.id}`}>
                        <div className="bg-muted/40 hover:bg-muted transition-colors border rounded-md p-3">
                          <div className="aspect-square rounded overflow-hidden bg-background flex items-center justify-center mb-2">
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
                              <Tv className="h-10 w-10 text-muted-foreground" />
                            )}
                          </div>
                          <p className="font-medium text-sm line-clamp-2 text-center">
                            {channel.name}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No related channels found
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Channel;
