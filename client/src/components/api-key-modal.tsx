import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const storedKey = localStorage.getItem('everart_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, [open]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Chyba",
        description: "API klíč je povinný",
        variant: "destructive"
      });
      return;
    }

    localStorage.setItem('everart_api_key', apiKey);
    toast({
      title: "Uloženo",
      description: "API klíč byl úspěšně uložen"
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Konfigurace API klíče</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="apiKey">EverArt API klíč</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="everart-TVŮJ-API-KLÍČ"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Váš API klíč bude uložen pouze lokálně
            </p>
          </div>
          <div className="flex space-x-3">
            <Button onClick={handleSave} className="flex-1">
              Uložit klíč
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Zrušit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
