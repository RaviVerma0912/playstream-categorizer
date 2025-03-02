
import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { IPTVChannel } from "@/types/iptv";
import { useIPTV } from "@/contexts/IPTVContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchBoxProps {
  onSelectChannel: (channel: IPTVChannel) => void;
}

const SearchBox = ({ onSelectChannel }: SearchBoxProps) => {
  const { playlist } = useIPTV();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<IPTVChannel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle search input changes
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term.length < 2) {
      setSearchResults([]);
      setIsOpen(false);
      return;
    }
    
    // Search in all channels
    const results = playlist.allChannels.filter(channel => 
      channel.name.toLowerCase().includes(term.toLowerCase())
    ).slice(0, 8); // Limit to 8 results
    
    setSearchResults(results);
    setIsOpen(results.length > 0);
  };

  // Handle channel selection
  const handleSelectChannel = (channel: IPTVChannel) => {
    onSelectChannel(channel);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <Input
          type="text"
          placeholder="Search channels..."
          value={searchTerm}
          onChange={handleSearch}
          className="pr-10"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {searchTerm ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <Search className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {isOpen && searchResults.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
          <ScrollArea className="max-h-[300px]">
            <div className="p-2">
              {searchResults.map(channel => (
                <div
                  key={channel.id}
                  className="flex items-center p-2 hover:bg-muted rounded-md cursor-pointer"
                  onClick={() => handleSelectChannel(channel)}
                >
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt=""
                      className="w-8 h-8 mr-2 rounded"
                      onError={e => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/80?text=No+Logo";
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 mr-2 bg-muted flex items-center justify-center rounded">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium line-clamp-1">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">{channel.group}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default SearchBox;
