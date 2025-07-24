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
  selectedModel: Model | null;
  isProcessing: boolean;
  processingProgress: number;
  results: LocalGeneration[];
  selectedResultIndex: number;
}

export default function MainFeedTab() {
  const { toast } = useToast();
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [inputImagePreview, setInputImagePreview] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const form = useForm<ApplyModelForm>({
    resolver: zodResolver(applyModelSchema),
    defaultValues: {
      modelId: "",
      styleStrength: 0.8,
      numImages: 1
    }
  });

  // Load models
  const { data: modelsData, isLoading: isLoadingModels } = useQuery({
    queryKey: ["/api/models"],
  });

  const models = modelsData?.models || [];

  // Load all generations for the feed
  const { data: generationsData, refetch: refetchGenerations } = useQuery({
    queryKey: ["/api/generations"],
  });

  const generations = generationsData?.generations || [];

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
    onSuccess: () => {
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
    onError: (error) => {
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
    <div className="flex h-[calc(100vh-200px)]">
      {/* Left Panel - Models */}
      <div className="w-64 border-r border-border bg-card/50 backdrop-blur-sm">
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3">Vyberte modely</h3>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {models.map((model: Model) => (
                <div key={model.everartId} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                  <Checkbox
                    id={model.everartId}
                    checked={selectedModels.includes(model.everartId)}
                    onCheckedChange={(checked) => handleModelSelect(model.everartId, checked as boolean)}
                  />
                  <div className="flex items-center space-x-2 flex-1">
                    {model.thumbnailUrl && (
                      <img
                        src={model.thumbnailUrl}
                        alt={model.name}
                        className="w-8 h-8 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{model.name}</p>
                      <Badge variant={model.status === 'READY' ? 'default' : 'secondary'} className="text-[10px] py-0 px-1">
                        {model.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Compact Settings */}
        <div className="p-4 border-t border-border">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            {/* Image Upload */}
            <div>
              <Label className="text-xs">Vstupní obrázek</Label>
              {!inputImagePreview ? (
                <div className="mt-1">
                  <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50">
                    <div className="text-center">
                      <Upload className="mx-auto h-4 w-4 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground mt-1">Nahrát</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="mt-1 relative">
                  <img
                    src={inputImagePreview}
                    alt="Preview"
                    className="w-full h-20 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-6 w-6 p-0"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Style Strength */}
            <div>
              <Label className="text-xs">Síla stylu: {form.watch("styleStrength")}</Label>
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
              <Label className="text-xs">Počet obrázků: {form.watch("numImages")}</Label>
              <Slider
                value={[form.watch("numImages")]}
                onValueChange={(value) => form.setValue("numImages", value[0])}
                max={4}
                min={1}
                step={1}
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-8 text-xs"
              disabled={generateImagesMutation.isPending || !inputImage || selectedModels.length === 0}
            >
              {generateImagesMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                  Generování...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-3 w-3" />
                  {selectedModels.length === 1 ? "Generovat" : `Generovat s ${selectedModels.length} modely`}
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Main Feed */}
      <div className="flex-1 p-4">
        <ScrollArea className="h-full">
          {generations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Wand2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Žádné generace</h3>
                <p className="text-muted-foreground">Nahrajte obrázek a vyberte modely pro první generaci</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
              {generations.map((generation: any) => (
                <div key={generation.id} className="group relative">
                  <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                    <img
                      src={generation.imageUrl}
                      alt={`Generation ${generation.id}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => downloadImage(generation.imageUrl, `generation-${generation.id}.png`)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(generation.imageUrl, '_blank')}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
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