
import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Tv } from "lucide-react";
import { IPTVChannel } from "@/types/iptv";
import { useIPTV } from "@/contexts/IPTVContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SearchBoxProps {
  onSelectChannel: (channel: IPTVChannel) => void;
}

const SearchBox = ({ onSelectChannel }: SearchBoxProps) => {
  const { playlist, isFavorite } = useIPTV();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<IPTVChannel[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recent searches:", e);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (term: string) => {
    if (!term || term.length < 2) return;
    
    const updatedSearches = [
      term,
      ...recentSearches.filter(s => s !== term)
    ].slice(0, 5); // Keep only last 5 searches
    
    setRecentSearches(updatedSearches);
    localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
  };

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
      setIsOpen(term.length > 0); // Keep open to show recent searches
      return;
    }
    
    // Search in all channels
    const results = playlist.allChannels.filter(channel => 
      channel.name.toLowerCase().includes(term.toLowerCase()) ||
      channel.group.toLowerCase().includes(term.toLowerCase())
    ).slice(0, 12); // Show more results
    
    setSearchResults(results);
    setIsOpen(true);
  };

  // Handle channel selection
  const handleSelectChannel = (channel: IPTVChannel) => {
    onSelectChannel(channel);
    setIsOpen(false);
    saveRecentSearch(channel.name);
    setSearchTerm("");
  };

  // Use recent search
  const handleUseRecentSearch = (term: string) => {
    setSearchTerm(term);
    
    // Trigger search with this term
    const results = playlist.allChannels.filter(channel => 
      channel.name.toLowerCase().includes(term.toLowerCase()) ||
      channel.group.toLowerCase().includes(term.toLowerCase())
    ).slice(0, 12);
    
    setSearchResults(results);
    setIsOpen(true);
    
    // Focus the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Clear recent searches
  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setIsOpen(false);
  };

  // Focus the search input
  const focusSearch = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      setIsOpen(true);
    }
  };

  return (
    <div className="relative w-full max-w-md" ref={searchRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search channels by name or category..."
          value={searchTerm}
          onChange={handleSearch}
          onFocus={() => setIsOpen(true)}
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={focusSearch}
            >
              <Search className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg">
          <ScrollArea className="max-h-[400px]">
            {searchResults.length > 0 ? (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {searchResults.length} channel{searchResults.length !== 1 ? 's' : ''} found
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
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
                          className="w-10 h-10 mr-3 rounded object-contain bg-background/50"
                          onError={e => {
                            (e.target as HTMLImageElement).src = "https://via.placeholder.com/80?text=No+Logo";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 mr-3 bg-muted flex items-center justify-center rounded">
                          <Tv className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{channel.name}</p>
                        <div className="flex items-center mt-1">
                          <Badge variant="outline" className="text-xs">
                            {channel.group}
                          </Badge>
                          {isFavorite(channel.id) && (
                            <Badge className="ml-1 text-xs">Favorite</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : searchTerm.length > 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">No channels found for "{searchTerm}"</p>
              </div>
            ) : recentSearches.length > 0 ? (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-xs font-medium text-muted-foreground">Recent Searches</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 text-xs"
                    onClick={clearRecentSearches}
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 p-2">
                  {recentSearches.map((term, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleUseRecentSearch(term)}
                    >
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default SearchBox;
