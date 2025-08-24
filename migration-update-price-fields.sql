-- Migration Script to Update Price Fields
-- Run this in your Supabase SQL Editor to update existing database
-- Purchase Price: TEXT (for values like "LA")
-- Wholesale Price: TEXT (for flexibility)
-- Retail Price: INTEGER (numeric values only)

-- Update purchase_price to TEXT (for non-numeric values like "LA")
ALTER TABLE products 
ALTER COLUMN purchase_price TYPE TEXT USING purchase_price::TEXT;

-- Update wholesale_price to TEXT (for flexibility)
ALTER TABLE products 
ALTER COLUMN wholesale_price TYPE TEXT USING wholesale_price::TEXT;

-- Update retail_price to INTEGER (numeric values only)
ALTER TABLE products 
ALTER COLUMN retail_price TYPE INTEGER USING retail_price::INTEGER;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('purchase_price', 'wholesale_price', 'retail_price');
