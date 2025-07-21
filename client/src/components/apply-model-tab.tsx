import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Image, Trash2, Download, Wand2, Check } from "lucide-react";
import { everArtApi } from "@/lib/everart-api";
import type { Model, Generation } from "@shared/schema";

const applyModelSchema = z.object({
  modelId: z.string().min(1, "Vyberte model"),
  styleStrength: z.number().min(0).max(1),
  numImages: z.number().min(1).max(4)
});

type ApplyModelForm = z.infer<typeof applyModelSchema>;

export default function ApplyModelTab() {
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [inputImagePreview, setInputImagePreview] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [result, setResult] = useState<{ originalUrl: string; resultUrl: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const { toast } = useToast();

  // Fetch available models
  const { data: modelsData } = useQuery({
    queryKey: ['/api/models'],
    queryFn: everArtApi.getModels
  });

  // Fetch generations gallery
  const { data: generationsData, refetch: refetchGenerations } = useQuery({
    queryKey: ['/api/generations'],
    staleTime: 30000
  });

  const readyModels = modelsData?.models?.filter(model => model.status === "READY") || [];
  const generations = generationsData?.generations || [];

  const form = useForm<ApplyModelForm>({
    resolver: zodResolver(applyModelSchema),
    defaultValues: {
      modelId: "",
      styleStrength: 0.6,
      numImages: 1
    }
  });

  const applyModelMutation = useMutation({
    mutationFn: async (data: ApplyModelForm & { image: File }) => {
      const formData = new FormData();
      formData.append('image', data.image);
      formData.append('styleStrength', data.styleStrength.toString());
      formData.append('width', '512');
      formData.append('height', '512');
      formData.append('numImages', data.numImages.toString());

      return everArtApi.applyModel(data.modelId, formData);
    },
    onSuccess: (data) => {
      toast({
        title: "Úspěch",
        description: "Styl byl úspěšně aplikován na obrázek"
      });
      
      setResult({
        originalUrl: inputImagePreview,
        resultUrl: data.resultUrl
      });
      setIsProcessing(false);
      setProcessingProgress(0);
      
      // Refresh generations gallery
      refetchGenerations();
    },
    onError: (error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se aplikovat styl",
        variant: "destructive"
      });
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  });

  const deleteGenerationMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/generations/${id}`, { method: 'DELETE' }).then(res => res.json()),
    onSuccess: () => {
      refetchGenerations();
      toast({
        title: "Smazáno",
        description: "Obrázek byl smazán z galerie.",
      });
    },
    onError: () => {
      toast({
        title: "Chyba",
        description: "Při mazání obrázku došlo k chybě.",
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setInputImage(file);
      const preview = URL.createObjectURL(file);
      setInputImagePreview(preview);
      setResult(null);
    }
  }, []);

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setInputImage(file);
      const preview = URL.createObjectURL(file);
      setInputImagePreview(preview);
      setResult(null);
    }
  }, []);

  const removeInputImage = () => {
    if (inputImagePreview) {
      URL.revokeObjectURL(inputImagePreview);
    }
    setInputImage(null);
    setInputImagePreview("");
    setResult(null);
  };

  const resetForm = () => {
    form.reset();
    removeInputImage();
    setResult(null);
    setSelectedModel(null);
  };

  const downloadResult = async () => {
    if (!result?.resultUrl) return;

    try {
      const response = await fetch(result.resultUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'stylized-result.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se stáhnout výsledek",
        variant: "destructive"
      });
    }
  };

  const handleModelSelect = (model: Model) => {
    setSelectedModel(model);
    form.setValue('modelId', model.everartId);
  };

  const onSubmit = (data: ApplyModelForm) => {
    if (!inputImage) {
      toast({
        title: "Chyba",
        description: "Vyberte vstupní obrázek",
        variant: "destructive"
      });
      return;
    }

    if (!selectedModel) {
      toast({
        title: "Chyba", 
        description: "Vyberte model",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    
    // Simulate progress during processing
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Keep at 90% until actual completion
        }
        return prev + Math.random() * 15;
      });
    }, 3000);

    applyModelMutation.mutate({
      ...data,
      image: inputImage
    });
  };

  const styleStrength = form.watch('styleStrength');
  const numImages = form.watch('numImages');

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      if (inputImagePreview) {
        URL.revokeObjectURL(inputImagePreview);
      }
    };
  }, [inputImagePreview]);

  return (
    <div>
      {/* Model Gallery */}
      <div className="mb-6">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 xl:grid-cols-16 gap-0">
          {readyModels.map((model) => (
            <div
              key={model.id}
              onClick={() => handleModelSelect(model)}
              className={`relative cursor-pointer transition-all duration-200 aspect-square ${
                selectedModel?.id === model.id
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 z-10'
                  : 'hover:scale-105 hover:ring-1 hover:ring-primary/50 hover:ring-offset-1'
              }`}
            >
              <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center relative overflow-hidden">
                {model.thumbnailUrl ? (
                  <img 
                    src={model.thumbnailUrl} 
                    alt={model.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Wand2 className="h-8 w-8 text-muted-foreground" />
                )}
                {selectedModel?.id === model.id && (
                  <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">{model.name}</p>
              </div>
            </div>
          ))}
        </div>
        {form.formState.errors.modelId && (
          <p className="text-sm text-red-600 mt-2">
            {form.formState.errors.modelId.message}
          </p>
        )}
      </div>
      
      <Card className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg">
        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Settings */}
            <div className="space-y-6">

              {/* Settings Panel */}
              <div className="bg-gradient-to-r from-secondary/20 via-accent/20 to-secondary/20 rounded-2xl p-6 border border-border/50 shadow-sm backdrop-blur-sm">
                <h3 className="font-medium mb-4">Nastavení</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Style Strength */}
                  <div>
                    <Label>
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
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Slabý (0.0)</span>
                        <span>Silný (1.0)</span>
                      </div>
                    </div>
                  </div>

                  {/* Number of Images */}
                  <div>
                    <Label>
                      Počet generovaných obrázků: {numImages}
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
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>1 obrázek</span>
                        <span>4 obrázky</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Apply Button */}
              <div className="flex justify-center">
                <Button 
                  type="submit" 
                  disabled={isProcessing || applyModelMutation.isPending}
                  className="px-8 py-2"
                  size="lg"
                >
                  {isProcessing || applyModelMutation.isPending ? (
                    <>
                      <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                      Aplikuji model
                    </>
                  ) : (
                    "Aplikovat model"
                  )}
                </Button>
              </div>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl p-4 border border-border/50 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center mb-2">
                    <Wand2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                    <span className="font-medium">Zpracovávám obrázek...</span>
                  </div>
                  <Progress value={processingProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    {Math.round(processingProgress)}% dokončeno
                  </p>
                </div>
              )}
            </div>

            {/* Two Column Layout for Images - 30% larger */}
            <div className="flex justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                {/* Input Image Column */}
                <div>
                  <Label className="mb-2 block text-center">Vstupní obrázek</Label>
                  <div 
                    className="border-2 border-dashed border-border/30 rounded-2xl p-4 text-center hover:border-primary/50 transition-all aspect-square bg-gradient-to-br from-secondary/20 via-card to-accent/15 shadow-lg backdrop-blur-sm"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleImageDrop}
                  >
                    {inputImagePreview ? (
                      <div className="h-full flex flex-col">
                        <img 
                          src={inputImagePreview} 
                          alt="Input preview" 
                          className="flex-1 w-full object-cover rounded-lg shadow-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={removeInputImage}
                          className="mt-2"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Odebrat
                        </Button>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="font-medium mb-1 text-xs">Přetáhněte obrázek</p>
                        <p className="text-xs text-muted-foreground mb-2">nebo</p>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => document.getElementById('inputImageInput')?.click()}
                          className="text-xs px-2 py-1"
                        >
                          Vybrat soubor
                        </Button>
                      </div>
                    )}
                    <input
                      id="inputImageInput"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Result Image Column */}
                <div>
                  <Label className="mb-2 block text-center">Stylizovaný výsledek</Label>
                  <div className="border-2 border-border/30 rounded-2xl aspect-square flex items-center justify-center bg-gradient-to-br from-accent/20 via-card to-secondary/15 shadow-lg backdrop-blur-sm">
                    {result ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <img 
                            src={result.resultUrl} 
                            alt="Stylized result" 
                            className="w-full h-full object-cover rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                          <img 
                            src={result.resultUrl} 
                            alt="Stylized result - enlarged" 
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Wand2 className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-xs">Výsledek se zobrazí zde</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={resetForm}>
                Resetovat
              </Button>
              
              {result && (
                <Button onClick={downloadResult} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Stáhnout
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Generations Gallery Card */}
      <Card className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg mt-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Modifikace</h3>
          
          {generations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Zatím žádné vygenerované obrázky</p>
              <p className="text-sm">Vygenerované obrázky se zobrazí zde</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {generations.map((generation: Generation) => (
                <div key={generation.id} className="relative group">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="aspect-square cursor-pointer overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-all">
                        {generation.outputImageUrl ? (
                          <img 
                            src={generation.outputImageUrl} 
                            alt="Vygenerovaný obrázek"
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center">
                            <Wand2 className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                      {generation.outputImageUrl && (
                        <img 
                          src={generation.outputImageUrl} 
                          alt="Vygenerovaný obrázek - zvětšený"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  {/* Delete button */}
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGenerationMutation.mutate(generation.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
