-- Migration script to create design system tables
-- Run this with: npx drizzle-kit push

-- Create design_system table
CREATE TABLE IF NOT EXISTS design_system (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
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
    settings JSON
);

-- Create design_system_component table
CREATE TABLE IF NOT EXISTS design_system_component (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    design_system_id TEXT NOT NULL,
    figma_component_id VARCHAR NOT NULL,
    figma_component_key VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR NOT NULL,
    tags TEXT[],
    thumbnail_url TEXT,
    figma_data JSON,
    generated_code TEXT,
    code_explanation TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Foreign key constraint
    FOREIGN KEY (design_system_id) REFERENCES design_system(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_design_system_user_id ON design_system(user_id);
CREATE INDEX IF NOT EXISTS idx_design_system_is_public ON design_system(is_public);
CREATE INDEX IF NOT EXISTS idx_design_system_component_design_system_id ON design_system_component(design_system_id);
CREATE INDEX IF NOT EXISTS idx_design_system_component_figma_key ON design_system_component(figma_component_key);

-- Add comments
COMMENT ON TABLE design_system IS 'User design systems connected to Figma files';
COMMENT ON TABLE design_system_component IS 'Components synced from Figma design systems';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON design_system TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON design_system_component TO your_app_user;
