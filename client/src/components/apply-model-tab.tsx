import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Image, Trash2, Download, Wand2, ChevronDown } from "lucide-react";
import { everArtApi } from "@/lib/everart-api";
import ModelSelectorModal from "@/components/model-selector-modal";
import type { Model } from "@shared/schema";

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
  const [showModelSelector, setShowModelSelector] = useState(false);
  const { toast } = useToast();

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
      <h2 className="text-xl font-semibold mb-6">Použít model na obrázek</h2>
      
      <Card>
        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Model Selection and Settings */}
            <div className="space-y-6">
              <div>
                <Label>Vybrat model</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModelSelector(true)}
                  className="w-full mt-2 justify-between"
                >
                  {selectedModel ? (
                    <div className="flex items-center space-x-3">
                      {selectedModel.thumbnailUrl && (
                        <img 
                          src={selectedModel.thumbnailUrl} 
                          alt={selectedModel.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <span>{selectedModel.name}</span>
                    </div>
                  ) : (
                    "Vyberte model"
                  )}
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {form.formState.errors.modelId && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.modelId.message}
                  </p>
                )}
              </div>

              {/* Settings Panel */}
              <div className="bg-muted/30 rounded-lg p-4 border">
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
                <div className="bg-muted/30 rounded-lg p-4 border">
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

            {/* Two Column Layout for Images - half size */}
            <div className="flex justify-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg w-full">
                {/* Input Image Column */}
                <div>
                  <Label className="mb-2 block text-center">Vstupní obrázek</Label>
                  <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-3 text-center hover:border-primary/50 transition-colors aspect-square bg-gradient-to-br from-muted/20 to-muted/40 shadow-sm"
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
                  <div className="border-2 border-muted-foreground/25 rounded-xl aspect-square flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/40 shadow-sm">
                    {result ? (
                      <img 
                        src={result.resultUrl} 
                        alt="Stylized result" 
                        className="w-full h-full object-cover rounded-lg shadow-sm"
                      />
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

      {/* Model Selector Modal */}
      <ModelSelectorModal
        open={showModelSelector}
        onOpenChange={setShowModelSelector}
        onSelectModel={handleModelSelect}
      />
    </div>
  );
}
