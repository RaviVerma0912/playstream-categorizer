
import React, { useRef, useEffect, useState } from "react";
import { IPTVChannel } from "@/types/iptv";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Volume2, VolumeX, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useIPTV } from "@/contexts/IPTVContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VideoPlayerProps {
  channel: IPTVChannel | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const VideoPlayer = ({ channel, isFavorite = false, onToggleFavorite }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { toast } = useToast();
  const { checkChannelStatus } = useIPTV();
  
  useEffect(() => {
    // Reset states when channel changes
    setLoadError(false);
    setIsLoading(true);
    
    // If channel changes, attempt to play the video
    if (channel && videoRef.current) {
      videoRef.current.load();
      
      // Check if the channel is known to be offline
      checkChannelStatus(channel.id).then(isWorking => {
        if (!isWorking) {
          setLoadError(true);
          toast({
            title: "Channel Unavailable",
            description: "This channel appears to be offline. It will be hidden from future searches.",
            variant: "destructive"
          });
        }
      });
      
      // Auto-play when ready
      const playPromise = videoRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Auto-play started successfully');
            setIsLoading(false);
            setLoadError(false);
            
            // If video plays successfully, update channel status to online
            if (channel) {
              supabase
                .from('channels')
                .upsert({
                  id: channel.id,
                  status: 'online',
                  title: channel.name,
                  stream_url: channel.url,
                  thumbnail_url: channel.logo || null
                })
                .then(() => console.log("Channel marked as online"));
            }
          })
          .catch(error => {
            console.error('Auto-play was prevented:', error);
            setIsLoading(false);
            
            // Don't mark as error if it's just autoplay prevention
            if (error.name !== "NotAllowedError") {
              setLoadError(true);
              
              // Mark channel as offline in database
              if (channel) {
                supabase
                  .from('channels')
                  .upsert({
                    id: channel.id,
                    status: 'offline'
                  })
                  .then(() => console.log("Channel marked as offline"));
              }
            }
          });
      }
    }
  }, [channel]);
  
  // Handle video error event
  const handleVideoError = () => {
    setLoadError(true);
    setIsLoading(false);
    
    if (channel) {
      // Mark channel as offline
      supabase
        .from('channels')
        .upsert({
          id: channel.id,
          status: 'offline'
        })
        .then(() => {
          console.log("Channel marked as offline due to video error");
          toast({
            title: "Channel Unavailable",
            description: "This channel appears to be offline. It will be hidden from future searches.",
            variant: "destructive"
          });
        });
    }
  };
  
  if (!channel) {
    return (
      <Card className="w-full aspect-video bg-muted flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium">No Channel Selected</h3>
          <p className="text-muted-foreground text-sm mt-2">
            Select a channel from the list below to start watching
          </p>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="relative w-full">
      <Card className="w-full overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium">Loading channel...</p>
            </div>
          </div>
        )}
        
        {loadError && (
          <div className="absolute inset-0 bg-background/90 flex items-center justify-center z-10">
            <div className="flex flex-col items-center text-center p-6">
              <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">Channel Unavailable</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This channel appears to be offline or the stream is not accessible.
                It will be hidden from future searches.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setLoadError(false);
                  setIsLoading(true);
                  if (videoRef.current) {
                    videoRef.current.load();
                    videoRef.current.play().catch(() => {
                      setLoadError(true);
                      setIsLoading(false);
                    });
                  }
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
        
        <video
          ref={videoRef}
          className="w-full aspect-video bg-black"
          controls
          muted={muted}
          playsInline
          poster={channel.logo || "https://via.placeholder.com/640x360?text=Loading..."}
          onError={handleVideoError}
        >
          <source src={channel.url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </Card>
      
      <div className="flex items-center justify-between mt-3">
        <div className="flex-1">
          <h2 className="font-medium line-clamp-1">{channel.name}</h2>
          <p className="text-xs text-muted-foreground">{channel.group}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMuted(!muted)}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          
          {onToggleFavorite && (
            <Button
              variant={isFavorite ? "default" : "outline"}
              size="icon"
              onClick={onToggleFavorite}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? "fill-primary-foreground" : ""}`} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
