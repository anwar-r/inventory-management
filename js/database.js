// Supabase Database Manager for CRUD operations
class DatabaseManager {
    constructor() {
        this.supabase = null;
        this.isInitialized = false;
    }

    // Initialize database
    async init() {
        try {
            // Load Supabase client
            await this.loadSupabase();
            
            // Initialize Supabase client
            this.supabase = supabase.createClient(
                'https://pvpqsiyihessbiontrcl.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2cHFzaXlpaGVzc2Jpb250cmNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5Njc5NjQsImV4cCI6MjA3MTU0Mzk2NH0.E7904ifpTdSK2BkBUr2XEwIJ9R1Ot4DXqmd9MlV0wjM'
            );
            
            // Check if tables exist
            await this.checkDatabaseSetup();
            
            this.isInitialized = true;
            console.log('Supabase database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    // Check if database tables exist
    async checkDatabaseSetup() {
        try {
            console.log('Checking database setup...');
            
            // Try to query the products table
            const { data, error } = await this.supabase
                .from('products')
                .select('count')
                .limit(1);
            
            if (error) {
                console.error('Database setup error:', error);
                if (error.code === 'PGRST116') {
                    console.error('❌ Products table does not exist! Please run the SQL setup script.');
                    alert('Database tables not found! Please run the SQL setup script in Supabase dashboard.');
                }
                throw error;
            }
            
            console.log('✅ Database tables exist and are accessible');
        } catch (error) {
            console.error('Database setup check failed:', error);
            throw error;
        }
    }

    // Load Supabase library
    async loadSupabase() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = () => {
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Add product
    async addProduct(product) {
        try {
            console.log('Attempting to add product:', product);
            
            // Insert product
            const { data: productData, error: productError } = await this.supabase
                .from('products')
                .insert([{
                    product_name: product.product_name,
                    company_name: product.company_name,
                    product_quality: product.product_quality,
                    quantity_bundle: product.quantity_bundle,
                    purchase_price: product.purchase_price,
                    wholesale_price: product.wholesale_price,
                    retail_price: product.retail_price,
                    image_data: product.image_data
                }])
                .select();

            if (productError) {
                console.error('Product insert error:', productError);
                throw productError;
            }

            console.log('Product inserted successfully:', productData);
            const productId = productData[0].id;

            // Insert dynamic fields
            if (product.dynamicFields && product.dynamicFields.length > 0) {
                const dynamicFieldsData = product.dynamicFields
                    .filter(field => field.name && field.value)
                    .map(field => ({
                        product_id: productId,
                        field_name: field.name,
                        field_value: field.value,
                        field_type: field.type || 'text'
                    }));

                if (dynamicFieldsData.length > 0) {
                    console.log('Inserting dynamic fields:', dynamicFieldsData);
                    const { error: fieldsError } = await this.supabase
                        .from('dynamic_fields')
                        .insert(dynamicFieldsData);

                    if (fieldsError) {
                        console.error('Dynamic fields insert error:', fieldsError);
                        throw fieldsError;
                    }
                }
            }

            return { ...product, id: productId };
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    // Update product
    async updateProduct(id, product) {
        try {
            // Update product
            const { error: productError } = await this.supabase
                .from('products')
                .update({
                    product_name: product.product_name,
                    company_name: product.company_name,
                    product_quality: product.product_quality,
                    quantity_bundle: product.quantity_bundle,
                    purchase_price: product.purchase_price,
                    wholesale_price: product.wholesale_price,
                    retail_price: product.retail_price,
                    image_data: product.image_data,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (productError) throw productError;

            // Update dynamic fields
            await this.supabase
                .from('dynamic_fields')
                .delete()
                .eq('product_id', id);

            if (product.dynamicFields && product.dynamicFields.length > 0) {
                const dynamicFieldsData = product.dynamicFields
                    .filter(field => field.name && field.value)
                    .map(field => ({
                        product_id: id,
                        field_name: field.name,
                        field_value: field.value,
                        field_type: field.type || 'text'
                    }));

                if (dynamicFieldsData.length > 0) {
                    const { error: fieldsError } = await this.supabase
                        .from('dynamic_fields')
                        .insert(dynamicFieldsData);

                    if (fieldsError) throw fieldsError;
                }
            }

            return this.getProductById(id);
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    // Delete product
    async deleteProduct(id) {
        try {
            const { error } = await this.supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    // Get product by ID
    async getProductById(id) {
        try {
            const { data: products, error } = await this.supabase
                .from('products')
                .select(`
                    *,
                    dynamic_fields (*)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return products;
        } catch (error) {
            console.error('Error getting product:', error);
            return null;
        }
    }

    // Get all products
    async getAllProducts() {
        try {
            const { data: products, error } = await this.supabase
                .from('products')
                .select(`
                    *,
                    dynamic_fields (*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return products || [];
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    }

    // Search products
    async searchProducts(query) {
        try {
            const { data: products, error } = await this.supabase
                .from('products')
                .select(`
                    *,
                    dynamic_fields (*)
                `)
                .or(`product_name.ilike.%${query}%,company_name.ilike.%${query}%,product_quality.ilike.%${query}%`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return products || [];
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    }

    // Convert file to base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                // Resize to max 300x300
                const maxSize = 300;
                let { width, height } = img;
                
                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                resolve(base64);
            };
            
            img.onerror = reject;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Get image by image ID (for preview functionality)
    getImageByImageId(imageId) {
        // Since images are stored as base64 data directly in the image_data field,
        // the imageId is actually the base64 data itself
        if (!imageId) {
            return null;
        }
        
        return {
            base64_data: imageId
        };
    }

    // Get statistics
    async getStats() {
        try {
            const { data: products, error } = await this.supabase
                .from('products')
                .select('*');

            if (error) throw error;

            const totalProducts = products.length;
            const companies = [...new Set(products.map(p => p.company_name))].length;
            const avgPrice = products.length > 0 
                ? Math.round(products.reduce((sum, p) => {
                    // retail_price is now INTEGER, so we can use it directly
                    const price = p.retail_price || 0;
                    return sum + price;
                }, 0) / products.length)
                : 0;

            return {
                totalProducts,
                totalCategories: companies,
                avgPrice,
                totalImages: products.filter(p => p.image_data).length
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return { totalProducts: 0, totalCategories: 0, avgPrice: 0, totalImages: 0 };
        }
    }

    // Export database (simplified for Supabase)
    async exportDatabase() {
        try {
            const { data: products, error } = await this.supabase
                .from('products')
                .select(`
                    *,
                    dynamic_fields (*)
                `);

            if (error) throw error;

            const exportData = {
                products: products || [],
                exportDate: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.json`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Database exported successfully');
        } catch (error) {
            console.error('Error exporting database:', error);
        }
    }

    // Import database (simplified for Supabase)
    async importDatabase(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            if (importData.products && Array.isArray(importData.products)) {
                for (const product of importData.products) {
                    const dynamicFields = product.dynamic_fields || [];
                    delete product.dynamic_fields;
                    delete product.id;
                    delete product.created_at;
                    delete product.updated_at;

                    await this.addProduct({
                        ...product,
                        dynamicFields: dynamicFields.map(field => ({
                            name: field.field_name,
                            value: field.field_value,
                            type: field.field_type
                        }))
                    });
                }
            }

            console.log('Database imported successfully');
            return true;
        } catch (error) {
            console.error('Error importing database:', error);
            return false;
        }
    }

    // ========== SALES OPERATIONS ==========

    // Add customer
    async addCustomer(customer) {
        try {
            const { data, error } = await this.supabase
                .from('customers')
                .insert([{
                    customer_name: customer.customer_name,
                    address: customer.address || null,
                    phone: customer.phone || null,
                    email: customer.email || null
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error adding customer:', error);
            throw error;
        }
    }

    // Get all customers
    async getAllCustomers() {
        try {
            const { data, error } = await this.supabase
                .from('customers')
                .select('*')
                .order('customer_name', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting customers:', error);
            return [];
        }
    }

    // Search customers
    async searchCustomers(query) {
        try {
            const { data, error } = await this.supabase
                .from('customers')
                .select('*')
                .or(`customer_name.ilike.%${query}%,address.ilike.%${query}%,phone.ilike.%${query}%`)
                .order('customer_name', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error searching customers:', error);
            return [];
        }
    }

    // Get customer by ID
    async getCustomerById(id) {
        try {
            const { data, error } = await this.supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting customer:', error);
            return null;
        }
    }

    // Add sale
    async addSale(sale) {
        try {
            // Generate invoice number if not provided
            if (!sale.invoice_number) {
                const { data: invoiceData } = await this.supabase
                    .rpc('generate_invoice_number');
                sale.invoice_number = invoiceData || await this.generateInvoiceNumberFallback();
            }

            const { data: saleData, error: saleError } = await this.supabase
                .from('sales')
                .insert([{
                    invoice_number: sale.invoice_number,
                    customer_id: sale.customer_id || null,
                    customer_name: sale.customer_name || null,
                    customer_address: sale.customer_address || null,
                    sale_date: sale.sale_date || new Date().toISOString().split('T')[0],
                    status: sale.status || 'draft',
                    discount_amount: sale.discount_amount || 0,
                    discount_percentage: sale.discount_percentage || 0,
                    subtotal: sale.subtotal || 0,
                    total_amount: sale.total_amount || 0,
                    notes: sale.notes || null
                }])
                .select()
                .single();

            if (saleError) throw saleError;

            // Add line items
            if (sale.line_items && sale.line_items.length > 0) {
                const lineItemsData = sale.line_items.map((item, index) => ({
                    sale_id: saleData.id,
                    product_id: item.product_id || null,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    unit: item.unit || 'Pcs',
                    rate: item.rate,
                    amount: item.amount,
                    serial_number: index + 1
                }));

                const { error: itemsError } = await this.supabase
                    .from('sales_line_items')
                    .insert(lineItemsData);

                if (itemsError) throw itemsError;
            }

            return await this.getSaleById(saleData.id);
        } catch (error) {
            console.error('Error adding sale:', error);
            throw error;
        }
    }

    // Generate invoice number fallback
    async generateInvoiceNumberFallback() {
        try {
            const { data, error } = await this.supabase
                .from('sales')
                .select('invoice_number')
                .order('id', { ascending: false })
                .limit(1);

            if (error || !data || data.length === 0) {
                return '1';
            }

            const lastInvoice = data[0].invoice_number;
            const lastNumber = parseInt(lastInvoice) || 0;
            return String(lastNumber + 1);
        } catch (error) {
            return String(Date.now());
        }
    }

    // Update sale
    async updateSale(id, sale) {
        try {
            // Update sale
            const { error: saleError } = await this.supabase
                .from('sales')
                .update({
                    customer_id: sale.customer_id || null,
                    customer_name: sale.customer_name || null,
                    customer_address: sale.customer_address || null,
                    sale_date: sale.sale_date || null,
                    status: sale.status || 'draft',
                    discount_amount: sale.discount_amount || 0,
                    discount_percentage: sale.discount_percentage || 0,
                    subtotal: sale.subtotal || 0,
                    total_amount: sale.total_amount || 0,
                    notes: sale.notes || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (saleError) throw saleError;

            // Update line items - delete existing and insert new
            await this.supabase
                .from('sales_line_items')
                .delete()
                .eq('sale_id', id);

            if (sale.line_items && sale.line_items.length > 0) {
                const lineItemsData = sale.line_items.map((item, index) => ({
                    sale_id: id,
                    product_id: item.product_id || null,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    unit: item.unit || 'Pcs',
                    rate: item.rate,
                    amount: item.amount,
                    serial_number: index + 1
                }));

                const { error: itemsError } = await this.supabase
                    .from('sales_line_items')
                    .insert(lineItemsData);

                if (itemsError) throw itemsError;
            }

            return await this.getSaleById(id);
        } catch (error) {
            console.error('Error updating sale:', error);
            throw error;
        }
    }

    // Get sale by ID
    async getSaleById(id) {
        try {
            const { data: sale, error: saleError } = await this.supabase
                .from('sales')
                .select('*')
                .eq('id', id)
                .single();

            if (saleError) throw saleError;

            const { data: lineItems, error: itemsError } = await this.supabase
                .from('sales_line_items')
                .select('*')
                .eq('sale_id', id)
                .order('serial_number', { ascending: true });

            if (itemsError) throw itemsError;

            return {
                ...sale,
                line_items: lineItems || []
            };
        } catch (error) {
            console.error('Error getting sale:', error);
            return null;
        }
    }

    // Get all sales
    async getAllSales() {
        try {
            const { data: sales, error: saleError } = await this.supabase
                .from('sales')
                .select('*')
                .order('created_at', { ascending: false });

            if (saleError) throw saleError;

            // Get line items for each sale
            const salesWithItems = await Promise.all(
                (sales || []).map(async (sale) => {
                    const { data: lineItems } = await this.supabase
                        .from('sales_line_items')
                        .select('*')
                        .eq('sale_id', sale.id)
                        .order('serial_number', { ascending: true });

                    return {
                        ...sale,
                        line_items: lineItems || []
                    };
                })
            );

            return salesWithItems;
        } catch (error) {
            console.error('Error getting sales:', error);
            return [];
        }
    }

    // Delete sale
    async deleteSale(id) {
        try {
            const { error } = await this.supabase
                .from('sales')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting sale:', error);
            throw error;
        }
    }
}

// Create global instance
window.databaseManager = new DatabaseManager();

// Initialize immediately
(async function() {
    try {
        await window.databaseManager.init();
        console.log('Database manager initialized globally');
    } catch (error) {
        console.error('Failed to initialize database manager:', error);
    }
})();

