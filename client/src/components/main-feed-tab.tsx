import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GenerationSlots } from "@/components/generation-slots";
import { Wand2, Upload, X, Download, Plus, Trash2, Check, ZoomIn, ImageIcon } from "lucide-react";
import ImageModal from "./image-modal";
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
  selectedModel: Model | null;
  isProcessing: boolean;
  processingProgress: number;
  results: LocalGeneration[];
  selectedResultIndex: number;
}

interface MainFeedTabProps {
  showGenerationSlots?: boolean;
}

export default function MainFeedTab({ showGenerationSlots = false }: MainFeedTabProps) {
  const { toast } = useToast();
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [inputImagePreview, setInputImagePreview] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const form = useForm<ApplyModelForm>({
    resolver: zodResolver(applyModelSchema),
    defaultValues: {
      styleStrength: 0.8,
      numImages: 1
    }
  });

  // Load models
  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ["/api/models"],
  });

  const models: Model[] = (modelsData as any)?.models || [];

  // Load all generations for the feed
  const { data: generationsData, refetch: refetchGenerations } = useQuery({
    queryKey: ["/api/generations"],
  });

  const generations: any[] = (generationsData as any)?.generations || [];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setInputImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setInputImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setInputImage(null);
    setInputImagePreview("");
  };

  const handleModelSelect = (modelId: string, checked: boolean) => {
    if (checked) {
      setSelectedModels(prev => [...prev, modelId]);
    } else {
      setSelectedModels(prev => prev.filter(id => id !== modelId));
    }
  };

  const generateImagesMutation = useMutation({
    mutationFn: async (data: ApplyModelForm & { inputImage: File; selectedModels: string[] }) => {
      const formData = new FormData();
      formData.append("image", data.inputImage);
      formData.append("modelIds", JSON.stringify(data.selectedModels));
      formData.append("styleStrength", data.styleStrength.toString());
      formData.append("numImages", data.numImages.toString());

      const response = await fetch("/api/generations", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Chyba při generování obrázků");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {

      toast({
        title: "Úspěch!",
        description: "Obrázky byly úspěšně vygenerovány",
      });
      refetchGenerations();
      // Clear form
      setInputImage(null);
      setInputImagePreview("");
      setSelectedModels([]);
    },
    onError: (error, variables) => {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ApplyModelForm) => {
    if (!inputImage) {
      toast({
        title: "Chyba",
        description: "Nahrajte obrázek",
        variant: "destructive",
      });
      return;
    }

    if (selectedModels.length === 0) {
      toast({
        title: "Chyba",  
        description: "Vyberte alespoň jeden model",
        variant: "destructive",
      });
      return;
    }

    generateImagesMutation.mutate({
      ...data,
      inputImage,
      selectedModels
    });
  };

  return (
    <div className="flex h-[calc(100vh-140px)]">
      {/* Left Panel - Compact Controls */}
      <div className="w-80 bg-card/50 backdrop-blur-sm ml-12">
        <div className="p-6">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            {/* Image Upload - Two Column Width */}
            <div>
              {!inputImagePreview ? (
                <label className="flex items-center justify-center w-full h-16 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50">
                  <div className="text-center">
                    <Upload className="mx-auto h-4 w-4 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground mt-1">Vstupní obrázek</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative">
                  <img
                    src={inputImagePreview}
                    alt="Preview"
                    className="w-full h-16 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-5 w-5 p-0"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Settings Row */}
            <div className="grid grid-cols-2 gap-2">
              {/* Style Strength */}
              <div>
                <Label className="text-[10px]">Síla: {form.watch("styleStrength")}</Label>
                <Slider
                  value={[form.watch("styleStrength")]}
                  onValueChange={(value) => form.setValue("styleStrength", value[0])}
                  max={1}
                  min={0}
                  step={0.1}
                  className="mt-1"
                />
              </div>

              {/* Number of Images */}
              <div>
                <Label className="text-[10px]">Počet: {form.watch("numImages")}</Label>
                <Slider
                  value={[form.watch("numImages")]}
                  onValueChange={(value) => form.setValue("numImages", value[0])}
                  max={4}
                  min={1}
                  step={1}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Generate Button */}
            <Button
              type="submit"
              className="w-full h-12 text-sm font-medium"
              disabled={generateImagesMutation.isPending || !inputImage || selectedModels.length === 0}

            >
              {generateImagesMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generování...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generovat {selectedModels.length > 1 ? `(${selectedModels.length})` : ''}
                </>
              )}
            </Button>
            
            {/* Progress Bar Area */}
            {generateImagesMutation.isPending && (
              <div className="mt-3">
                <div className="w-full bg-secondary rounded-full h-1">
                  <div className="bg-primary h-1 rounded-full animate-pulse" style={{width: '60%'}}></div>
                </div>
              </div>
            )}
          </form>

          {/* Models Grid - Two Columns */}
          <div className="mt-10">
            <ScrollArea className="h-[calc(100vh-360px)] pr-2">
              <div className="grid grid-cols-2 gap-1.5 pr-1">
                {models.map((model: Model) => (
                  <div
                    key={model.everartId}
                    className={`relative cursor-pointer rounded-md overflow-hidden ${
                      selectedModels.includes(model.everartId) 
                        ? 'ring-2 ring-primary' 
                        : 'hover:ring-1 hover:ring-border'
                    }`}
                    onClick={() => handleModelSelect(model.everartId, !selectedModels.includes(model.everartId))}
                  >
                    {model.thumbnailUrl && (
                      <img
                        src={model.thumbnailUrl}
                        alt={model.name}
                        className="w-full aspect-square object-cover"
                      />
                    )}
                    {selectedModels.includes(model.everartId) && (
                      <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-1.5 w-1.5 text-primary-foreground" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white px-1 py-0.5">
                      <p className="text-[8px] font-medium truncate leading-tight text-center">{model.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Main Feed */}
<div className="flex-1 p-8 border-l border-border">
        <ScrollArea className="h-full">


          {generations.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              {generations.map((generation: any) => (
                <div key={generation.id} className="group relative">
                  {generation.status === 'FAILED' ? (
                    <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">Generování selhalo</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ImageModal 
                      imageUrl={generation.cloudinaryUrl || generation.outputImageUrl || generation.imageUrl}
                      modelName={generation.modelName}
                      generation={generation}
                    >
                      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                        <img
                          src={generation.cloudinaryUrl || generation.outputImageUrl || generation.imageUrl}
                          alt={`Generation ${generation.id}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          data-testid={`img-generation-${generation.id}`}
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                  <div class="text-center">
                                    <svg class="h-8 w-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p class="text-xs text-gray-500">Obrázek nedostupný</p>
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                      </div>
                    </ImageModal>
                  )}
                  
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center pointer-events-none">
                    <div className="bg-white/90 dark:bg-black/90 px-3 py-1 rounded-md text-sm font-medium">
                      Klikněte pro zvětšení
                    </div>
                  </div>
                  
                  <div className="absolute bottom-2 left-2 right-2">
                    <Badge variant="secondary" className="text-[10px] py-0 px-1 bg-black/70 text-white">
                      {generation.modelName || 'Unknown Model'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}