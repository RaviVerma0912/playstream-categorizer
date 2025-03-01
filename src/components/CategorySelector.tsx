
import React from "react";
import { IPTVCategory } from "@/types/iptv";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface CategorySelectorProps {
  categories: IPTVCategory[];
  selectedCategory: IPTVCategory | null;
  onSelectCategory: (category: IPTVCategory) => void;
}

const CategorySelector = ({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: CategorySelectorProps) => {
  return (
    <div className="w-full mb-6">
      <h2 className="text-lg font-semibold mb-3">Categories</h2>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-2 pb-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory?.id === category.id ? "default" : "outline"}
              onClick={() => onSelectCategory(category)}
              className="transition-all duration-300 animate-fadeIn"
            >
              {category.name}
              <span className="ml-2 text-xs bg-muted-foreground/20 text-muted-foreground rounded-full px-2 py-0.5">
                {category.channels.length}
              </span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default CategorySelector;
