
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trash2, 
  Plus, 
  Save, 
  RefreshCw, 
  ArrowLeft,
  Upload,
  List
} from "lucide-react";
import { addPlaylistUrl, updatePlaylistUrl, deletePlaylistUrl, getPlaylistUrls, fetchPlaylist, bulkAddPlaylistUrls } from "@/services/iptvService";
import { PlaylistUrl } from "@/types/iptv";
import { Link } from "react-router-dom";

const Admin = () => {
  const [playlistUrls, setPlaylistUrls] = useState<PlaylistUrl[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newName, setNewName] = useState("");
  const [newPriority, setNewPriority] = useState(10);
  const [bulkUrls, setBulkUrls] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const { toast } = useToast();

  const loadPlaylistUrls = async () => {
    setIsLoading(true);
    const data = await getPlaylistUrls();
    setPlaylistUrls(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadPlaylistUrls();
  }, []);

  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || !newName) {
      toast({
        title: "Error",
        description: "URL and name are required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    const success = await addPlaylistUrl(newUrl, newName, newPriority);
    setIsLoading(false);

    if (success) {
      toast({
        title: "Success",
        description: "Playlist URL added successfully",
      });
      setNewUrl("");
      setNewName("");
      setNewPriority(10);
      loadPlaylistUrls();
    } else {
      toast({
        title: "Error",
        description: "Failed to add playlist URL",
        variant: "destructive"
      });
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkUrls.trim()) {
      toast({
        title: "Error",
        description: "Please enter at least one URL",
        variant: "destructive"
      });
      return;
    }

    const urls = bulkUrls.split('\n').filter(url => url.trim() !== '');
    
    if (urls.length === 0) {
      toast({
        title: "Error",
        description: "No valid URLs found",
        variant: "destructive"
      });
      return;
    }

    setIsBulkLoading(true);
    const { success, failed } = await bulkAddPlaylistUrls(urls);
    setIsBulkLoading(false);

    if (success > 0) {
      toast({
        title: "Success",
        description: `Added ${success} playlist URLs successfully${failed > 0 ? `, ${failed} failed` : ''}`,
      });
      setBulkUrls("");
      loadPlaylistUrls();
    } else {
      toast({
        title: "Error",
        description: "Failed to add any playlist URLs",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const success = await updatePlaylistUrl(id, { active: !currentActive });

    if (success) {
      setPlaylistUrls(prev => 
        prev.map(url => url.id === id ? { ...url, active: !currentActive } : url)
      );
      toast({
        title: "Success",
        description: `Playlist ${!currentActive ? 'activated' : 'deactivated'} successfully`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update playlist status",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUrl = async (id: string) => {
    if (!confirm("Are you sure you want to delete this playlist URL?")) {
      return;
    }

    const success = await deletePlaylistUrl(id);

    if (success) {
      setPlaylistUrls(prev => prev.filter(url => url.id !== id));
      toast({
        title: "Success",
        description: "Playlist URL deleted successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete playlist URL",
        variant: "destructive"
      });
    }
  };

  const handleRefreshPlaylists = async () => {
    setIsRefreshing(true);
    toast({
      title: "Refreshing",
      description: "Fetching latest playlist data...",
    });

    try {
      await fetchPlaylist();
      toast({
        title: "Success",
        description: "Playlist data refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh playlist data",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">IPTV Admin Panel</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshPlaylists} 
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh Playlists
          </Button>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to App
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="single" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="single" className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add Single Playlist
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="single">
          <Card>
            <CardHeader>
              <CardTitle>Add New Playlist URL</CardTitle>
              <CardDescription>Add a new M3U playlist URL to fetch IPTV channels</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUrl} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="My IPTV List"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority (lower loads first)</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="100"
                      value={newPriority}
                      onChange={(e) => setNewPriority(parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Playlist URL (M3U format)</Label>
                  <Input
                    id="url"
                    placeholder="https://example.com/playlist.m3u"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    required
                  />
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleAddUrl} 
                disabled={isLoading || !newUrl || !newName}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Playlist
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Upload Playlists</CardTitle>
              <CardDescription>
                Add multiple M3U playlist URLs at once, one URL per line
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkUrls">Playlist URLs (one per line)</Label>
                  <Textarea
                    id="bulkUrls"
                    placeholder="https://example.com/playlist1.m3u&#10;https://example.com/playlist2.m3u&#10;https://example.com/playlist3.m3u"
                    value={bulkUrls}
                    onChange={(e) => setBulkUrls(e.target.value)}
                    rows={8}
                    className="resize-y"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Tip: Enter one URL per line. URLs will be assigned sequential names (Playlist 1, Playlist 2, etc.).
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleBulkUpload} 
                disabled={isBulkLoading || !bulkUrls.trim()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isBulkLoading ? 'Uploading...' : 'Upload All Playlists'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Manage Playlist URLs</CardTitle>
          <CardDescription>Control which playlist URLs are active and their loading priority</CardDescription>
        </CardHeader>
        <CardContent>
          {playlistUrls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {isLoading ? "Loading playlist URLs..." : "No playlist URLs found. Add one above."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-[100px]">Priority</TableHead>
                  <TableHead className="w-[100px]">Active</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playlistUrls.map((playlist) => (
                  <TableRow key={playlist.id}>
                    <TableCell className="font-medium">{playlist.name}</TableCell>
                    <TableCell className="text-xs truncate max-w-[200px]">
                      {playlist.url}
                    </TableCell>
                    <TableCell>{playlist.priority}</TableCell>
                    <TableCell>
                      <Switch
                        checked={playlist.active}
                        onCheckedChange={() => handleToggleActive(playlist.id, playlist.active)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUrl(playlist.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;
