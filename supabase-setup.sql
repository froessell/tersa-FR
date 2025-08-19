-- Run this in your Supabase SQL Editor to create the required tables

-- Create projects table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS project (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    name VARCHAR NOT NULL,
    transcription_model VARCHAR NOT NULL,
    vision_model VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP,
    content JSONB,
    user_id VARCHAR NOT NULL,
    image VARCHAR,
    members TEXT[],
    demo_project BOOLEAN DEFAULT false NOT NULL
);

-- Create profile table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS profile (
    id TEXT PRIMARY KEY NOT NULL,
    customer_id TEXT,
    subscription_id TEXT,
    product_id TEXT,
    onboarded_at TIMESTAMP
);

-- Create design_system table
CREATE TABLE IF NOT EXISTS design_system (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    figma_file_key VARCHAR NOT NULL,
    figma_file_name VARCHAR,
    figma_file_url VARCHAR,
    figma_access_token TEXT NOT NULL,
    user_id VARCHAR NOT NULL,
    is_public BOOLEAN DEFAULT false NOT NULL,
    component_count VARCHAR DEFAULT '0',
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    settings JSONB
);

-- Create design_system_component table
CREATE TABLE IF NOT EXISTS design_system_component (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    design_system_id TEXT NOT NULL,
    figma_component_id VARCHAR NOT NULL,
    figma_component_key VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR NOT NULL,
    tags TEXT[],
    thumbnail_url TEXT,
    figma_data JSONB,
    generated_code TEXT,
    code_explanation TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Foreign key constraint
    CONSTRAINT fk_design_system_component_design_system 
        FOREIGN KEY (design_system_id) REFERENCES design_system(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_user_id ON project(user_id);
CREATE INDEX IF NOT EXISTS idx_design_system_user_id ON design_system(user_id);
CREATE INDEX IF NOT EXISTS idx_design_system_is_public ON design_system(is_public);
CREATE INDEX IF NOT EXISTS idx_design_system_component_design_system_id ON design_system_component(design_system_id);
CREATE INDEX IF NOT EXISTS idx_design_system_component_figma_key ON design_system_component(figma_component_key);

-- Enable Row Level Security (RLS) for Supabase
ALTER TABLE project ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_system_component ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic ones - you can customize these)
CREATE POLICY "Users can view their own projects" ON project
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own projects" ON project
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own projects" ON project
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own projects" ON project
    FOR DELETE USING (auth.uid()::text = user_id);

-- Similar policies for design_system
CREATE POLICY "Users can view their own design systems" ON design_system
    FOR SELECT USING (auth.uid()::text = user_id OR is_public = true);

CREATE POLICY "Users can insert their own design systems" ON design_system
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own design systems" ON design_system
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own design systems" ON design_system
    FOR DELETE USING (auth.uid()::text = user_id);

-- Policies for design_system_component
CREATE POLICY "Users can view components from their design systems" ON design_system_component
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM design_system 
            WHERE design_system.id = design_system_component.design_system_id 
            AND (design_system.user_id = auth.uid()::text OR design_system.is_public = true)
        )
    );

CREATE POLICY "Users can insert components to their design systems" ON design_system_component
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM design_system 
            WHERE design_system.id = design_system_component.design_system_id 
            AND design_system.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update components in their design systems" ON design_system_component
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM design_system 
            WHERE design_system.id = design_system_component.design_system_id 
            AND design_system.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete components from their design systems" ON design_system_component
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM design_system 
            WHERE design_system.id = design_system_component.design_system_id 
            AND design_system.user_id = auth.uid()::text
        )
    );

-- Profile policies
CREATE POLICY "Users can view their own profile" ON profile
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own profile" ON profile
    FOR UPDATE USING (auth.uid()::text = id);

-- Insert a sample project if none exist (optional)
INSERT INTO project (id, name, transcription_model, vision_model, user_id, demo_project)
SELECT 
    'welcome-project',
    'Welcome to Tersa',
    'whisper-1',
    'gpt-4-vision-preview',
    'demo-user',
    true
WHERE NOT EXISTS (SELECT 1 FROM project WHERE demo_project = true);

-- Done! Your tables are now set up in Supabase
