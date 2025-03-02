
import React from "react";
import { IPTVChannel, IPTVCategory } from "@/types/iptv";
import ChannelCard from "./ChannelCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";

interface ChannelGridProps {
  category: IPTVCategory | null;
  selectedChannel: IPTVChannel | null;
  onSelectChannel: (channel: IPTVChannel) => void;
  onToggleFavorite?: (channel: IPTVChannel) => void;
  favoriteChannels?: IPTVChannel[];
  linkToChannel?: boolean;
}

const ChannelGrid = ({ 
  category, 
  selectedChannel, 
  onSelectChannel,
  onToggleFavorite,
  favoriteChannels = [],
  linkToChannel = false
}: ChannelGridProps) => {
  if (!category) {
    return (
      <div className="text-center p-8 bg-muted/30 rounded-lg animate-fadeIn">
        <p>No category selected</p>
      </div>
    );
  }

  const renderChannelCard = (channel: IPTVChannel) => {
    const card = (
      <ChannelCard
        key={channel.id}
        channel={channel}
        isActive={selectedChannel?.id === channel.id}
        onClick={() => onSelectChannel(channel)}
        isFavorite={favoriteChannels.some(c => c.id === channel.id)}
        onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(channel) : undefined}
      />
    );

    if (linkToChannel) {
      return (
        <Link key={channel.id} to={`/channel/${channel.id}`} className="block">
          {card}
        </Link>
      );
    }

    return card;
  };

  return (
    <div className="w-full animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{category.name} Channels</h2>
        <span className="text-sm text-muted-foreground">
          {category.channels.length} channels
        </span>
      </div>
      
      <ScrollArea className="h-[calc(100vh-250px)] pr-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-4">
          {category.channels.map((channel) => renderChannelCard(channel))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChannelGrid;
