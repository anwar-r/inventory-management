-- Sales Database Setup Script
-- Run this in your Supabase SQL Editor to add sales functionality

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    customer_name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    invoice_number TEXT UNIQUE,
    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT, -- Store customer name for quick access
    customer_address TEXT,
    sale_date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'complete')),
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    subtotal DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sales_line_items table
CREATE TABLE IF NOT EXISTS sales_line_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT REFERENCES sales(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'Pcs',
    rate DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    serial_number INTEGER, -- For ordering items in the invoice
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_line_items_sale_id ON sales_line_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_line_items_product_id ON sales_line_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_number ON sales(invoice_number);

-- Enable Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_line_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to customers" ON customers
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to customers" ON customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to customers" ON customers
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to customers" ON customers
    FOR DELETE USING (true);

CREATE POLICY "Allow public read access to sales" ON sales
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to sales" ON sales
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to sales" ON sales
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to sales" ON sales
    FOR DELETE USING (true);

CREATE POLICY "Allow public read access to sales_line_items" ON sales_line_items
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to sales_line_items" ON sales_line_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to sales_line_items" ON sales_line_items
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to sales_line_items" ON sales_line_items
    FOR DELETE USING (true);

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    max_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+') AS INTEGER)), 0) + 1
    INTO max_number
    FROM sales
    WHERE invoice_number ~ '^[0-9]+$';
    
    new_number := LPAD(max_number::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at for customers
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update updated_at for sales
CREATE TRIGGER update_sales_updated_at 
    BEFORE UPDATE ON sales 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

