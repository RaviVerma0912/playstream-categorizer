
import { IPTVChannel } from "@/types/iptv";
import { supabase } from "@/integrations/supabase/client";

const TIMEOUT_MS = 8000; // 8 seconds timeout for testing a channel

/**
 * Tests if a channel is working by attempting to load its stream
 * @param channel Channel to test
 * @returns Promise resolving to true if channel works, false otherwise
 */
export async function testChannel(channel: IPTVChannel): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.style.display = 'none';
    document.body.appendChild(video);
    
    // Set timeout to detect if channel doesn't load
    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, TIMEOUT_MS);
    
    // Set up event handlers
    video.onloadeddata = () => {
      cleanup();
      resolve(true);
    };
    
    video.onerror = () => {
      cleanup();
      resolve(false);
    };
    
    // Clean up function
    const cleanup = () => {
      clearTimeout(timeout);
      video.pause();
      video.src = "";
      video.remove();
    };
    
    // Start loading the video
    video.src = channel.url;
    video.load();
  });
}

/**
 * Update a channel's status in Supabase
 * @param channelId Channel ID
 * @param isWorking Whether the channel is working
 */
export async function updateChannelStatus(channelId: string, isWorking: boolean, channel: IPTVChannel): Promise<void> {
  try {
    await supabase
      .from('channels')
      .upsert({
        id: channelId,
        status: isWorking ? 'online' : 'offline',
        title: channel.name,
        stream_url: channel.url,
        thumbnail_url: channel.logo || null
      }, {
        onConflict: 'id'
      });
  } catch (error) {
    console.error("Error updating channel status:", error);
  }
}

/**
 * Batch test multiple channels and update their status
 * @param channels Array of channels to test
 * @param onProgress Optional callback to report progress
 */
export async function batchTestChannels(
  channels: IPTVChannel[], 
  onProgress?: (tested: number, total: number) => void
): Promise<void> {
  const total = channels.length;
  let tested = 0;
  
  // Test channels in batches of 3 to avoid overwhelming the browser
  const batchSize = 3;
  for (let i = 0; i < total; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (channel) => {
      const isWorking = await testChannel(channel);
      await updateChannelStatus(channel.id, isWorking, channel);
      
      tested++;
      if (onProgress) {
        onProgress(tested, total);
      }
    }));
  }
}
