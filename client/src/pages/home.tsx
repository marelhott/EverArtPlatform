import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ModelsTab from "@/components/models-tab";
import CreateModelTab from "@/components/create-model-tab";
import ApplyModelTab from "@/components/apply-model-tab";
import ModificationsTab from "@/components/modifications-tab";
import ApiKeyModal from "@/components/api-key-modal";
import { List, Plus, Wand2, Key, Wifi, Sparkles, Palette, Zap, Brain } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("apply");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  return (
    <div className="min-h-screen p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Hero Header */}
        <div className="text-center mb-12 animate-float">
          <div className="inline-block glass-neon rounded-3xl px-8 py-6 mb-6 animate-pulse-neon">
            <h1 className="text-display text-neon mb-2">
              EverArt AI
            </h1>
            <p className="text-xl text-foreground/80 font-medium">
              Pokročilá AI platforma pro transformaci obrázků
            </p>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="glass-card rounded-2xl p-6 hover:glass-neon transition-all duration-300 group">
              <div className="text-metric text-neon group-hover:scale-110 transition-transform">42</div>
              <div className="text-sm text-muted-foreground">Aktivních modelů</div>
            </div>
            <div className="glass-purple rounded-2xl p-6 animate-pulse-purple group">
              <div className="text-metric text-purple-neon group-hover:scale-110 transition-transform">1,337</div>
              <div className="text-sm text-muted-foreground">Generovaných obrázků</div>
            </div>
            <div className="glass-card rounded-2xl p-6 hover:glass-purple transition-all duration-300 group">
              <div className="text-metric text-foreground group-hover:text-purple-neon group-hover:scale-110 transition-all">∞</div>
              <div className="text-sm text-muted-foreground">Kreativních možností</div>
            </div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="glass-dark rounded-3xl overflow-hidden shadow-2xl">
          {/* Navigation Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex justify-between items-center">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="grid grid-cols-4 bg-transparent border-0 p-1 gap-2 max-w-2xl">
                  <TabsTrigger 
                    value="apply" 
                    className={`
                      relative rounded-xl p-3 font-semibold transition-all duration-300 flex items-center justify-center
                      ${activeTab === 'apply' 
                        ? 'glass-neon text-neon shadow-lg scale-105' 
                        : 'text-muted-foreground hover:text-foreground hover:glass-card'
                      }
                    `}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Použít model
                  </TabsTrigger>
                  <TabsTrigger 
                    value="modifications" 
                    className={`
                      relative rounded-xl p-3 font-semibold transition-all duration-300 flex items-center justify-center
                      ${activeTab === 'modifications' 
                        ? 'glass-purple text-purple-neon shadow-lg scale-105' 
                        : 'text-muted-foreground hover:text-foreground hover:glass-card'
                      }
                    `}
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Modifikace
                  </TabsTrigger>
                  <TabsTrigger 
                    value="create" 
                    className={`
                      relative rounded-xl p-3 font-semibold transition-all duration-300 flex items-center justify-center
                      ${activeTab === 'create' 
                        ? 'glass-neon text-neon shadow-lg scale-105' 
                        : 'text-muted-foreground hover:text-foreground hover:glass-card'
                      }
                    `}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Vytvořit
                  </TabsTrigger>
                  <TabsTrigger 
                    value="models" 
                    className={`
                      relative rounded-xl p-3 font-semibold transition-all duration-300 flex items-center justify-center
                      ${activeTab === 'models' 
                        ? 'glass-purple text-purple-neon shadow-lg scale-105' 
                        : 'text-muted-foreground hover:text-foreground hover:glass-card'
                      }
                    `}
                  >
                    <List className="w-4 h-4 mr-2" />
                    Modely
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button 
                onClick={() => setShowApiKeyModal(true)}
                className="btn-glass rounded-xl px-4 py-2 ml-6"
              >
                <Key className="mr-2 h-4 w-4" />
                API klíč
              </Button>
            </div>
          </div>
            
          {/* Tab Content */}
          <div className="p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="apply" className="mt-0">
                <ApplyModelTab />
              </TabsContent>
              <TabsContent value="modifications" className="mt-0">
                <ModificationsTab />
              </TabsContent>
              <TabsContent value="create" className="mt-0">
                <CreateModelTab />
              </TabsContent>
              <TabsContent value="models" className="mt-0">
                <ModelsTab />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-8 right-8 space-y-4">
          <div className="glass-neon rounded-full p-4 animate-pulse-neon cursor-pointer hover:scale-110 transition-transform">
            <Sparkles className="w-6 h-6 text-neon" />
          </div>
        </div>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal 
        open={showApiKeyModal}
        onOpenChange={setShowApiKeyModal}
      />
    </div>
  );
}