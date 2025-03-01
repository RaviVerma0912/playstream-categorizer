
import React from "react";
import { IPTVChannel } from "@/types/iptv";
import { Card, CardContent } from "@/components/ui/card";
import { Tv } from "lucide-react";

interface ChannelCardProps {
  channel: IPTVChannel;
  isActive: boolean;
  onClick: () => void;
}

const ChannelCard = ({ channel, isActive, onClick }: ChannelCardProps) => {
  return (
    <Card 
      className={`channel-card cursor-pointer h-full transition-all ${
        isActive 
          ? "border-primary border-2 shadow-md" 
          : "hover:shadow-lg"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3 flex flex-col items-center justify-center h-full">
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
