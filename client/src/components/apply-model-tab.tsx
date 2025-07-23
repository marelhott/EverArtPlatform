import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
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

  const readyModels = (modelsData as any)?.models?.filter((model: Model) => 
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

  const handleImageUpload = async (instanceId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Chyba",
          description: "Vyberte prosím obrázek (JPG, PNG, GIF, atd.)",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Chyba", 
          description: "Obrázek je příliš velký. Maximální velikost je 10MB.",
          variant: "destructive"
        });
        return;
      }
      
      const previewUrl = URL.createObjectURL(file);
      
      // Update instance immediately and keep the preview stable
      setInstances(prev => prev.map(instance => 
        instance.id === instanceId 
          ? { 
              ...instance, 
              inputImage: file, 
              inputImagePreview: previewUrl
            }
          : instance
      ));
      
      // Toast pro úspěšné nahrání
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
      
      // Validate file type
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
        
        // Handle multiple results if available
        if ((data as any).generations && (data as any).generations.length > 0) {
          newResults = (data as any).generations
            .filter((gen: any) => gen.image_url && !gen.failed)
            .map((gen: any) => ({
              originalUrl: instance.inputImagePreview,
              resultUrl: gen.image_url
            }));
        } else if ((data as any).generation && (data as any).generation.outputImageUrl) {
          newResults = [{
            originalUrl: instance.inputImagePreview,
            resultUrl: (data as any).generation.outputImageUrl
          }];
        } else if ((data as any).resultUrl) {
          newResults = [{
            originalUrl: instance.inputImagePreview,
            resultUrl: (data as any).resultUrl
          }];
        }
        
        // Save to localStorage
        if (instance.selectedModel) {
          if ((data as any).generations && (data as any).generations.length > 0) {
            (data as any).generations.forEach((gen: any, index: number) => {
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
          } else if ((data as any).generation && (data as any).generation.outputImageUrl) {
            const localGeneration: LocalGeneration = {
              id: `${Date.now()}-${instanceId}`,
              outputImageUrl: (data as any).generation.outputImageUrl,
              inputImageUrl: instance.inputImagePreview,
              modelId: instance.selectedModel.everartId,
              createdAt: new Date().toISOString()
            };
            localGenerationsStorage.saveGeneration(localGeneration);
          } else if ((data as any).resultUrl) {
            const localGeneration: LocalGeneration = {
              id: `${Date.now()}-${instanceId}`,
              outputImageUrl: (data as any).resultUrl,
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
      modelId: instance.selectedModel.everartId,
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
      
      <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-8">
          <form className="space-y-8">
            {/* Settings */}
            <div className="space-y-8">

              {/* Neon Settings - Two boxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Style Strength Box */}
                <div className="glass-neon rounded-2xl p-6 animate-pulse-neon">
                  <Label className="text-neon font-semibold text-lg mb-4 block">
                    Síla stylu: <span className="text-metric text-neon">{styleStrength.toFixed(1)}</span>
                  </Label>
                  <div className="mt-4">
                    <Slider
                      value={[styleStrength]}
                      onValueChange={([value]) => form.setValue('styleStrength', value)}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full slider-neon"
                    />
                    <div className="flex justify-between text-sm text-neon/70 mt-3">
                      <span>Slabý (0.0)</span>
                      <span>Silný (1.0)</span>
                    </div>
                  </div>
                </div>

                {/* Number of Images Box */}
                <div className="glass-purple rounded-2xl p-6 animate-pulse-purple">
                  <Label className="text-purple-neon font-semibold text-lg mb-4 block">
                    Počet obrázků: <span className="text-metric text-purple-neon">{numImages}</span>
                  </Label>
                  <div className="mt-4">
                    <Slider
                      value={[numImages]}
                      onValueChange={([value]) => form.setValue('numImages', value)}
                      min={1}
                      max={4}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-purple-neon/70 mt-3">
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
                  {/* Instance Header with Adaptive Controls */}
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
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Image Upload and Results */}
                  <div className="flex gap-4">
                    {/* Input Image with Analysis Info */}
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
                              onLoad={() => console.log('Image loaded successfully')}
                              onError={(e) => {
                                console.error('Image failed to load:', e);
                                // Don't remove the preview on error, just log it
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
                          onChange={(e) => {
                            console.log('File input change triggered:', e.target.files);
                            handleImageUpload(instance.id, e);
                          }}
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

                    <div className="flex justify-center flex-col items-center gap-2">
                      <Button 
                        type="button"
                        onClick={() => {

                          
                          if (selectedModelIds.length === 1) {
                            // Single model generation
                            const selectedModel = readyModels.find((m: Model) => m.everartId === selectedModelIds[0]);
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
                          (selectedModelIds.length === 1 && (instance.isProcessing || applyModelMutation.isPending)) ||
                          (selectedModelIds.length > 1 && multiGenerateMutation.isPending) ||
                          (!instance.inputImage && !instance.inputImagePreview) || 
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