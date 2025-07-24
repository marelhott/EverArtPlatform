import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Image as ImageIcon, CheckCircle } from "lucide-react";

interface GenerationSlot {
  id: string;
  status: 'empty' | 'generating' | 'completed' | 'failed';
  progress: number;
  imageUrl?: string;
  modelName?: string;
  error?: string;
}

interface GenerationSlotsProps {
  generations: any[];
  onSlotClick?: (slotId: string) => void;
}

export function GenerationSlots({ generations, onSlotClick }: GenerationSlotsProps) {
  const [slots, setSlots] = useState<GenerationSlot[]>([
    { id: '1', status: 'empty', progress: 0 },
    { id: '2', status: 'empty', progress: 0 },
    { id: '3', status: 'empty', progress: 0 },
    { id: '4', status: 'empty', progress: 0 }
  ]);

  // Listen for generation events from the app
  useEffect(() => {
    const handleGenerationStart = (event: CustomEvent) => {
      const { modelName, slotIndex } = event.detail;
      setSlots(currentSlots => {
        const newSlots = [...currentSlots];
        if (newSlots[slotIndex]) {
          newSlots[slotIndex] = {
            id: `generating-${Date.now()}-${slotIndex}`,
            status: 'generating',
            progress: 5,
            modelName: modelName
          };
        }
        return newSlots;
      });
    };

    const handleGenerationComplete = (event: CustomEvent) => {
      const { imageUrl, modelName, slotIndex } = event.detail;
      setSlots(currentSlots => {
        const newSlots = [...currentSlots];
        if (newSlots[slotIndex]) {
          newSlots[slotIndex] = {
            id: `completed-${Date.now()}-${slotIndex}`,
            status: 'completed',
            progress: 100,
            imageUrl: imageUrl,
            modelName: modelName
          };
        }
        return newSlots;
      });
    };

    const handleGenerationFailed = (event: CustomEvent) => {
      const { error, modelName, slotIndex } = event.detail;
      setSlots(currentSlots => {
        const newSlots = [...currentSlots];
        if (newSlots[slotIndex]) {
          newSlots[slotIndex] = {
            id: `failed-${Date.now()}-${slotIndex}`,
            status: 'failed',
            progress: 0,
            modelName: modelName,
            error: error
          };
        }
        return newSlots;
      });
    };

    window.addEventListener('generationStart', handleGenerationStart as EventListener);
    window.addEventListener('generationComplete', handleGenerationComplete as EventListener);
    window.addEventListener('generationFailed', handleGenerationFailed as EventListener);

    return () => {
      window.removeEventListener('generationStart', handleGenerationStart as EventListener);
      window.removeEventListener('generationComplete', handleGenerationComplete as EventListener);
      window.removeEventListener('generationFailed', handleGenerationFailed as EventListener);
    };
  }, []);

  // Simulate progress for generating slots
  useEffect(() => {
    const interval = setInterval(() => {
      setSlots(currentSlots => 
        currentSlots.map(slot => {
          if (slot.status === 'generating' && slot.progress < 95) {
            return {
              ...slot,
              progress: Math.min(slot.progress + Math.random() * 15, 95)
            };
          }
          return slot;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getSlotContent = (slot: GenerationSlot) => {
    switch (slot.status) {
      case 'empty':
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm text-center">Připraveno na generování</p>
          </div>
        );

      case 'generating':
        return (
          <div className="flex flex-col items-center justify-center h-full p-4 relative overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 animate-pulse"></div>
            
            {/* Floating particles effect */}
            <div className="absolute inset-0">
              <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
              <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-pink-400 rounded-full animate-bounce" style={{animationDelay: '1s'}}></div>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <Loader2 className="h-8 w-8 mb-4 animate-spin text-blue-500" />
              <p className="text-sm font-medium mb-2 text-center">{slot.modelName}</p>
              <div className="w-full mb-2">
                <Progress value={slot.progress} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.round(slot.progress)}% dokončeno
              </p>
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="relative h-full group cursor-pointer" onClick={() => onSlotClick?.(slot.id)}>
            <img
              src={slot.imageUrl}
              alt={`Generated by ${slot.modelName}`}
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white text-sm font-medium">{slot.modelName}</p>
            </div>
          </div>
        );

      case 'failed':
        return (
          <div className="flex flex-col items-center justify-center h-full text-red-500 p-4">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
              <span className="text-xl">✕</span>
            </div>
            <p className="text-sm font-medium text-center">{slot.modelName}</p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              {slot.error}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4 w-full">
      {slots.map((slot) => (
        <Card key={slot.id} className="aspect-[3/4] overflow-hidden hover:shadow-lg transition-shadow">
          {getSlotContent(slot)}
        </Card>
      ))}
    </div>
  );
}