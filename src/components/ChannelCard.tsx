
import React from "react";
import { IPTVChannel } from "@/types/iptv";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tv, Heart } from "lucide-react";

interface ChannelCardProps {
  channel: IPTVChannel;
  isActive: boolean;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const ChannelCard = ({ 
  channel, 
  isActive, 
  onClick,
  isFavorite = false,
  onToggleFavorite
}: ChannelCardProps) => {
  return (
    <Card 
      className={`channel-card cursor-pointer h-full transition-all ${
        isActive 
          ? "border-primary border-2 shadow-md" 
          : "hover:shadow-lg"
      }`}
    >
      <CardContent className="p-3 flex flex-col items-center justify-center h-full relative" onClick={onClick}>
        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-primary text-primary" : ""}`} />
          </Button>
        )}
        
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
            <div className="w-full h-full flex items-center justify-center bg-accent">
              <Tv className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="text-center mt-2">
          <p className="font-medium text-sm line-clamp-2">{channel.name}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChannelCard;
