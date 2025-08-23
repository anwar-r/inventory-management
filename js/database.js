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
                ? Math.round(products.reduce((sum, p) => sum + (p.retail_price || 0), 0) / products.length)
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

