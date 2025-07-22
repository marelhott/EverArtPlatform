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
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { useToast } from "@/hooks/use-toast";
import { Image, Trash2, Download, Wand2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { everArtApi } from "@/lib/everart-api";
import { localGenerationsStorage, type LocalGeneration } from "@/lib/localStorage";
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
  const [results, setResults] = useState<{ originalUrl: string; resultUrl: string }[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const { toast } = useToast();

  // Fetch available models
  const { data: modelsData } = useQuery({
    queryKey: ['/api/models'],
    queryFn: everArtApi.getModels
  });

  const readyModels = modelsData?.models?.filter(model => model.status === "READY") || [];

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
      
      // Handle multiple results if available
      if (data.generation && data.generation.outputImageUrl) {
        setResults([{
          originalUrl: inputImagePreview,
          resultUrl: data.generation.outputImageUrl
        }]);
        setSelectedResultIndex(0);
      } else if (data.resultUrl) {
        setResults([{
          originalUrl: inputImagePreview,
          resultUrl: data.resultUrl
        }]);
        setSelectedResultIndex(0);
      }
      setIsProcessing(false);
      setProcessingProgress(0);
      
      // Save to localStorage - save all generated images
      if (selectedModel) {
        if (data.generation && data.generation.outputImageUrl) {
          const localGeneration: LocalGeneration = {
            id: Date.now().toString(),
            outputImageUrl: data.generation.outputImageUrl,
            inputImageUrl: inputImagePreview,
            modelId: selectedModel.everartId,
            createdAt: new Date().toISOString()
          };
          localGenerationsStorage.saveGeneration(localGeneration);
        } else if (data.resultUrl) {
          const localGeneration: LocalGeneration = {
            id: Date.now().toString(),
            outputImageUrl: data.resultUrl,
            inputImageUrl: inputImagePreview,
            modelId: selectedModel.everartId,
            createdAt: new Date().toISOString()
          };
          localGenerationsStorage.saveGeneration(localGeneration);
        }
      }
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

  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setInputImage(file);
      const preview = URL.createObjectURL(file);
      setInputImagePreview(preview);
      setResults([]);
    }
  }, []);

  const handleImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setInputImage(file);
      const preview = URL.createObjectURL(file);
      setInputImagePreview(preview);
      setResults([]);
    }
  }, []);

  const removeInputImage = () => {
    if (inputImagePreview) {
      URL.revokeObjectURL(inputImagePreview);
    }
    setInputImage(null);
    setInputImagePreview("");
    setResults([]);
  };

  const resetForm = () => {
    form.reset();
    removeInputImage();
    setResults([]);
    setSelectedModel(null);
  };

  const downloadResult = async () => {
    if (!results[selectedResultIndex]?.resultUrl) return;

    try {
      const response = await fetch(results[selectedResultIndex].resultUrl);
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
        <div className="grid grid-cols-10 sm:grid-cols-12 md:grid-cols-15 lg:grid-cols-18 xl:grid-cols-22 gap-0.5">
          {readyModels.map((model) => (
            <div
              key={model.id}
              onClick={() => handleModelSelect(model)}
              className={`relative cursor-pointer transition-all duration-200 bg-white dark:bg-white/10 rounded-lg p-1 ${
                selectedModel?.id === model.id
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 z-10'
                  : 'hover:scale-105 hover:ring-1 hover:ring-primary/50 hover:ring-offset-1'
              }`}
              style={{ width: '50px', height: '50px' }}
            >
              <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-accent/20 flex items-center justify-center relative overflow-hidden rounded-md">
                {model.thumbnailUrl ? (
                  <img 
                    src={model.thumbnailUrl} 
                    alt={model.name}
                    className="w-full h-full object-cover rounded-md"
                  />
                ) : (
                  <Wand2 className="h-6 w-6 text-muted-foreground" />
                )}
                {selectedModel?.id === model.id && (
                  <div className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check className="h-2 w-2" />
                  </div>
                )}
              </div>
              <div className="absolute bottom-0.5 left-0.5 right-0.5 bg-gradient-to-t from-black/60 to-transparent p-1 rounded-b-md">
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
                  <div className="flex justify-center">
                    <Progress value={processingProgress} className="h-2 w-1/2" />
                  </div>
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
                    className="border-2 border-dashed border-border/30 rounded-2xl p-4 text-center hover:border-primary/50 transition-all bg-gradient-to-br from-secondary/20 via-card to-accent/15 shadow-lg backdrop-blur-sm"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleImageDrop}
                    style={{ aspectRatio: inputImagePreview ? 'auto' : '1' }}
                  >
                    {inputImagePreview ? (
                      <div className="flex flex-col">
                        <img 
                          src={inputImagePreview} 
                          alt="Input preview" 
                          className="w-full object-contain rounded-lg shadow-sm max-h-96"
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
                      <div className="h-full flex flex-col items-center justify-center aspect-square">
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
                  <div 
                    className="border-2 border-border/30 rounded-2xl p-4 flex items-center justify-center bg-gradient-to-br from-accent/20 via-card to-secondary/15 shadow-lg backdrop-blur-sm"
                    style={{ aspectRatio: results.length > 0 ? 'auto' : '1' }}
                  >
                    {results.length > 0 && results[selectedResultIndex] ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <img 
                            src={results[selectedResultIndex].resultUrl} 
                            alt="Stylized result" 
                            className="w-full h-full object-cover rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[95vh] p-2 overflow-auto">
                          <VisuallyHidden>
                            <DialogTitle>Zvětšený obrázek</DialogTitle>
                          </VisuallyHidden>
                          <div className="flex justify-center items-center min-h-0">
                            <img 
                              src={results[selectedResultIndex].resultUrl} 
                              alt="Stylized result - enlarged" 
                              className="max-w-full max-h-[90vh] object-contain rounded-lg"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Wand2 className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-xs">Výsledek se zobrazí zde</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Thumbnail Gallery */}
                  {results.length > 1 && (
                    <div className="mt-4">
                      <Label className="text-xs text-muted-foreground mb-2 block">Výsledky ({results.length})</Label>
                      <div className="flex space-x-2 overflow-x-auto pb-2">
                        {results.map((result, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedResultIndex(index)}
                            className={cn(
                              "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors",
                              selectedResultIndex === index 
                                ? "border-primary shadow-md" 
                                : "border-border/30 hover:border-primary/50"
                            )}
                          >
                            <img 
                              src={result.resultUrl}
                              alt={`Result ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={resetForm}>
                Resetovat
              </Button>
              
              {results.length > 0 && (
                <Button onClick={downloadResult} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Stáhnout
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>



    </div>
  );
}
