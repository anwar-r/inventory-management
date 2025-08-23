-- Supabase Database Setup Script
-- Run this in your Supabase SQL Editor

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    product_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    product_quality TEXT NOT NULL,
    quantity_bundle INTEGER NOT NULL,
    purchase_price DECIMAL(10,2) NOT NULL,
    wholesale_price DECIMAL(10,2) NOT NULL,
    retail_price DECIMAL(10,2) NOT NULL,
    image_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dynamic_fields table
CREATE TABLE IF NOT EXISTS dynamic_fields (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_value TEXT,
    field_type TEXT NOT NULL DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_company_name ON products(company_name);
CREATE INDEX IF NOT EXISTS idx_dynamic_fields_product_id ON dynamic_fields(product_id);

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_fields ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can modify these based on your security needs)
CREATE POLICY "Allow public read access to products" ON products
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to products" ON products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to products" ON products
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to products" ON products
    FOR DELETE USING (true);

CREATE POLICY "Allow public read access to dynamic_fields" ON dynamic_fields
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to dynamic_fields" ON dynamic_fields
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to dynamic_fields" ON dynamic_fields
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to dynamic_fields" ON dynamic_fields
    FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
