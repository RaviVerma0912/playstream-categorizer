
import React, { useRef, useEffect } from "react";
import { IPTVChannel } from "@/types/iptv";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Volume2, VolumeX } from "lucide-react";

interface VideoPlayerProps {
  channel: IPTVChannel | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const VideoPlayer = ({ channel, isFavorite = false, onToggleFavorite }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = React.useState(true);
  
  useEffect(() => {
    // If channel changes, attempt to play the video
    if (channel && videoRef.current) {
      videoRef.current.load();
      
      // Auto-play when ready
      const playPromise = videoRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Auto-play started successfully');
          })
          .catch(error => {
            console.error('Auto-play was prevented:', error);
          });
      }
    }
  }, [channel]);
  
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
        <video
          ref={videoRef}
          className="w-full aspect-video bg-black"
          controls
          muted={muted}
          playsInline
          poster={channel.logo || "https://via.placeholder.com/640x360?text=Loading..."}
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
