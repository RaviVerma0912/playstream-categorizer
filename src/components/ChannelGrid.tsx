
import React from "react";
import { IPTVChannel, IPTVCategory } from "@/types/iptv";
import ChannelCard from "./ChannelCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChannelGridProps {
  category: IPTVCategory | null;
  selectedChannel: IPTVChannel | null;
  onSelectChannel: (channel: IPTVChannel) => void;
}

const ChannelGrid = ({ 
  category, 
  selectedChannel, 
  onSelectChannel 
}: ChannelGridProps) => {
  if (!category) {
    return (
      <div className="text-center p-8 bg-muted/30 rounded-lg animate-fadeIn">
        <p>No category selected</p>
      </div>
    );
  }

  return (
    <div className="w-full animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{category.name} Channels</h2>
        <span className="text-sm text-muted-foreground">
          {category.channels.length} channels
        </span>
      </div>
      
      <ScrollArea className="h-[calc(100vh-400px)] pr-4">
        <div className="channel-grid pb-4">
          {category.channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isActive={selectedChannel?.id === channel.id}
              onClick={() => onSelectChannel(channel)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChannelGrid;
