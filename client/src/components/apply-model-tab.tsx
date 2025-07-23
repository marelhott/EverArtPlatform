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
      id: '1',
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

  // Fetch available models
  const { data: modelsData, isLoading: modelsLoading } = useQuery({
    queryKey: ['/api/models'],
    enabled: true
  });

  const readyModels = modelsData?.models?.filter((model: Model) => 
    model.status === 'COMPLETED' || model.status === 'READY'
  ) || [];

  const form = useForm<ApplyModelForm>({
    resolver: zodResolver(applyModelSchema),
    defaultValues: {
      modelId: "",
      styleStrength: 0.7,
      numImages: 4
    }
  });

  const handleImageUpload = (instanceId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      
      setInstances(prev => prev.map(instance => 
        instance.id === instanceId 
          ? { ...instance, inputImage: file, inputImagePreview: previewUrl }
          : instance
      ));
    }
  };

  const handleImageDrop = (instanceId: string, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      
      setInstances(prev => prev.map(instance => 
        instance.id === instanceId 
          ? { ...instance, inputImage: file, inputImagePreview: previewUrl }
          : instance
      ));
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

      return { 
        result: await everArtApi.applyModel(data.modelId, formData),
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
        
        // Handle multiple results if available
        if (data.generations && data.generations.length > 0) {
          newResults = data.generations
            .filter((gen: any) => gen.image_url && !gen.failed)
            .map((gen: any) => ({
              originalUrl: instance.inputImagePreview,
              resultUrl: gen.image_url
            }));
        } else if (data.generation && data.generation.outputImageUrl) {
          newResults = [{
            originalUrl: instance.inputImagePreview,
            resultUrl: data.generation.outputImageUrl
          }];
        } else if (data.resultUrl) {
          newResults = [{
            originalUrl: instance.inputImagePreview,
            resultUrl: data.resultUrl
          }];
        }
        
        // Save to localStorage
        if (instance.selectedModel) {
          if (data.generations && data.generations.length > 0) {
            data.generations.forEach((gen: any, index: number) => {
              if (gen.image_url && !gen.failed) {
                const localGeneration: LocalGeneration = {
                  id: `${Date.now()}-${index}-${instanceId}`,
                  outputImageUrl: gen.image_url,
                  inputImageUrl: instance.inputImagePreview,
                  modelId: instance.selectedModel!.everartId,
                  createdAt: new Date().toISOString()
                };
                localGenerationsStorage.saveGeneration(localGeneration);
              }
            });
          } else if (data.generation && data.generation.outputImageUrl) {
            const localGeneration: LocalGeneration = {
              id: `${Date.now()}-${instanceId}`,
              outputImageUrl: data.generation.outputImageUrl,
              inputImageUrl: instance.inputImagePreview,
              modelId: instance.selectedModel.everartId,
              createdAt: new Date().toISOString()
            };
            localGenerationsStorage.saveGeneration(localGeneration);
          } else if (data.resultUrl) {
            const localGeneration: LocalGeneration = {
              id: `${Date.now()}-${instanceId}`,
              outputImageUrl: data.resultUrl,
              inputImageUrl: instance.inputImagePreview,
              modelId: instance.selectedModel.everartId,
              createdAt: new Date().toISOString()
            };
            localGenerationsStorage.saveGeneration(localGeneration);
          }
        }
        
        return {
          ...instance,
          isProcessing: false,
          processingProgress: 0,
          results: newResults
        };
      }));
    },
    onError: (error: any, variables) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se aplikovat styl",
        variant: "destructive"
      });
      setInstances(prev => prev.map(instance => 
        instance.id === variables.instanceId
          ? { ...instance, isProcessing: false, processingProgress: 0 }
          : instance
      ));
    }
  });

  const multiGenerateMutation = useMutation({
    mutationFn: async (data: { modelIds: string[]; styleStrength: number; inputImage: File }) => {
      const formData = new FormData();
      formData.append('image', data.inputImage);
      formData.append('modelIds', JSON.stringify(data.modelIds));
      formData.append('styleStrength', data.styleStrength.toString());
      formData.append('width', '1024');
      formData.append('height', '1024');

      const response = await fetch(`/api/models/multi-apply`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Multi-generation failed');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Multi-generování dokončeno",
        description: data.message
      });
      
      // Create new instances for each successful result
      const newInstances = data.results
        .filter((result: any) => result.success)
        .map((result: any, index: number) => ({
          id: `multi-${Date.now()}-${index}`,
          inputImage: instances[0].inputImage,
          inputImagePreview: instances[0].inputImagePreview,
          isProcessing: false,
          processingProgress: 100,
          results: [{ originalUrl: result.resultUrl, resultUrl: result.resultUrl }],
          selectedResultIndex: 0,
          selectedModel: readyModels.find((m: Model) => m.everartId === result.modelId) || null
        }));
      
      setInstances(prev => [...prev, ...newInstances]);
    },
    onError: (error) => {
      toast({
        title: "Chyba",
        description: "Multi-generování se nezdařilo",
        variant: "destructive"
      });
    }
  });

  const handleMultiModelSelect = (modelId: string) => {
    setSelectedModelIds(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  const onMultiSubmit = async () => {
    const instance = instances[0]; // Use first instance for multi-generation
    if (!instance) return;

    const data = form.getValues();
    
    if (selectedModelIds.length === 0) {
      toast({
        title: "Chyba",
        description: "Vyberte alespoň jeden model pro multi-generování",
        variant: "destructive"
      });
      return;
    }

    if (!instance.inputImage) {
      toast({
        title: "Chyba", 
        description: "Nahrajte obrázek",
        variant: "destructive"
      });
      return;
    }

    multiGenerateMutation.mutate({
      modelIds: selectedModelIds,
      styleStrength: data.styleStrength,
      inputImage: instance.inputImage
    });
  };

  const onSubmit = async (instanceId: string) => {
    const instance = instances.find(i => i.id === instanceId);
    if (!instance) return;

    const data = form.getValues();
    
    if (!instance.selectedModel) {
      toast({
        title: "Chyba",
        description: "Vyberte model",
        variant: "destructive"
      });
      return;
    }

    if (!instance.inputImage) {
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
    
    // Simulate progress during processing
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
      ...data,
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
        isProcessing: false, // Reset processing state
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
          inputImagePreview: "", // Don't save blob URLs as they expire
          inputImage: null // Don't save File objects
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

              {/* Settings - Two separate boxes - 30% smaller */}
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
                    <h3 className="text-lg font-semibold">Instance {index + 1}</h3>
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
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Image Upload and Results */}
                  <div className="flex gap-4">
                    {/* Input Image - Left side, small */}
                    <div className="flex-shrink-0">
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

                    <div className="flex justify-center">
                      <Button 
                        type="button"
                        onClick={() => {
                          if (selectedModelIds.length === 1) {
                            // Single model generation
                            const selectedModel = readyModels.find(m => m.everartId === selectedModelIds[0]);
                            if (selectedModel) {
                              setInstances(prev => prev.map(inst => 
                                inst.id === instance.id 
                                  ? { ...inst, selectedModel }
                                  : inst
                              ));
                              onSubmit(instance.id);
                            }
                          } else if (selectedModelIds.length > 1) {
                            // Multi-model generation
                            onMultiSubmit();
                          }
                        }}
                        disabled={
                          (selectedModelIds.length === 1 && instance.isProcessing) ||
                          (selectedModelIds.length > 1 && multiGenerateMutation.isPending) ||
                          !instance.inputImage || 
                          selectedModelIds.length === 0
                        }
                        className="px-8 py-2"
                        size="lg"
                      >
                        {((selectedModelIds.length === 1 && instance.isProcessing) || 
                          (selectedModelIds.length > 1 && multiGenerateMutation.isPending)) ? (
                          <>
                            <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                            {selectedModelIds.length === 1 
                              ? "Generuji..." 
                              : `Generuji ${selectedModelIds.length} modelů...`
                            }
                          </>
                        ) : (
                          selectedModelIds.length === 0 
                            ? "Vyberte model(y)" 
                            : selectedModelIds.length === 1
                              ? "Generovat"
                              : `Generovat s ${selectedModelIds.length} modely`
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Image Enlargement Modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img 
              src={enlargedImage}
              alt="Enlarged result"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-4 right-4 h-10 w-10 rounded-full p-0 bg-black/50 hover:bg-black/70 text-white"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => downloadImage(enlargedImage, `enlarged-result-${Date.now()}.png`)}
              className="absolute top-4 left-4 h-10 w-10 rounded-full p-0 bg-black/50 hover:bg-black/70 text-white"
              size="sm"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}