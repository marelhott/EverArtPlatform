import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ModelsTab from "@/components/models-tab";
import CreateModelTab from "@/components/create-model-tab";
import ApplyModelTab from "@/components/apply-model-tab";
import ApiKeyModal from "@/components/api-key-modal";
import { List, Plus, Wand2, Key, Wifi } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("models");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wand2 className="h-8 w-8" />
              <h1 className="text-2xl font-bold">EverArt AI</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm opacity-90">API Status:</span>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">Připojeno</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-border">
            <nav className="flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="grid w-full max-w-md grid-cols-3 bg-transparent border-none p-0 h-auto">
                  <TabsTrigger 
                    value="models" 
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent py-2 px-4 font-medium text-sm rounded-none bg-transparent"
                  >
                    <List className="mr-2 h-4 w-4" />
                    Všechny modely
                  </TabsTrigger>
                  <TabsTrigger 
                    value="create"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent py-2 px-4 font-medium text-sm rounded-none bg-transparent"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Vytvořit model
                  </TabsTrigger>
                  <TabsTrigger 
                    value="apply"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary border-b-2 border-transparent py-2 px-4 font-medium text-sm rounded-none bg-transparent"
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Použít model
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowApiKeyModal(true)}
                className="ml-4"
              >
                <Key className="mr-2 h-4 w-4" />
                API klíč
              </Button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="models" className="mt-0">
            <ModelsTab />
          </TabsContent>
          <TabsContent value="create" className="mt-0">
            <CreateModelTab />
          </TabsContent>
          <TabsContent value="apply" className="mt-0">
            <ApplyModelTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span>EverArt AI Webová Aplikace</span>
              <span className="mx-2">•</span>
              <span>Verze 1.0</span>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary">Dokumentace</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary">Podpora</a>
            </div>
          </div>
        </div>
      </footer>

      {/* API Key Modal */}
      <ApiKeyModal 
        open={showApiKeyModal}
        onOpenChange={setShowApiKeyModal}
      />
    </div>
  );
}
