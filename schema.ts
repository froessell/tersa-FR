import { sql } from 'drizzle-orm';
import {
  boolean,
  json,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

const uuid = sql`uuid_generate_v4()`;

export const projects = pgTable('project', {
  id: text('id').primaryKey().default(uuid).notNull(),
  name: varchar('name').notNull(),
  transcriptionModel: varchar('transcription_model').notNull(),
  visionModel: varchar('vision_model').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  content: json('content'),
  userId: varchar('user_id').notNull(),
  image: varchar('image'),
  members: text('members').array(),
  welcomeProject: boolean('demo_project').notNull().default(false),
});

export const profile = pgTable('profile', {
  id: text('id').primaryKey().notNull(),
  customerId: text('customer_id'),
  subscriptionId: text('subscription_id'),
  productId: text('product_id'),
  onboardedAt: timestamp('onboarded_at'),
});

export const designSystems = pgTable('design_system', {
  id: text('id').primaryKey().default(uuid).notNull(),
  name: varchar('name').notNull(),
  description: text('description'),
  figmaFileKey: varchar('figma_file_key').notNull(),
  figmaFileName: varchar('figma_file_name'),
  figmaFileUrl: varchar('figma_file_url'),
  figmaAccessToken: text('figma_access_token').notNull(),
  userId: varchar('user_id').notNull(),
  isPublic: boolean('is_public').notNull().default(false),
  componentCount: varchar('component_count').default('0'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  settings: json('settings'), // For sync preferences, categories, etc.
});

export const designSystemComponents = pgTable('design_system_component', {
  id: text('id').primaryKey().default(uuid).notNull(),
  designSystemId: text('design_system_id').notNull(),
  figmaComponentId: varchar('figma_component_id').notNull(),
  figmaComponentKey: varchar('figma_component_key').notNull(),
  name: varchar('name').notNull(),
  description: text('description'),
  category: varchar('category').notNull(),
  tags: text('tags').array(),
  thumbnailUrl: text('thumbnail_url'),
  figmaData: json('figma_data'), // Store full Figma component metadata
  generatedCode: text('generated_code'),
  codeExplanation: text('code_explanation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
