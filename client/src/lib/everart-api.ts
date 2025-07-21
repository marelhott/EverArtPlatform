import { apiRequest } from "./queryClient";
import type { Model, Generation } from "@shared/schema";

export interface EverArtModel {
  id: string;
  name: string;
  status: string;
  subject?: string;
  thumbnail_url?: string;
}

export interface ModelsResponse {
  models: Model[];
}

export interface GenerationResponse {
  generation: Generation;
  resultUrl: string;
}

export const everArtApi = {
  async getModels(): Promise<ModelsResponse> {
    const res = await apiRequest("GET", "/api/models");
    return res.json();
  },

  async createModel(formData: FormData): Promise<{ model: Model }> {
    const res = await fetch("/api/models", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text}`);
    }
    
    return res.json();
  },

  async getModelStatus(everartId: string): Promise<{ status: string; thumbnailUrl?: string }> {
    const res = await apiRequest("GET", `/api/models/${everartId}/status`);
    return res.json();
  },

  async applyModel(everartId: string, formData: FormData): Promise<GenerationResponse> {
    const res = await fetch(`/api/models/${everartId}/apply`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text}`);
    }
    
    return res.json();
  },

  async getGenerations(): Promise<{ generations: Generation[] }> {
    const res = await apiRequest("GET", "/api/generations");
    return res.json();
  }
};
