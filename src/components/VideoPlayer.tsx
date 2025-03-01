
import React, { useRef, useEffect } from "react";
import { IPTVChannel } from "@/types/iptv";
// Fix the Button import by importing from the correct location
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Maximize, Play, Pause } from "lucide-react";

interface VideoPlayerProps {
  channel: IPTVChannel | null;
}

const VideoPlayer = ({ channel }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  useEffect(() => {
    if (videoRef.current && channel) {
      videoRef.current.src = channel.url;
      videoRef.current.load();
      
      // Auto-play when channel changes (may be blocked by browser)
      const playPromise = videoRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsError(false);
          })
          .catch(error => {
            console.error("Autoplay prevented:", error);
            setIsPlaying(false);
          });
      }
    }
  }, [channel]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = videoRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(error => {
              console.error("Play prevented:", error);
            });
        }
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleError = () => {
    setIsError(true);
    setIsPlaying(false);
  };

  if (!channel) {
    return (
      <div className="video-container bg-muted flex items-center justify-center animate-fadeIn">
        <div className="text-center p-4">
          <h3 className="text-lg font-medium mb-2">Select a channel to start watching</h3>
          <p className="text-muted-foreground">Choose from the categories and channels below</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group animate-fadeIn">
      <div className="video-container bg-black">
        {isError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-white p-4">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Playback Error</h3>
              <p className="text-sm mb-4">Unable to play this channel. It may be unavailable or requires additional authentication.</p>
              <Button 
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.load();
                    const playPromise = videoRef.current.play();
                    if (playPromise !== undefined) {
                      playPromise
                        .then(() => {
                          setIsPlaying(true);
                          setIsError(false);
                        })
                        .catch(() => {
                          setIsError(true);
                        });
                    }
                  }
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : null}
        <video
          ref={videoRef}
          controls={false}
          className="w-full h-full"
          onError={handleError}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium truncate">{channel.name}</h3>
              <p className="text-white/80 text-sm">{channel.group}</p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={handlePlayPause}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button 
                onClick={toggleMute}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition"
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button 
                onClick={toggleFullscreen}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition"
              >
                <Maximize size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
