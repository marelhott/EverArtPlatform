import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ModelsTab from "@/components/models-tab";
import CreateModelTab from "@/components/create-model-tab";
import MainFeedTab from "@/components/main-feed-tab";

import ApiKeyModal from "@/components/api-key-modal";
import { List, Plus, Wand2, Key, Wifi } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("apply");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  return (
    <div className="min-h-screen bg-background">


      <div className="container mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8 flex justify-center">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gradient-to-r from-secondary/30 via-card to-accent/30 rounded-2xl p-1 border border-border/50 shadow-lg backdrop-blur-sm">
              <TabsTrigger 
                value="apply"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground hover:text-foreground transition-all rounded-md px-4 py-2 text-sm font-medium"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Použít model
              </TabsTrigger>

              <TabsTrigger 
                value="create"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground hover:text-foreground transition-all rounded-md px-4 py-2 text-sm font-medium"
              >
                <Plus className="mr-2 h-4 w-4" />
                Vytvořit model
              </TabsTrigger>
              <TabsTrigger 
                value="models" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground hover:text-foreground transition-all rounded-md px-4 py-2 text-sm font-medium"
              >
                <List className="mr-2 h-4 w-4" />
                Všechny modely
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
        </div>

        {/* Tab Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="apply" className="mt-0">
            <MainFeedTab />
          </TabsContent>

          <TabsContent value="create" className="mt-0">
            <CreateModelTab />
          </TabsContent>
          <TabsContent value="models" className="mt-0">
            <ModelsTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* API Key Modal */}
      <ApiKeyModal 
        open={showApiKeyModal}
        onOpenChange={setShowApiKeyModal}
      />
    </div>
  );
}
