
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Plus, Play, Trash2, Database, Settings, Activity, Eye } from 'lucide-react';
import type { Connector, CreateConnectorInput, RunStatus } from '../../server/src/schema';

function App() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConfigSheetOpen, setIsConfigSheetOpen] = useState(false);
  const [syncingConnectors, setSyncingConnectors] = useState<Set<number>>(new Set());

  const [formData, setFormData] = useState<CreateConnectorInput>({
    connector_name: '',
    source_tap: '',
    target: '',
    configuration: {}
  });

  const [configText, setConfigText] = useState('{}');

  const loadConnectors = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getConnectors.query();
      setConnectors(result);
    } catch (error) {
      console.error('Failed to load connectors:', error);
      toast.error('Failed to load connectors');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnectors();
  }, [loadConnectors]);

  const handleCreateConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(configText);
      } catch {
        toast.error('Invalid JSON configuration');
        return;
      }

      const connectorData = { ...formData, configuration: parsedConfig };
      const newConnector = await trpc.createConnector.mutate(connectorData);
      setConnectors((prev: Connector[]) => [...prev, newConnector]);
      setFormData({
        connector_name: '',
        source_tap: '',
        target: '',
        configuration: {}
      });
      setConfigText('{}');
      setIsCreateDialogOpen(false);
      toast.success('Connector created successfully');
    } catch (error) {
      console.error('Failed to create connector:', error);
      toast.error('Failed to create connector');
    }
  };

  const handleDeleteConnector = async (id: number) => {
    try {
      await trpc.deleteConnector.mutate({ id });
      setConnectors((prev: Connector[]) => prev.filter((c) => c.id !== id));
      toast.success('Connector deleted successfully');
    } catch (error) {
      console.error('Failed to delete connector:', error);
      toast.error('Failed to delete connector');
    }
  };

  const handleTriggerSync = async (id: number) => {
    try {
      setSyncingConnectors((prev) => new Set(prev).add(id));
      const result = await trpc.triggerSync.mutate({ id });
      
      if (result.success) {
        toast.success(result.message);
        // Refresh connectors to get updated status
        await loadConnectors();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      toast.error('Failed to trigger sync');
    } finally {
      setSyncingConnectors((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const viewConnectorConfig = (connector: Connector) => {
    setSelectedConnector(connector);
    setIsConfigSheetOpen(true);
  };

  const getStatusBadgeVariant = (status: RunStatus) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'failure':
        return 'destructive';
      case 'running':
        return 'secondary';
      case 'not run yet':
        return 'outline';
      default:
        return 'outline';
    }
  };

  

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r">
        <div className="p-6">
          <div className="flex items-center space-x-2">
            <Database className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Meltano ETL</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">Connector Management</p>
        </div>
        
        <nav className="mt-6">
          <div className="px-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Connectors</span>
            </div>
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Activity className="h-4 w-4" />
            <span>{connectors.length} Connectors</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">ETL Connectors</h2>
              <p className="text-sm text-gray-600">Manage your Meltano data pipeline connectors</p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Connector
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Connector</DialogTitle>
                  <DialogDescription>
                    Set up a new ETL connector for your data pipeline.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateConnector}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="connector_name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="connector_name"
                        value={formData.connector_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateConnectorInput) => ({ ...prev, connector_name: e.target.value }))
                        }
                        className="col-span-3"
                        placeholder="my-github-connector"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="source_tap" className="text-right">
                        Source Tap
                      </Label>
                      <Input
                        id="source_tap"
                        value={formData.source_tap}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateConnectorInput) => ({ ...prev, source_tap: e.target.value }))
                        }
                        className="col-span-3"
                        placeholder="tap-github"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="target" className="text-right">
                        Target
                      </Label>
                      <Input
                        id="target"
                        value={formData.target}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateConnectorInput) => ({ ...prev, target: e.target.value }))
                        }
                        className="col-span-3"
                        placeholder="target-postgres"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label htmlFor="configuration" className="text-right pt-2">
                        Configuration
                      </Label>
                      <div className="col-span-3">
                        <Textarea
                          id="configuration"
                          value={configText}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setConfigText(e.target.value)
                          }
                          placeholder='{"api_token": "your-token", "repository": "org/repo"}'
                          className="min-h-[100px] font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Enter configuration as valid JSON
                        </p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                      Create Connector
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading connectors...</p>
              </div>
            </div>
          ) : connectors.length === 0 ? (
            <Card className="border-dashed border-2 border-gray-300">
              <CardHeader className="text-center pb-6">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-gray-400" />
                </div>
                <CardTitle className="text-xl text-gray-600">No connectors yet</CardTitle>
                <CardDescription>
                  Get started by creating your first ETL connector
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Connector
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Connectors</CardTitle>
                <CardDescription>
                  Manage your ETL data pipeline connectors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Source → Target</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connectors.map((connector: Connector) => (
                      <TableRow key={connector.id}>
                        <TableCell className="font-medium">
                          {connector.connector_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {connector.source_tap}
                            </code>
                            <span>→</span>
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {connector.target}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(connector.last_run_status)}>
                            {connector.last_run_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {connector.last_run_timestamp ? (
                            <div className="text-sm">
                              <div>{connector.last_run_timestamp.toLocaleDateString()}</div>
                              <div className="text-gray-500">
                                {connector.last_run_timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewConnectorConfig(connector)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTriggerSync(connector.id)}
                              disabled={syncingConnectors.has(connector.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Connector</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{connector.connector_name}"? 
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleDeleteConnector(connector.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      {/* Configuration Sheet */}
      <Sheet open={isConfigSheetOpen} onOpenChange={setIsConfigSheetOpen}>
        <SheetContent className="w-[1000px] sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Connector Configuration</SheetTitle>
            <SheetDescription>
              {selectedConnector?.connector_name} - View configuration details
            </SheetDescription>
          </SheetHeader>
          {selectedConnector && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Connector Name</Label>
                  <p className="mt-1 text-sm">{selectedConnector.connector_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusBadgeVariant(selectedConnector.last_run_status)}>
                      {selectedConnector.last_run_status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Source Tap</Label>
                  <code className="mt-1 block bg-gray-100 px-2 py-1 rounded text-xs">
                    {selectedConnector.source_tap}
                  </code>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Target</Label>
                  <code className="mt-1 block bg-gray-100 px-2 py-1 rounded text-xs">
                    {selectedConnector.target}
                  </code>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Configuration</Label>
                <ScrollArea className="mt-2 h-[500px] w-full border rounded-md">
                  <pre className="p-4 text-xs">
                    {JSON.stringify(selectedConnector.configuration, null, 2)}
                  </pre>
                </ScrollArea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Created</Label>
                  <p className="mt-1 text-sm">
                    {selectedConnector.created_at.toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Updated</Label>
                  <p className="mt-1 text-sm">
                    {selectedConnector.updated_at.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default App;
