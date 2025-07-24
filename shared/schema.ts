import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const models = pgTable("models", {
  id: serial("id").primaryKey(),
  everartId: text("everart_id").notNull().unique(),
  name: text("name").notNull(),
  subject: text("subject").notNull(), // STYLE, PERSON, OBJECT
  status: text("status").notNull(), // READY, TRAINING, FAILED, CANCELED
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const generations = pgTable("generations", {
  id: serial("id").primaryKey(),
  modelId: text("model_id").notNull(),
  modelName: text("model_name"),
  inputImageUrl: text("input_image_url").notNull(),
  outputImageUrl: text("output_image_url"),
  cloudinaryUrl: text("cloudinary_url"),
  status: text("status").notNull(), // PENDING, PROCESSING, COMPLETED, FAILED
  errorMessage: text("error_message"),
  styleStrength: real("style_strength").default(0.6),
  width: integer("width").default(512),
  height: integer("height").default(512),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertModelSchema = createInsertSchema(models).omit({
  id: true,
  createdAt: true,
});

export const insertGenerationSchema = createInsertSchema(generations).omit({
  id: true,
  createdAt: true,
  outputImageUrl: true,
  cloudinaryUrl: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertModel = z.infer<typeof insertModelSchema>;
export type Model = typeof models.$inferSelect;
export type InsertGeneration = z.infer<typeof insertGenerationSchema>;
export type Generation = typeof generations.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
