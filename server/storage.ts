import { models, generations, users, type Model, type Generation, type User, type InsertModel, type InsertGeneration, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
  isModelDeleted(everartId: string): Promise<boolean>;
  
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
  private deletedModelIds: Set<string>; // Track deleted model IDs
  private currentUserId: number;
  private currentModelId: number;
  private currentGenerationId: number;

  constructor() {
    this.users = new Map();
    this.models = new Map();
    this.generations = new Map();
    this.deletedModelIds = new Set();
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
      // Add to deleted list and remove from models
      this.deletedModelIds.add(everartId);
      return this.models.delete(model.id);
    }
    return false;
  }

  async isModelDeleted(everartId: string): Promise<boolean> {
    return this.deletedModelIds.has(everartId);
  }

  async getAllGenerations(): Promise<Generation[]> {
    return Array.from(this.generations.values()).sort((a, b) => b.id - a.id);
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

  async deleteGeneration(id: number): Promise<boolean> {
    return this.generations.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllModels(): Promise<Model[]> {
    return await db.select().from(models);
  }

  async getModel(id: number): Promise<Model | undefined> {
    const [model] = await db.select().from(models).where(eq(models.id, id));
    return model || undefined;
  }

  async getModelByEverartId(everartId: string): Promise<Model | undefined> {
    const [model] = await db.select().from(models).where(eq(models.everartId, everartId));
    return model || undefined;
  }

  async createModel(insertModel: InsertModel): Promise<Model> {
    const [model] = await db.insert(models).values(insertModel).returning();
    return model;
  }

  async updateModelStatus(everartId: string, status: string, thumbnailUrl?: string): Promise<Model | undefined> {
    const updates: Partial<Model> = { status };
    if (thumbnailUrl) updates.thumbnailUrl = thumbnailUrl;
    
    const [model] = await db.update(models)
      .set(updates)
      .where(eq(models.everartId, everartId))
      .returning();
    return model || undefined;
  }

  async deleteModel(everartId: string): Promise<boolean> {
    const result = await db.delete(models).where(eq(models.everartId, everartId));
    return result.rowCount > 0;
  }

  async isModelDeleted(everartId: string): Promise<boolean> {
    // For database storage, we don't track deleted models - we just sync with EverArt
    // This allows re-adding models that were previously removed
    return false;
  }

  async getAllGenerations(): Promise<Generation[]> {
    return await db.select().from(generations)
      .where(eq(generations.isDeleted, false))
      .orderBy(desc(generations.id));
  }

  async getGeneration(id: number): Promise<Generation | undefined> {
    const [generation] = await db.select().from(generations).where(eq(generations.id, id));
    return generation || undefined;
  }

  async createGeneration(insertGeneration: InsertGeneration): Promise<Generation> {
    const [generation] = await db.insert(generations).values(insertGeneration).returning();
    return generation;
  }

  async updateGeneration(id: number, updates: Partial<Generation>): Promise<Generation | undefined> {
    const [generation] = await db.update(generations)
      .set(updates)
      .where(eq(generations.id, id))
      .returning();
    return generation || undefined;
  }

  async deleteGeneration(id: number): Promise<boolean> {
    // Soft delete - mark as deleted instead of actually deleting
    const result = await db.update(generations)
      .set({ isDeleted: true })
      .where(eq(generations.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
