import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Image, Trash2, Download, Wand2, Info } from "lucide-react";
import { everArtApi } from "@/lib/everart-api";

const applyModelSchema = z.object({
  modelId: z.string().min(1, "Vyberte model"),
  styleStrength: z.number().min(0).max(1),
  width: z.number().min(256).max(2048),
  height: z.number().min(256).max(2048)
});

type ApplyModelForm = z.infer<typeof applyModelSchema>;

export default function ApplyModelTab() {
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [inputImagePreview, setInputImagePreview] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ originalUrl: string; resultUrl: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<ApplyModelForm>({
    resolver: zodResolver(applyModelSchema),
    defaultValues: {
      modelId: "",
      styleStrength: 0.6,
      width: 512,
      height: 512
    }
  });

  // Fetch available models
  const { data: modelsData } = useQuery({
    queryKey: ['/api/models'],
    queryFn: everArtApi.getModels
  });

  const readyModels = modelsData?.models?.filter(model => model.status === "READY") || [];

  const applyModelMutation = useMutation({
    mutationFn: async (data: ApplyModelForm & { image: File }) => {
      const formData = new FormData();
      formData.append('image', data.image);
      formData.append('styleStrength', data.styleStrength.toString());
      formData.append('width', data.width.toString());
      formData.append('height', data.height.toString());

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
    },
    onError: (error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se aplikovat styl",
        variant: "destructive"
      });
      setIsProcessing(false);
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

  const onSubmit = (data: ApplyModelForm) => {
    if (!inputImage) {
      toast({
        title: "Chyba",
        description: "Vyberte vstupní obrázek",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    applyModelMutation.mutate({
      ...data,
      image: inputImage
    });
  };

  const styleStrength = form.watch('styleStrength');

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <Label>Vybrat model</Label>
                <Select 
                  onValueChange={(value) => form.setValue('modelId', value)}
                  value={form.watch('modelId')}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Vyberte model" />
                  </SelectTrigger>
                  <SelectContent>
                    {readyModels.map((model) => (
                      <SelectItem key={model.everartId} value={model.everartId}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.modelId && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.modelId.message}
                  </p>
                )}
              </div>

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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="width">Šířka (px)</Label>
                <Input
                  id="width"
                  type="number"
                  min={256}
                  max={2048}
                  step={64}
                  {...form.register('width', { valueAsNumber: true })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="height">Výška (px)</Label>
                <Input
                  id="height"
                  type="number"
                  min={256}
                  max={2048}
                  step={64}
                  {...form.register('height', { valueAsNumber: true })}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Input Image */}
            <div>
              <Label>Vstupní obrázek</Label>
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors mt-2"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleImageDrop}
              >
                {inputImagePreview ? (
                  <div>
                    <img 
                      src={inputImagePreview} 
                      alt="Input preview" 
                      className="max-w-full max-h-64 mx-auto rounded-lg shadow-md mb-2"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeInputImage}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Odebrat obrázek
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Image className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-medium mb-2">Přetáhněte obrázek nebo klikněte pro výběr</p>
                    <p className="text-sm text-muted-foreground mb-4">Podporované formáty: JPG, PNG</p>
                    <Button
                      type="button"
                      onClick={() => document.getElementById('inputImageInput')?.click()}
                    >
                      Vybrat obrázek
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

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center text-sm text-muted-foreground">
                <Info className="mr-2 h-4 w-4" />
                Zpracování může trvat několik minut
              </div>
              <div className="flex space-x-3">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Resetovat
                </Button>
                <Button 
                  type="submit" 
                  disabled={isProcessing || applyModelMutation.isPending}
                >
                  {isProcessing || applyModelMutation.isPending ? (
                    <>
                      <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                      Zpracovávám...
                    </>
                  ) : (
                    "Aplikovat styl"
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Processing Progress */}
          {isProcessing && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Wand2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                <span className="font-medium">Aplikuji styl na obrázek...</span>
              </div>
              <Progress value={100} className="animate-pulse" />
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium mb-4">Výsledek</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Původní obrázek</p>
                  <div className="bg-muted rounded-lg aspect-square">
                    <img 
                      src={result.originalUrl} 
                      alt="Original image" 
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Stylizovaný výsledek</p>
                  <div className="bg-muted rounded-lg aspect-square">
                    <img 
                      src={result.resultUrl} 
                      alt="Stylized result" 
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex space-x-3">
                <Button onClick={downloadResult}>
                  <Download className="mr-2 h-4 w-4" />
                  Stáhnout výsledek
                </Button>
                <Button variant="outline" onClick={() => setResult(null)}>
                  Zpracovat další
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
