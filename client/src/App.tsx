
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Play, Trash2, Settings, Database, RefreshCw, Activity } from 'lucide-react';
import type { Connector, CreateConnectorInput, SyncResponse } from '../../server/src/schema';

function App() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [configEditMode, setConfigEditMode] = useState(false);
  const [syncingConnectors, setSyncingConnectors] = useState<Set<number>>(new Set());

  // Form state for adding new connector
  const [formData, setFormData] = useState<CreateConnectorInput>({
    connector_name: '',
    source_tap: '',
    target: '',
    configuration: {}
  });

  // Configuration editing state
  const [configJson, setConfigJson] = useState('');

  const loadConnectors = useCallback(async () => {
    try {
      const result = await trpc.getConnectors.query();
      setConnectors(result);
    } catch {
      console.error('Failed to load connectors');
    }
  }, []);

  useEffect(() => {
    loadConnectors();
  }, [loadConnectors]);

  const handleAddConnector = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      let parsedConfig = {};
      if (configJson.trim()) {
        try {
          parsedConfig = JSON.parse(configJson);
        } catch {
          alert('Invalid JSON configuration');
          setIsLoading(false);
          return;
        }
      }

      const response = await trpc.createConnector.mutate({
        ...formData,
        configuration: parsedConfig
      });

      setConnectors((prev: Connector[]) => [...prev, response]);
      setFormData({
        connector_name: '',
        source_tap: '',
        target: '',
        configuration: {}
      });
      setConfigJson('');
      setIsAddDialogOpen(false);
    } catch {
      console.error('Failed to create connector');
      alert('Failed to create connector');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConnector = async (id: number) => {
    try {
      await trpc.deleteConnector.mutate({ id });
      setConnectors((prev: Connector[]) => prev.filter(c => c.id !== id));
    } catch {
      console.error('Failed to delete connector');
      alert('Failed to delete connector');
    }
  };

  const handleTriggerSync = async (id: number) => {
    setSyncingConnectors((prev: Set<number>) => new Set(prev).add(id));
    try {
      const response: SyncResponse = await trpc.triggerSync.mutate({ id });
      if (response.success) {
        // Refresh connectors to get updated status
        await loadConnectors();
        alert('Sync triggered successfully!');
      } else {
        alert(`Sync failed: ${response.message}`);
      }
    } catch {
      console.error('Failed to trigger sync');
      alert('Failed to trigger sync');
    } finally {
      setSyncingConnectors((prev: Set<number>) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const openConfigDialog = (connector: Connector) => {
    setSelectedConnector(connector);
    setConfigJson(JSON.stringify(connector.configuration, null, 2));
    setConfigEditMode(false);
    setIsConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedConnector) return;
    
    try {
      const parsedConfig = JSON.parse(configJson);
      await trpc.updateConnector.mutate({
        id: selectedConnector.id,
        configuration: parsedConfig
      });
      
      // Update local state
      setConnectors((prev: Connector[]) => 
        prev.map(c => c.id === selectedConnector.id 
          ? { ...c, configuration: parsedConfig }
          : c
        )
      );
      
      setConfigEditMode(false);
      alert('Configuration updated successfully!');
    } catch {
      console.error('Failed to update configuration');
      alert('Failed to update configuration. Please check JSON format.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'success': 'bg-green-100 text-green-800 border-green-200',
      'failure': 'bg-red-100 text-red-800 border-red-200',
      'running': 'bg-blue-100 text-blue-800 border-blue-200',
      'not run yet': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors['not run yet']}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 p-6 border-b border-gray-200">
          <Database className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Meltano ETL</h1>
            <p className="text-sm text-gray-500">Connector Management</p>
          </div>
        </div>
        
        <nav className="p-4 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md">
            <Activity className="h-4 w-4" />
            Connectors
          </div>
          
          <div className="px-3 py-2 text-sm text-gray-600">
            Total: {connectors.length}
          </div>
          <div className="px-3 py-2 text-sm text-gray-600">
            Running: {connectors.filter(c => c.last_run_status === 'running').length}
          </div>
          <div className="px-3 py-2 text-sm text-gray-600">
            Success: {connectors.filter(c => c.last_run_status === 'success').length}
          </div>
          <div className="px-3 py-2 text-sm text-gray-600">
            Failures: {connectors.filter(c => c.last_run_status === 'failure').length}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">ETL Connectors</h2>
              <p className="text-gray-600 mt-1">Manage your Meltano data pipeline connectors</p>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Connector
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Connector</DialogTitle>
                  <DialogDescription>
                    Configure a new ETL connector for your data pipeline
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleAddConnector} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="connector_name">Connector Name</Label>
                      <Input
                        id="connector_name"
                        placeholder="e.g., github-to-postgres"
                        value={formData.connector_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateConnectorInput) => ({ ...prev, connector_name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="source_tap">Source Tap</Label>
                      <Input
                        id="source_tap"
                        placeholder="e.g., tap-github"
                        value={formData.source_tap}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateConnectorInput) => ({ ...prev, source_tap: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="target">Target</Label>
                    <Input
                      id="target"
                      placeholder="e.g., target-postgres"
                      value={formData.target}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateConnectorInput) => ({ ...prev, target: e.target.value }))
                      }
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="configuration">Configuration (JSON)</Label>
                    <Textarea
                      id="configuration"
                      placeholder='{"api_key": "your-key", "repo": "owner/repo"}'
                      value={configJson}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfigJson(e.target.value)}
                      rows={6}
                      className="font-mono"
                    />
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                      {isLoading ? 'Creating...' : 'Create Connector'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Connectors Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Active Connectors
              </CardTitle>
              <CardDescription>
                Monitor and manage your ETL data pipeline connectors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectors.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No connectors configured yet</p>
                  <Button onClick={() => setIsAddDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Connector
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Connector Name</TableHead>
                      <TableHead>Source → Target</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connectors.map((connector: Connector) => (
                      <TableRow key={connector.id}>
                        <TableCell>
                          <div className="font-medium">{connector.connector_name}</div>
                          <div className="text-sm text-gray-500">ID: {connector.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{connector.source_tap}</Badge>
                            <span className="text-gray-400">→</span>
                            <Badge variant="outline">{connector.target}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(connector.last_run_status)}
                        </TableCell>
                        <TableCell>
                          {connector.last_run_timestamp ? (
                            <div>
                              <div className="text-sm">
                                {connector.last_run_timestamp.toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {connector.last_run_timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Never</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openConfigDialog(connector)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTriggerSync(connector.id)}
                              disabled={syncingConnectors.has(connector.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              {syncingConnectors.has(connector.id) ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
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
                                    onClick={() => handleDeleteConnector(connector.id)}
                                    className="bg-red-600 hover:bg-red-700"
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Connector Configuration
            </DialogTitle>
            <DialogDescription>
              {selectedConnector?.connector_name} configuration
            </DialogDescription>
          </DialogHeader>
          
          {selectedConnector && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Source Tap</Label>
                  <p className="text-sm text-gray-900">{selectedConnector.source_tap}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Target</Label>
                  <p className="text-sm text-gray-900">{selectedConnector.target}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedConnector.last_run_status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Last Run</Label>
                  <p className="text-sm text-gray-900">
                    {selectedConnector.last_run_timestamp 
                      ? selectedConnector.last_run_timestamp.toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Configuration JSON</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfigEditMode(!configEditMode)}
                  >
                    {configEditMode ? 'Cancel Edit' : 'Edit'}
                  </Button>
                </div>
                
                <Textarea
                  value={configJson}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setConfigJson(e.target.value)}
                  readOnly={!configEditMode}
                  rows={12}
                  className={`font-mono text-sm ${configEditMode ? 'bg-white' : 'bg-gray-50'}`}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
              Close
            </Button>
            {configEditMode && (
              <Button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-700">
                Save Configuration
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
