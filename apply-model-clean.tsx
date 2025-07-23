import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Wand2, Upload, X, Download, Plus, Trash2, Check, ZoomIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { everArtApi } from "@/lib/everart-api";
import { localGenerationsStorage, LocalGeneration, loadApplyModelState, saveApplyModelState } from "@/lib/localStorage";

interface Model {
  id: number;
  everartId: string;
  name: string;
  subject: string;
  type: string;
  status: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

const applyModelSchema = z.object({
  modelId: z.string().min(1, "Vyberte model"),
  styleStrength: z.number().min(0).max(1),
  numImages: z.number().min(1).max(4)
});

type ApplyModelForm = z.infer<typeof applyModelSchema>;

const downloadImage = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(downloadUrl);
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    return null;
  }
};

interface GenerationInstance {
  id: string;
  inputImage: File | null;
  inputImagePreview: string;
  isProcessing: boolean;
  processingProgress: number;
  results: { originalUrl: string; resultUrl: string }[];
  selectedResultIndex: number;
  selectedModel: Model | null;
}

export default function ApplyModelTab() {
  const [instances, setInstances] = useState<GenerationInstance[]>([
    {
      id: Date.now().toString(),
      inputImage: null,
      inputImagePreview: '',
      isProcessing: false,
      processingProgress: 0,
      results: [],
      selectedResultIndex: 0,
      selectedModel: null
    }
  ]);
  
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ApplyModelForm>({
    resolver: zodResolver(applyModelSchema),
    defaultValues: {
      styleStrength: 0.7,
      numImages: 4
    }
  });

  const { data: modelsData } = useQuery({
    queryKey: ['/api/models'],
    refetchInterval: 30000,
  });

  const readyModels = modelsData?.models?.filter((model: Model) => 
    model.status === 'COMPLETED' || model.status === 'READY'
  ) || [];

  const handleMultiModelSelect = (modelId: string) => {
    setSelectedModelIds(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  const handleImageUpload = async (instanceId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Chyba",
          description: "Obrázek je příliš velký. Maximální velikost je 10MB.",
          variant: "destructive"
        });
        return;
      }
      
      const previewUrl = URL.createObjectURL(file);
      
      setInstances(prev => prev.map(instance => 
        instance.id === instanceId 
          ? { 
              ...instance, 
              inputImage: file, 
              inputImagePreview: previewUrl
            }
          : instance
      ));
      
      toast({
        title: "Obrázek nahrán",
        description: `Soubor ${file.name} byl úspěšně nahrán`
      });
    }
  };

  const handleImageDrop = async (instanceId: string, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Chyba",
          description: "Můžete nahrát pouze obrázky",
          variant: "destructive"
        });
        return;
      }
      
      const previewUrl = URL.createObjectURL(file);
      
      setInstances(prev => prev.map(instance => 
        instance.id === instanceId 
          ? { 
              ...instance, 
              inputImage: file, 
              inputImagePreview: previewUrl
            }
          : instance
      ));
      
      toast({
        title: "Obrázek nahrán",
        description: `Soubor ${file.name} byl úspěšně nahrán`
      });
    }
  };

  const removeImage = (instanceId: string) => {
    setInstances(prev => prev.map(instance => {
      if (instance.id === instanceId && instance.inputImagePreview) {
        URL.revokeObjectURL(instance.inputImagePreview);
        return { ...instance, inputImage: null, inputImagePreview: '' };
      }
      return instance;
    }));
  };

  const addInstance = () => {
    if (instances.length < 3) {
      const newInstance: GenerationInstance = {
        id: Date.now().toString(),
        inputImage: null,
        inputImagePreview: '',
        isProcessing: false,
        processingProgress: 0,
        results: [],
        selectedResultIndex: 0,
        selectedModel: null
      };
      setInstances(prev => [...prev, newInstance]);
    }
  };

  const removeInstance = (instanceId: string) => {
    if (instances.length > 1) {
      setInstances(prev => {
        const instance = prev.find(i => i.id === instanceId);
        if (instance && instance.inputImagePreview) {
          URL.revokeObjectURL(instance.inputImagePreview);
        }
        return prev.filter(i => i.id !== instanceId);
      });
    }
  };

  const applyModelMutation = useMutation({
    mutationFn: async (data: ApplyModelForm & { image: File; instanceId: string }) => {
      const formData = new FormData();
      formData.append('image', data.image);
      formData.append('styleStrength', data.styleStrength.toString());
      formData.append('width', '512');
      formData.append('height', '512');
      formData.append('numImages', data.numImages.toString());

      console.log('Calling API with modelId:', data.modelId);
      const response = await fetch(`/api/models/${data.modelId}/apply`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { 
        result,
        instanceId: data.instanceId
      };
    },
    onSuccess: ({ result: data, instanceId }) => {
      toast({
        title: "Úspěch",
        description: "Styl byl úspěšně aplikován na obrázek"
      });
      
      setInstances(prev => prev.map(instance => {
        if (instance.id !== instanceId) return instance;
        
        let newResults: { originalUrl: string; resultUrl: string }[] = [];
        
        if ((data as any).generations && (data as any).generations.length > 0) {
          const generations = (data as any).generations;
          newResults = generations.map((gen: any) => ({
            originalUrl: gen.inputImageUrl || '',
            resultUrl: gen.outputImageUrl || ''
          }));
        } else if ((data as any).outputImageUrl) {
          newResults = [{
            originalUrl: (data as any).inputImageUrl || '',
            resultUrl: (data as any).outputImageUrl
          }];
        }
        
        return {
          ...instance,
          isProcessing: false,
          processingProgress: 100,
          results: newResults
        };
      }));
    },
    onError: (error: any, { instanceId }) => {
      console.error('Error applying model:', error);
      setInstances(prev => prev.map(instance => 
        instance.id === instanceId 
          ? { ...instance, isProcessing: false, processingProgress: 0 }
          : instance
      ));
      
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se aplikovat styl na obrázek",
        variant: "destructive"
      });
    }
  });

  const applyModelToInstance = async (instanceId: string) => {
    const instance = instances.find(inst => inst.id === instanceId);
    const formData = form.getValues();
    
    if (!instance || !instance.inputImage) {
      toast({
        title: "Chyba",
        description: "Nahrajte obrázek",
        variant: "destructive"
      });
      return;
    }

    setInstances(prev => prev.map(inst => 
      inst.id === instanceId 
        ? { ...inst, isProcessing: true, processingProgress: 0 }
        : inst
    ));
    
    const progressInterval = setInterval(() => {
      setInstances(prev => prev.map(inst => {
        if (inst.id === instanceId && inst.isProcessing) {
          const newProgress = inst.processingProgress >= 90 
            ? 90 
            : inst.processingProgress + Math.random() * 15;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return { ...inst, processingProgress: 90 };
          }
          return { ...inst, processingProgress: newProgress };
        }
        return inst;
      }));
    }, 3000);

    applyModelMutation.mutate({
      ...formData,
      modelId: instance.selectedModel!.everartId,
      image: instance.inputImage,
      instanceId
    });
  };

  const styleStrength = form.watch('styleStrength');
  const numImages = form.watch('numImages');

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadApplyModelState();
    if (savedState && savedState.instances) {
      setInstances(savedState.instances.map(instance => ({
        ...instance,
        isProcessing: false,
        processingProgress: 0
      })));
    }
  }, [readyModels]);

  // Save state whenever instances change
  useEffect(() => {
    if (instances.some(inst => inst.results.length > 0)) {
      saveApplyModelState({
        instances: instances.map(instance => ({
          ...instance,
          inputImagePreview: "",
          inputImage: null
        }))
      });
    }
  }, [instances]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      instances.forEach(instance => {
        if (instance.inputImagePreview) {
          URL.revokeObjectURL(instance.inputImagePreview);
        }
      });
    };
  }, []);

  return (
    <div>
      {/* Model Selection Info */}
      {selectedModelIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <span className="text-sm text-blue-800 dark:text-blue-200">
            {selectedModelIds.length === 1 
              ? "Vybrán 1 model pro generování" 
              : `Vybráno ${selectedModelIds.length} modelů pro současné generování`
            }
          </span>
        </div>
      )}

      {/* Model Gallery */}
      <div className="mb-6">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
          {readyModels.map((model: Model) => (
            <div
              key={model.id}
              onClick={() => handleMultiModelSelect(model.everartId)}
              className={`relative cursor-pointer transition-all duration-200 bg-white dark:bg-white/10 rounded-lg p-2 ${
                selectedModelIds.includes(model.everartId)
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 z-10'
                  : 'hover:scale-105 hover:ring-1 hover:ring-primary/50 hover:ring-offset-1'
              }`}
            >
              <div className="w-full aspect-square bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center relative overflow-hidden rounded-md mb-2">
                {model.thumbnailUrl ? (
                  <img 
                    src={model.thumbnailUrl} 
                    alt={model.name}
                    className="w-full h-full object-cover rounded-md"
                  />
                ) : (
                  <Wand2 className="h-6 w-6 text-muted-foreground" />
                )}
                {selectedModelIds.includes(model.everartId) && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-foreground truncate">{model.name.replace(/\bstyle\b/gi, '').trim()}</p>
                <p className="text-xs text-muted-foreground truncate">{model.subject.replace(/\bstyle\b/gi, '').trim()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Card className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg">
        <CardContent className="p-6">
          <form className="space-y-6">
            {/* Settings */}
            <div className="space-y-6">

              {/* Simple Settings - Two boxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
                {/* Style Strength Box */}
                <div className="bg-gradient-to-br from-green-50 via-green-100 to-green-50 dark:from-green-900/20 dark:via-green-800/20 dark:to-green-900/20 rounded-xl p-3 border border-green-200/50 dark:border-green-700/50 shadow-sm backdrop-blur-sm">
                  <Label className="text-green-700 dark:text-green-300 font-medium text-sm">
                    Síla stylu: {styleStrength.toFixed(1)}
                  </Label>
                  <div className="mt-2">
                    <Slider
                      value={[styleStrength]}
                      onValueChange={([value]) => form.setValue('styleStrength', value)}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-green-600 dark:text-green-400 mt-1">
                      <span>Slabý (0.0)</span>
                      <span>Silný (1.0)</span>
                    </div>
                  </div>
                </div>

                {/* Number of Images Box */}
                <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 dark:from-blue-900/20 dark:via-blue-800/20 dark:to-blue-900/20 rounded-xl p-3 border border-blue-200/50 dark:border-blue-700/50 shadow-sm backdrop-blur-sm">
                  <Label className="text-blue-700 dark:text-blue-300 font-medium text-sm">
                    Počet obrázků: {numImages}
                  </Label>
                  <div className="mt-2">
                    <Slider
                      value={[numImages]}
                      onValueChange={([value]) => form.setValue('numImages', value)}
                      min={1}
                      max={4}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mt-1">
                      <span>1 obrázek</span>
                      <span>4 obrázky</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Generation Instances */}
            <div className="space-y-6">
              {instances.map((instance, index) => (
                <div key={instance.id} className="relative">
                  {/* Instance Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Instance {index + 1}</h3>
                    </div>
                    <div className="flex gap-2">
                      {instances.length < 3 && index === instances.length - 1 && (
                        <Button 
                          type="button"
                          onClick={addInstance}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Přidat
                        </Button>
                      )}
                      {instances.length > 1 && (
                        <Button 
                          type="button"
                          onClick={() => removeInstance(instance.id)}
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Odebrat
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Main Layout */}
                  <div className="flex gap-6">
                    {/* Left side - Image upload and controls */}
                    <div className="flex-shrink-0 w-40 space-y-4">
                      {/* Image Upload Area */}
                      <div 
                        className="relative w-24 h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
                        onDrop={(e) => handleImageDrop(instance.id, e)}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        {instance.inputImagePreview ? (
                          <div className="relative w-full h-full">
                            <img 
                              src={instance.inputImagePreview} 
                              alt="Input" 
                              className="w-full h-full object-cover rounded-lg"
                              onLoad={() => console.log('Image loaded successfully')}
                              onError={(e) => {
                                console.error('Image failed to load:', e);
                              }}
                            />
                            <Button
                              type="button"
                              onClick={() => removeImage(instance.id)}
                              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 bg-destructive hover:bg-destructive/90"
                              size="sm"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground w-full h-full flex flex-col items-center justify-center">
                            <Upload className="h-8 w-8" />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(instance.id, e)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          title="Klikněte nebo přetáhněte obrázek pro nahrání"
                        />
                      </div>

                    </div>

                    {/* Results Grid - Right side, large */}
                    <div className="flex-1">
                      <div className="grid grid-cols-4 gap-4">
                        {Array.from({ length: 4 }, (_, i) => (
                          <div key={i} className="relative">
                            <div className="aspect-square bg-muted/30 rounded-lg border border-border overflow-hidden">
                              {instance.results[i] ? (
                                <img 
                                  src={instance.results[i].resultUrl}
                                  alt={`Result ${i + 1}`}
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                  onClick={() => setEnlargedImage(instance.results[i].resultUrl)}
                                />
                              ) : instance.isProcessing ? (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground relative">
                                  {/* Progressive loading effect */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse"></div>
                                  <div className="text-center z-10">
                                    <div className="w-8 h-8 mx-auto mb-2 bg-primary/20 rounded-lg flex items-center justify-center animate-pulse">
                                      <Wand2 className="h-4 w-4 text-primary animate-spin" />
                                    </div>
                                    <div className="text-xs text-primary">Generuji {i + 1}</div>
                                    <div className="w-full bg-primary/20 rounded-full h-1 mt-1">
                                      <div 
                                        className="bg-primary h-1 rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(instance.processingProgress, 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <div className="text-center">
                                    <div className="w-8 h-8 mx-auto mb-2 bg-muted rounded-lg flex items-center justify-center">
                                      <span className="text-xs font-medium">{i + 1}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            {instance.results[i] && (
                              <div className="absolute top-2 right-2 flex gap-1">
                                <Button
                                  type="button"
                                  onClick={() => setEnlargedImage(instance.results[i].resultUrl)}
                                  className="h-6 w-6 rounded-full p-0 bg-black/50 hover:bg-black/70 text-white"
                                  size="sm"
                                >
                                  <ZoomIn className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => downloadImage(instance.results[i].resultUrl, `result-${Date.now()}-${i + 1}.png`)}
                                  className="h-6 w-6 rounded-full p-0 bg-black/50 hover:bg-black/70 text-white"
                                  size="sm"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Progress and Controls */}
                  <div className="mt-4">
                    {instance.isProcessing && (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Aplikuji styl...</span>
                          <span>{Math.round(instance.processingProgress)}%</span>
                        </div>
                        <Progress value={instance.processingProgress} className="h-2" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => applyModelToInstance(instance.id)}
                        disabled={!instance.inputImage || selectedModelIds.length === 0 || instance.isProcessing}
                        className="flex-1 bg-gradient-to-r from-primary via-primary to-primary hover:from-primary/90 hover:via-primary/90 hover:to-primary/90"
                      >
                        <Wand2 className="h-4 w-4 mr-2" />
                        {instance.isProcessing ? "Zpracovávám..." : "Aplikovat styl"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Enlarged Image Modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 cursor-pointer"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            <img 
              src={enlargedImage} 
              alt="Enlarged result"
              className="max-w-full max-h-full object-contain"
            />
            <Button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}