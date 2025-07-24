import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Download, Bot, Wand2, Trash2, Upload } from "lucide-react";
import { everArtApi } from "@/lib/everart-api";
import { useToast } from "@/hooks/use-toast";

export default function ModelsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['/api/models'],
    queryFn: everArtApi.getModels,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const response = await fetch(`/api/models/${modelId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete model');
      }
      return response.json();
    },
    onSuccess: () => {
      // Force refresh the models list
      queryClient.invalidateQueries({ queryKey: ['/api/models'] });
      refetch();
      toast({
        title: "Model odebrán",
        description: "Model byl úspěšně odebrán z aplikace"
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Nepodařilo se odebrat model",
        variant: "destructive"
      });
    }
  });

  const models = data?.models || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "READY": return "bg-green-100 text-green-800";
      case "TRAINING": return "bg-yellow-100 text-yellow-800";
      case "FAILED": return "bg-red-100 text-red-800";
      case "CANCELED": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleUseModel = (modelId: string) => {
    // Switch to apply tab and pre-select this model
    toast({
      title: "Model vybrán",
      description: "Přepínám na záložku 'Použít model'"
    });
  };

  const handleDownloadThumbnail = async (model: any) => {
    if (!model.thumbnailUrl) {
      toast({
        title: "Chyba",
        description: "Náhled není k dispozici",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(model.thumbnailUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${model.name}-thumbnail.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se stáhnout náhled",
        variant: "destructive"
      });
    }
  };

  const handleDeleteModel = (modelId: string, modelName: string) => {
    if (confirm(`Opravdu chcete odebrat model "${modelName}" z aplikace? Model zůstane v EverArt.`)) {
      deleteModelMutation.mutate(modelId);
    }
  };

  // Automatická synchronizace při načtení (včetně localStorage dat)
  const syncCloudinaryMutation = useMutation({
    mutationFn: async () => {
      // Get localStorage data to sync as well
      const localStorageData = JSON.parse(localStorage.getItem('everart_generations') || '[]');
      const applyModelData = JSON.parse(localStorage.getItem('apply_model_state') || '{}');
      
      // Extrahuj URL obrázků z apply model state
      const applyModelResults: any[] = [];
      if (applyModelData.instances && Array.isArray(applyModelData.instances)) {
        applyModelData.instances.forEach((instance: any, idx: number) => {
          if (instance.results && Array.isArray(instance.results)) {
            instance.results.forEach((result: any, resultIdx: number) => {
              if (result.resultUrl && !result.resultUrl.includes('cloudinary.com')) {
                applyModelResults.push({
                  id: `apply-model-${idx}-${resultIdx}-${Date.now()}`,
                  outputImageUrl: result.resultUrl,
                  inputImageUrl: result.originalUrl || '',
                  modelId: instance.selectedModel?.everartId || 'unknown',
                  createdAt: new Date().toISOString()
                });
              }
            });
          }
        });
      }
      
      // Kombinuj všechna data pro synchronizaci
      const allLocalData = [...localStorageData, ...applyModelResults];
      
      const response = await fetch(`/api/generations/sync-cloudinary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ localStorageData: allLocalData })
      });
      if (!response.ok) {
        throw new Error('Failed to sync with Cloudinary');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.synced > 0) {
        console.log(`Automaticky synchronizováno ${data.synced} obrázků s Cloudinary`);
        toast({
          title: "Synchronizace dokončena",
          description: `Synchronizováno ${data.synced} obrázků do Cloudinary`
        });
      }
    },
    onError: (error) => {
      console.warn('Automatická synchronizace s Cloudinary selhala:', error);
    }
  });

  // Spustit automatickou synchronizaci při prvním načtení
  useEffect(() => {
    // Spustit synchronizaci vždy při načtení stránky
    const timer = setTimeout(() => {
      // Aktivně načteme existující localStorage data
      const existingLocalData = JSON.parse(localStorage.getItem('everart_generations') || '[]');
      const applyModelData = JSON.parse(localStorage.getItem('apply_model_state') || '{}');
      
      console.log(`Spouštím synchronizaci s ${existingLocalData.length} existujícími generacemi v localStorage`);
      console.log('Apply model state:', applyModelData);
      
      // Extrahuj URL obrázků z apply model state
      const applyModelResults: any[] = [];
      if (applyModelData.instances && Array.isArray(applyModelData.instances)) {
        applyModelData.instances.forEach((instance: any, idx: number) => {
          if (instance.results && Array.isArray(instance.results)) {
            instance.results.forEach((result: any, resultIdx: number) => {
              if (result.resultUrl) {
                applyModelResults.push({
                  id: `apply-model-${idx}-${resultIdx}-${Date.now()}`,
                  outputImageUrl: result.resultUrl,
                  inputImageUrl: result.originalUrl || '',
                  modelId: instance.selectedModel?.everartId || 'unknown',
                  createdAt: new Date().toISOString()
                });
              }
            });
          }
        });
      }
      
      console.log(`Nalezeno ${applyModelResults.length} výsledků z apply model state`);
      
      // Kombinuj všechna data pro synchronizaci
      const allLocalData = [...existingLocalData, ...applyModelResults];
      console.log(`Celkem ${allLocalData.length} obrázků k synchronizaci`);
      
      syncCloudinaryMutation.mutate();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-red-600 mb-4">Chyba při načítání modelů</p>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Zkusit znovu
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Dostupné modely</h2>
        <Button 
          onClick={() => refetch()} 
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Aktualizovat
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full rounded-t-lg" />
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-2" />
                <Skeleton className="h-3 w-1/3 mb-4" />
                <div className="flex space-x-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : models.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Žádné modely nebyly nalezeny</h3>
              <p className="text-muted-foreground mb-4">
                Váš EverArt účet je prázdný nebo se API klíč nepřipojuje správně.<br/>
                Začněte vytvořením vašeho prvního AI modelu nebo zkontrolujte API klíč.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Zkusit znovu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
          {models.map((model) => (
            <Card key={model.id} className="hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-muted">
                {model.thumbnailUrl ? (
                  <img 
                    src={model.thumbnailUrl} 
                    alt="Model thumbnail" 
                    className="w-full h-full object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Bot className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{model.name}</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteModel(model.everartId, model.name);
                      }}
                      disabled={deleteModelMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Badge className={getStatusColor(model.status)}>
                    {model.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  ID: {model.everartId}
                </p>
                <p className="text-xs text-muted-foreground">
                  Typ: {model.subject}
                </p>
                <div className="mt-4 flex space-x-1">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    disabled={model.status !== "READY"}
                    onClick={() => handleUseModel(model.everartId)}
                  >
                    {model.status === "TRAINING" ? "Trénování..." : 
                     model.status === "READY" ? "Použít" : "Nedostupný"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDownloadThumbnail(model)}
                    disabled={!model.thumbnailUrl}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Large white rectangle below models - matching the screenshot */}
      <div className="mt-8 w-full bg-white rounded-3xl min-h-[300px] shadow-sm border border-gray-200">
      </div>
    </div>
  );
}
