import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Wand2 } from "lucide-react";
import type { Generation } from "@shared/schema";

export default function ModificationsTab() {
  const { toast } = useToast();

  // Fetch generations gallery
  const { data: generationsData, refetch: refetchGenerations } = useQuery({
    queryKey: ['/api/generations'],
    staleTime: 30000
  });

  const generations = generationsData?.generations || [];

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

  return (
    <div>
      <Card className="bg-gradient-to-br from-card via-card to-card/95 border-border/50 shadow-lg">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Galerie vygenerovaných obrázků</h3>
          
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
                    <DialogContent className="max-w-6xl max-h-[95vh] p-2 overflow-auto">
                      <VisuallyHidden>
                        <DialogTitle>Zvětšený obrázek</DialogTitle>
                      </VisuallyHidden>
                      {generation.outputImageUrl && (
                        <div className="flex justify-center items-center min-h-0">
                          <img 
                            src={generation.outputImageUrl} 
                            alt="Vygenerovaný obrázek - zvětšený"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg"
                          />
                        </div>
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