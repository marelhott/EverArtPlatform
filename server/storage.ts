import { models, generations, users, type Model, type Generation, type User, type InsertModel, type InsertGeneration, type InsertUser } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Model methods
  getAllModels(): Promise<Model[]>;
  getModel(id: number): Promise<Model | undefined>;
  getModelByEverartId(everartId: string): Promise<Model | undefined>;
  createModel(model: InsertModel): Promise<Model>;
  updateModelStatus(everartId: string, status: string, thumbnailUrl?: string): Promise<Model | undefined>;
  deleteModel(everartId: string): Promise<boolean>;
  
  // Generation methods
  getAllGenerations(): Promise<Generation[]>;
  getGeneration(id: number): Promise<Generation | undefined>;
  createGeneration(generation: InsertGeneration): Promise<Generation>;
  updateGeneration(id: number, updates: Partial<Generation>): Promise<Generation | undefined>;
  deleteGeneration(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private models: Map<number, Model>;
  private generations: Map<number, Generation>;
  private currentUserId: number;
  private currentModelId: number;
  private currentGenerationId: number;

  constructor() {
    this.users = new Map();
    this.models = new Map();
    this.generations = new Map();
    this.currentUserId = 1;
    this.currentModelId = 1;
    this.currentGenerationId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllModels(): Promise<Model[]> {
    return Array.from(this.models.values());
  }

  async getModel(id: number): Promise<Model | undefined> {
    return this.models.get(id);
  }

  async getModelByEverartId(everartId: string): Promise<Model | undefined> {
    return Array.from(this.models.values()).find(model => model.everartId === everartId);
  }

  async createModel(insertModel: InsertModel): Promise<Model> {
    const id = this.currentModelId++;
    const model: Model = { 
      ...insertModel, 
      id, 
      createdAt: new Date(),
      thumbnailUrl: insertModel.thumbnailUrl || null
    };
    this.models.set(id, model);
    return model;
  }

  async updateModelStatus(everartId: string, status: string, thumbnailUrl?: string): Promise<Model | undefined> {
    const model = await this.getModelByEverartId(everartId);
    if (model) {
      const updated = { ...model, status, ...(thumbnailUrl && { thumbnailUrl }) };
      this.models.set(model.id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteModel(everartId: string): Promise<boolean> {
    const model = await this.getModelByEverartId(everartId);
    if (model) {
      return this.models.delete(model.id);
    }
    return false;
  }

  async getAllGenerations(): Promise<Generation[]> {
    return Array.from(this.generations.values());
  }

  async getGeneration(id: number): Promise<Generation | undefined> {
    return this.generations.get(id);
  }

  async createGeneration(insertGeneration: InsertGeneration): Promise<Generation> {
    const id = this.currentGenerationId++;
    const generation: Generation = { 
      ...insertGeneration,
      styleStrength: insertGeneration.styleStrength ?? null,
      width: insertGeneration.width ?? null,
      height: insertGeneration.height ?? null,
      id, 
      createdAt: new Date(),
      outputImageUrl: null
    };
    this.generations.set(id, generation);
    return generation;
  }

  async updateGeneration(id: number, updates: Partial<Generation>): Promise<Generation | undefined> {
    const generation = this.generations.get(id);
    if (generation) {
      const updated = { ...generation, ...updates };
      this.generations.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteGeneration(id: number): Promise<boolean> {
    return this.generations.delete(id);
  }
}

export const storage = new MemStorage();
