import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CloudUpload, X, Settings } from "lucide-react";
import { everArtApi } from "@/lib/everart-api";

const createModelSchema = z.object({
  name: z.string().min(1, "Název je povinný"),
  subject: z.enum(["STYLE", "PERSON", "OBJECT"], {
    required_error: "Vyberte typ modelu"
  })
});

type CreateModelForm = z.infer<typeof createModelSchema>;

interface SelectedFile {
  id: string;
  file: File;
  preview: string;
}

export default function CreateModelTab() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateModelForm>({
    resolver: zodResolver(createModelSchema),
    defaultValues: {
      name: "",
      subject: undefined
    }
  });

  const createModelMutation = useMutation({
    mutationFn: async (data: CreateModelForm & { files: File[] }) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('subject', data.subject);
      
      data.files.forEach((file) => {
        formData.append('images', file);
      });

      return everArtApi.createModel(formData);
    },
    onSuccess: (data) => {
      toast({
        title: "Úspěch",
        description: "Model byl úspěšně vytvořen a začíná trénování"
      });
      
      // Start training progress simulation
      setIsTraining(true);
      setTrainingProgress(0);
      
      const progressInterval = setInterval(() => {
        setTrainingProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            setIsTraining(false);
            queryClient.invalidateQueries({ queryKey: ['/api/models'] });
            return 100;
          }
          return prev + Math.random() * 10;
        });
      }, 2000);
      
      // Reset form
      form.reset();
      setSelectedFiles([]);
    },
    onError: (error) => {
      toast({
        title: "Chyba",
        description: error.message || "Nepodařilo se vytvořit model",
        variant: "destructive"
      });
    }
  });

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: SelectedFile[] = [];
    
    Array.from(files).forEach((file) => {
      const id = Math.random().toString(36).substr(2, 9);
      const preview = URL.createObjectURL(file);
      newFiles.push({ id, file, preview });
    });

    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = (id: string) => {
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const resetForm = () => {
    form.reset();
    selectedFiles.forEach(file => URL.revokeObjectURL(file.preview));
    setSelectedFiles([]);
  };

  const onSubmit = (data: CreateModelForm) => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Chyba",
        description: "Vyberte alespoň jeden obrázek",
        variant: "destructive"
      });
      return;
    }

    createModelMutation.mutate({
      ...data,
      files: selectedFiles.map(f => f.file)
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    
    const newFiles: SelectedFile[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const id = Math.random().toString(36).substr(2, 9);
        const preview = URL.createObjectURL(file);
        newFiles.push({ id, file, preview });
      }
    });

    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Vytvořit nový model</h2>
      
      <Card>
        <CardContent className="p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Název modelu</Label>
                <Input
                  id="name"
                  placeholder="Můj nový model"
                  {...form.register('name')}
                  className="mt-2"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="subject">Typ modelu</Label>
                <Select 
                  onValueChange={(value) => form.setValue('subject', value as any)}
                  value={form.watch('subject')}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Vyberte typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STYLE">STYLE - Umělecký styl</SelectItem>
                    <SelectItem value="PERSON">PERSON - Osoba</SelectItem>
                    <SelectItem value="OBJECT">OBJECT - Objekt</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.subject && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.subject.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label>Trénovací obrázky</Label>
              <div 
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors mt-2"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <CloudUpload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Přetáhněte obrázky nebo klikněte pro výběr</p>
                <p className="text-sm text-muted-foreground mb-4">Podporované formáty: JPG, PNG. Doporučeno: 5-20 obrázků</p>
                <Button
                  type="button"
                  onClick={() => document.getElementById('fileInput')?.click()}
                >
                  Vybrat soubory
                </Button>
                <input
                  id="fileInput"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              
              {/* Selected Images Preview */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {selectedFiles.map((file) => (
                    <div key={file.id} className="relative group">
                      <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                        <img
                          src={file.preview}
                          alt="Selected image"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedFiles.length} souborů vybráno
              </div>
              <div className="flex space-x-3">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Resetovat
                </Button>
                <Button 
                  type="submit" 
                  disabled={createModelMutation.isPending || isTraining}
                >
                  {createModelMutation.isPending ? (
                    <>
                      <Settings className="mr-2 h-4 w-4 animate-spin" />
                      Vytvářím model...
                    </>
                  ) : (
                    "Vytvořit model"
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Training Progress */}
          {isTraining && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Settings className="mr-2 h-4 w-4 animate-spin text-primary" />
                <span className="font-medium">Trénování modelu probíhá...</span>
              </div>
              <Progress value={trainingProgress} className="mb-2" />
              <p className="text-sm text-muted-foreground">
                Odhadovaný čas: {Math.max(1, Math.ceil((100 - trainingProgress) / 10))} minut
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
