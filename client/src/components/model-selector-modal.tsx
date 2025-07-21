import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";
import { everArtApi } from "@/lib/everart-api";
import type { Model } from "@shared/schema";

interface ModelSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectModel: (model: Model) => void;
}

export default function ModelSelectorModal({ open, onOpenChange, onSelectModel }: ModelSelectorModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/models'],
    queryFn: everArtApi.getModels,
    enabled: open
  });

  const readyModels = data?.models?.filter(model => model.status === "READY") || [];

  const handleSelectModel = (model: Model) => {
    onSelectModel(model);
    onOpenChange(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "READY": return "bg-green-100 text-green-800";
      case "TRAINING": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vyberte model</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : readyModels.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Žádné připravené modely</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {readyModels.map((model) => (
              <div
                key={model.id}
                onClick={() => handleSelectModel(model)}
                className="aspect-square bg-muted rounded-lg cursor-pointer hover:ring-2 hover:ring-primary transition-all group"
              >
                <div className="w-full h-full relative">
                  {model.thumbnailUrl ? (
                    <img 
                      src={model.thumbnailUrl} 
                      alt={model.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Bot className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Model name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 rounded-b-lg">
                    <p className="text-xs font-medium truncate">{model.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs opacity-75">{model.subject}</span>
                      <Badge className={`text-xs ${getStatusColor(model.status)}`}>
                        {model.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}