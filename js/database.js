// Database Manager using SQLite for persistent storage
class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.dbName = 'inventory-database';
        this.dbVersion = 1;
    }

    // Initialize database
    async init() {
        try {
            // Load SQL.js
            if (typeof SQL === 'undefined') {
                await this.loadSQLJS();
            }

            // Initialize IndexedDB
            await this.initIndexedDB();

            // Create or load database
            await this.createDatabase();
            
            // Migrate database schema if needed
            await this.migrateDatabaseSchema();
            
            // Migrate any existing image data if needed
            await this.migrateImageData();
            
            this.isInitialized = true;
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    // Initialize IndexedDB
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.indexedDB = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('sqlite-data')) {
                    db.createObjectStore('sqlite-data', { keyPath: 'id' });
                }
            };
        });
    }

    // Load SQL.js library
    async loadSQLJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
            script.onload = () => {
                // Initialize SQL.js
                initSqlJs({
                    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
                }).then(SQL => {
                    window.SQL = SQL;
                    resolve();
                }).catch(reject);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Create database and tables
    async createDatabase() {
        try {
            // Try to load existing database from IndexedDB
            let existingDB = await this.loadFromIndexedDB();
            
            // If no data in IndexedDB, try to migrate from localStorage
            if (!existingDB) {
                existingDB = await this.migrateFromLocalStorage();
            }
            
            if (existingDB) {
                // Load existing database
                this.db = new SQL.Database(existingDB);
                console.log('Existing database loaded from IndexedDB');
                
                // Verify image data after loading
                this.verifyImageData();
            } else {
                // Create new database
                this.db = new SQL.Database();
                await this.createTables();
                console.log('New database created');
                
                // Save the new database to IndexedDB
                await this.saveToIndexedDB();
            }
        } catch (error) {
            console.error('Error creating database:', error);
            // Create new database if loading fails
            this.db = new SQL.Database();
            await this.createTables();
            await this.saveToIndexedDB();
        }
    }

    // Migrate data from localStorage to IndexedDB
    async migrateFromLocalStorage() {
        try {
            const existingDB = localStorage.getItem('inventory-database');
            if (existingDB) {
                console.log('Migrating database from localStorage to IndexedDB...');
                const uint8Array = new Uint8Array(existingDB.split(',').map(Number));
                
                // Save to IndexedDB
                await this.saveToIndexedDB();
                
                // Clear localStorage
                localStorage.removeItem('inventory-database');
                console.log('Migration completed successfully');
                
                return uint8Array;
            }
            return null;
        } catch (error) {
            console.error('Error migrating from localStorage:', error);
            return null;
        }
    }

    // Create database tables
    async createTables() {
        const createProductsTable = `
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_name TEXT NOT NULL,
                company_name TEXT NOT NULL,
                product_quality TEXT NOT NULL,
                quantity_bundle INTEGER NOT NULL,
                purchase_price REAL NOT NULL,
                wholesale_price REAL NOT NULL,
                retail_price REAL NOT NULL,
                image_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createDynamicFieldsTable = `
            CREATE TABLE IF NOT EXISTS dynamic_fields (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                field_name TEXT NOT NULL,
                field_value TEXT,
                field_type TEXT NOT NULL,
                field_order INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
            )
        `;

        const createImagesTable = `
            CREATE TABLE IF NOT EXISTS images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                image_id TEXT UNIQUE NOT NULL,
                product_id INTEGER NOT NULL,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                base64_data TEXT NOT NULL,
                original_name TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                mime_type TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
            )
        `;

        try {
            this.db.run(createProductsTable);
            this.db.run(createImagesTable);
            this.db.run(createDynamicFieldsTable);
            
            // Remove categories table if it exists (cleanup)
            try {
                this.db.run('DROP TABLE IF EXISTS categories');
                console.log('Categories table removed');
            } catch (e) {
                // Ignore if table doesn't exist
            }
            
            console.log('Database tables created successfully');
        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
    }

    // Save database to IndexedDB
    async saveToIndexedDB() {
        try {
            if (this.db) {
                const data = this.db.export();
                const transaction = this.indexedDB.transaction(['sqlite-data'], 'readwrite');
                const store = transaction.objectStore('sqlite-data');
                
                await new Promise((resolve, reject) => {
                    const request = store.put({ id: 'database', data: data });
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
                
                console.log('Database saved to IndexedDB');
                
                // Verify image data is preserved
                this.verifyImageData();
            }
        } catch (error) {
            console.error('Error saving database to IndexedDB:', error);
        }
    }

    // Load database from IndexedDB
    async loadFromIndexedDB() {
        try {
            const transaction = this.indexedDB.transaction(['sqlite-data'], 'readonly');
            const store = transaction.objectStore('sqlite-data');
            
            return new Promise((resolve, reject) => {
                const request = store.get('database');
                request.onsuccess = () => {
                    if (request.result) {
                        resolve(request.result.data);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('Error loading database from IndexedDB:', error);
            return null;
        }
    }

    // Save database (alias for backward compatibility)
    async saveDatabase() {
        return this.saveToIndexedDB();
    }

    // Export database as file
    exportDatabase() {
        try {
            // Verify image data before export
            this.verifyImageData();
            
            const data = this.db.export();
            const blob = new Blob([data], { type: 'application/x-sqlite3' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory-database-${new Date().toISOString().split('T')[0]}.db`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Database exported successfully with image data');
        } catch (error) {
            console.error('Error exporting database:', error);
        }
    }

    // Import database from file
    async importDatabase(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Close existing database
            if (this.db) {
                this.db.close();
            }
            
            // Load new database
            this.db = new SQL.Database(uint8Array);
            
            // Verify image data after import
            this.verifyImageData();
            
            await this.saveDatabase();
            
            console.log('Database imported successfully with image data');
            return true;
        } catch (error) {
            console.error('Error importing database:', error);
            return false;
        }
    }

    // Product operations
    async addProduct(product) {
        try {
            // Validate required fields
            if (!product.product_name || !product.company_name || !product.product_quality) {
                throw new Error('Required fields are missing');
            }

            // Validate numeric fields
            if (isNaN(product.quantity_bundle) || isNaN(product.purchase_price) || 
                isNaN(product.wholesale_price) || isNaN(product.retail_price)) {
                throw new Error('Invalid numeric values');
            }

            const stmt = this.db.prepare(`
                INSERT INTO products (product_name, company_name, product_quality, quantity_bundle, purchase_price, wholesale_price, retail_price, image_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                product.product_name,
                product.company_name,
                product.product_quality,
                product.quantity_bundle,
                product.purchase_price,
                product.wholesale_price,
                product.retail_price,
                product.image_id || null
            ]);
            
            const productId = this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
            
            // Save dynamic fields (optional)
            if (product.dynamicFields && Array.isArray(product.dynamicFields) && product.dynamicFields.length > 0) {
                for (let i = 0; i < product.dynamicFields.length; i++) {
                    const field = product.dynamicFields[i];
                    if (field && field.name && field.name.trim() && field.value !== undefined && field.value !== null) {
                        try {
                            this.db.run(`
                                INSERT INTO dynamic_fields (product_id, field_name, field_value, field_type, field_order)
                                VALUES (?, ?, ?, ?, ?)
                            `, [productId, field.name.trim(), field.value.toString(), field.type || 'text', i + 1]);
                        } catch (fieldError) {
                            console.warn('Failed to save dynamic field:', fieldError);
                            // Continue with other fields
                        }
                    }
                }
            }
            
            await this.saveDatabase();
            
            return { ...product, id: productId };
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    async updateProduct(id, product) {
        try {
            // Validate required fields
            if (!product.product_name || !product.company_name || !product.product_quality) {
                throw new Error('Required fields are missing');
            }

            // Validate numeric fields
            if (isNaN(product.quantity_bundle) || isNaN(product.purchase_price) || 
                isNaN(product.wholesale_price) || isNaN(product.retail_price)) {
                throw new Error('Invalid numeric values');
            }

            // Get existing product to preserve image_id if not updating
            const existingProduct = this.getProductById(id);
            const imageId = product.image_id || existingProduct.image_id;

            const stmt = this.db.prepare(`
                UPDATE products 
                SET product_name = ?, company_name = ?, product_quality = ?, quantity_bundle = ?, purchase_price = ?, wholesale_price = ?, retail_price = ?, image_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            
            stmt.run([
                product.product_name,
                product.company_name,
                product.product_quality,
                product.quantity_bundle,
                product.purchase_price,
                product.wholesale_price,
                product.retail_price,
                imageId,
                id
            ]);
            
            // Update dynamic fields (optional)
            this.db.run('DELETE FROM dynamic_fields WHERE product_id = ?', [id]);
            if (product.dynamicFields && Array.isArray(product.dynamicFields) && product.dynamicFields.length > 0) {
                for (let i = 0; i < product.dynamicFields.length; i++) {
                    const field = product.dynamicFields[i];
                    if (field && field.name && field.name.trim() && field.value !== undefined && field.value !== null) {
                        try {
                            this.db.run(`
                                INSERT INTO dynamic_fields (product_id, field_name, field_value, field_type, field_order)
                                VALUES (?, ?, ?, ?, ?)
                            `, [id, field.name.trim(), field.value.toString(), field.type || 'text', i + 1]);
                        } catch (fieldError) {
                            console.warn('Failed to save dynamic field:', fieldError);
                        }
                    }
                }
            }
            
            await this.saveDatabase();
            
            return this.getProductById(id);
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    async deleteProduct(id) {
        try {
            // Get image data before deletion for logging
            const imageData = this.getImageData(id);
            if (imageData) {
                console.log(`Deleting image for product ${id}: ${imageData.file_name}`);
            }
            
            // Delete associated images first
            const deletedImages = this.db.run('DELETE FROM images WHERE product_id = ?', [id]);
            console.log(`Deleted ${deletedImages.changes} image records for product ${id}`);
            
            // Delete product
            const deletedProduct = this.db.run('DELETE FROM products WHERE id = ?', [id]);
            console.log(`Deleted product ${id}`);
            
            await this.saveDatabase();
            
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            throw error;
        }
    }

    getProductById(id) {
        try {
            const result = this.db.exec('SELECT * FROM products WHERE id = ?', [id]);
            if (result.length > 0 && result[0].values.length > 0) {
                const row = result[0].values[0];
                const columns = result[0].columns;
                
                const product = {};
                columns.forEach((col, index) => {
                    product[col] = row[index];
                });
                
                // Add dynamic fields
                product.dynamicFields = this.getDynamicFields(id);
                
                return product;
            }
            return null;
        } catch (error) {
            console.error('Error getting product:', error);
            return null;
        }
    }

    getAllProducts() {
        try {
            const result = this.db.exec('SELECT * FROM products ORDER BY created_at DESC');
            if (result.length > 0) {
                const rows = result[0].values;
                const columns = result[0].columns;
                
                return rows.map(row => {
                    const product = {};
                    columns.forEach((col, index) => {
                        product[col] = row[index];
                    });
                    
                    // Add dynamic fields
                    product.dynamicFields = this.getDynamicFields(product.id);
                    
                    return product;
                });
            }
            return [];
        } catch (error) {
            console.error('Error getting products:', error);
            return [];
        }
    }

    searchProducts(query) {
        try {
            const searchTerm = `%${query}%`;
            const result = this.db.exec(`
                SELECT * FROM products 
                WHERE product_name LIKE ? OR company_name LIKE ? OR product_quality LIKE ?
                ORDER BY created_at DESC
            `, [searchTerm, searchTerm, searchTerm]);
            
            if (result.length > 0) {
                const rows = result[0].values;
                const columns = result[0].columns;
                
                return rows.map(row => {
                    const product = {};
                    columns.forEach((col, index) => {
                        product[col] = row[index];
                    });
                    return product;
                });
            }
            return [];
        } catch (error) {
            console.error('Error searching products:', error);
            return [];
        }
    }

    // Image operations
    async saveImage(file, productId) {
        try {
            const imageId = this.generateImageId();
            const fileName = `product_${productId}_${imageId}.${file.name.split('.').pop()}`;
            const filePath = `sale-data/${fileName}`;
            const base64 = await this.fileToBase64(file);
            
            // First, delete any existing image for this product
            this.db.run('DELETE FROM images WHERE product_id = ?', [productId]);
            
            const stmt = this.db.prepare(`
                INSERT INTO images (image_id, product_id, file_name, file_path, base64_data, original_name, file_size, mime_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                imageId,
                productId,
                fileName,
                filePath,
                base64,
                file.name,
                file.size,
                file.type
            ]);
            
            // Update product image_id
            this.db.run('UPDATE products SET image_id = ? WHERE id = ?', [imageId, productId]);
            
            await this.saveDatabase();
            
            console.log(`Image saved for product ${productId}: ${fileName} (Base64 length: ${base64.length})`);
            return imageId;
        } catch (error) {
            console.error('Error saving image:', error);
            throw error;
        }
    }

    getImageData(productId) {
        try {
            const result = this.db.exec('SELECT * FROM images WHERE product_id = ?', [productId]);
            if (result.length > 0 && result[0].values.length > 0) {
                const row = result[0].values[0];
                const columns = result[0].columns;
                
                const imageData = {};
                columns.forEach((col, index) => {
                    imageData[col] = row[index];
                });
                
                console.log(`Image data retrieved for product ${productId}:`, {
                    hasBase64: !!imageData.base64_data,
                    base64Length: imageData.base64_data ? imageData.base64_data.length : 0,
                    fileName: imageData.file_name
                });
                
                return imageData;
            }
            console.log(`No image data found for product ${productId}`);
            return null;
        } catch (error) {
            console.error('Error getting image data:', error);
            return null;
        }
    }

    getImageByImageId(imageId) {
        try {
            console.log('Getting image by image_id:', imageId);
            const result = this.db.exec('SELECT * FROM images WHERE image_id = ?', [imageId]);
            console.log('Image query result:', result);
            
            if (result.length > 0 && result[0].values.length > 0) {
                const row = result[0].values[0];
                const columns = result[0].columns;
                
                const imageData = {};
                columns.forEach((col, index) => {
                    imageData[col] = row[index];
                });
                
                console.log('Image data found:', {
                    imageId: imageData.image_id,
                    hasBase64: !!imageData.base64_data,
                    base64Length: imageData.base64_data ? imageData.base64_data.length : 0,
                    fileName: imageData.file_name
                });
                
                return imageData;
            }
            console.log('No image found for image_id:', imageId);
            return null;
        } catch (error) {
            console.error('Error getting image by image_id:', error);
            return null;
        }
    }

    deleteImage(productId) {
        try {
            const imageData = this.getImageData(productId);
            if (imageData) {
                console.log(`Deleting image for product ${productId}: ${imageData.file_name}`);
            }
            
            const deletedImages = this.db.run('DELETE FROM images WHERE product_id = ?', [productId]);
            this.db.run('UPDATE products SET image_id = NULL WHERE id = ?', [productId]);
            await this.saveDatabase();
            
            console.log(`Deleted ${deletedImages.changes} image records for product ${productId}`);
            return true;
        } catch (error) {
            console.error('Error deleting image:', error);
            return false;
        }
    }

    // Dynamic fields operations
    getDynamicFields(productId) {
        try {
            const result = this.db.exec(`
                SELECT field_name, field_value, field_type, field_order 
                FROM dynamic_fields 
                WHERE product_id = ? 
                ORDER BY field_order
            `, [productId]);
            
            if (result.length > 0) {
                const rows = result[0].values;
                const columns = result[0].columns;
                
                return rows.map(row => {
                    const field = {};
                    columns.forEach((col, index) => {
                        field[col] = row[index];
                    });
                    return field;
                });
            }
            return [];
        } catch (error) {
            console.error('Error getting dynamic fields:', error);
            return [];
        }
    }

    // Removed getAllCategories method as we no longer use categories

    // Statistics
    getStats() {
        try {
            const productsResult = this.db.exec('SELECT COUNT(*) as count FROM products')[0].values[0][0];
            const companiesResult = this.db.exec('SELECT COUNT(DISTINCT company_name) as count FROM products')[0].values[0][0];
            const avgPriceResult = this.db.exec('SELECT AVG(retail_price) as avg FROM products')[0].values[0][0];
            const imagesResult = this.db.exec('SELECT COUNT(*) as count FROM images')[0].values[0][0];
            
            return {
                totalProducts: productsResult,
                totalCategories: companiesResult,
                avgPrice: Math.round(avgPriceResult || 0),
                totalImages: imagesResult
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return { totalProducts: 0, totalCategories: 0, avgPrice: 0, totalImages: 0 };
        }
    }

    // Utility methods
    generateImageId() {
        return 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            // Create a canvas to compress the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = function() {
                // Set canvas size (max 300x300 for storage efficiency)
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
                
                // Draw and compress image
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to base64 with compression (0.8 quality)
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

    // Verify image data is properly stored
    verifyImageData() {
        try {
            const result = this.db.exec('SELECT COUNT(*) as count FROM images');
            const imageCount = result[0].values[0][0];
            console.log(`Database contains ${imageCount} stored images`);
            
            if (imageCount > 0) {
                const sampleResult = this.db.exec('SELECT product_id, LENGTH(base64_data) as data_length FROM images LIMIT 5');
                if (sampleResult.length > 0) {
                    console.log('Sample image data lengths:', sampleResult[0].values);
                }
            }
        } catch (error) {
            console.error('Error verifying image data:', error);
        }
    }

    // Migrate existing image data if needed
    async migrateImageData() {
        try {
            // Check if there are any products with image_path but no corresponding image data
            const result = this.db.exec(`
                SELECT p.id, p.product_name, p.image_id 
                FROM products p 
                LEFT JOIN images i ON p.image_id = i.image_id 
                WHERE p.image_id IS NOT NULL AND i.image_id IS NULL
            `);
            
            if (result.length > 0 && result[0].values.length > 0) {
                console.log(`Found ${result[0].values.length} products with missing image data`);
                
                // Clear invalid image_id references
                this.db.run('UPDATE products SET image_id = NULL WHERE image_id IS NOT NULL AND image_id NOT IN (SELECT image_id FROM images)');
                console.log('Cleared invalid image_id references');
            }

            // Check for old image_path column and migrate if needed
            try {
                const oldImagePathResult = this.db.exec('SELECT image_path FROM products LIMIT 1');
                if (oldImagePathResult.length > 0) {
                    console.log('Found old image_path column, migrating data...');
                    // This will be handled by the new structure
                }
            } catch (e) {
                // image_path column doesn't exist, which is good
            }
        } catch (error) {
            console.error('Error migrating image data:', error);
        }
    }

    // Migrate database schema to new structure
    async migrateDatabaseSchema() {
        try {
            console.log('Checking database schema...');
            
            // Check if old table structure exists
            let needsMigration = false;
            
            try {
                // Check for old column names
                const oldColumnsResult = this.db.exec("PRAGMA table_info(products)");
                if (oldColumnsResult.length > 0) {
                    const columns = oldColumnsResult[0].values;
                    const columnNames = columns.map(col => col[1]); // Column names are in index 1
                    
                    console.log('Current table columns:', columnNames);
                    
                    // Check if old columns exist
                    if (columnNames.includes('name') || columnNames.includes('category') || 
                        columnNames.includes('gst') || columnNames.includes('master') || 
                        columnNames.includes('inner') || columnNames.includes('mrp') || 
                        columnNames.includes('dp')) {
                        needsMigration = true;
                        console.log('Old schema detected, migration needed');
                    }
                }
            } catch (e) {
                console.log('Error checking table structure:', e);
            }
            
            if (needsMigration) {
                console.log('Starting database schema migration...');
                
                // Create new table with correct structure
                const createNewTable = `
                    CREATE TABLE products_new (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        product_name TEXT NOT NULL,
                        company_name TEXT NOT NULL,
                        product_quality TEXT NOT NULL,
                        quantity_bundle INTEGER NOT NULL,
                        purchase_price REAL NOT NULL,
                        wholesale_price REAL NOT NULL,
                        retail_price REAL NOT NULL,
                        image_id TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `;
                
                this.db.run(createNewTable);
                
                // Copy data from old table to new table (if possible)
                try {
                    this.db.run(`
                        INSERT INTO products_new (id, product_name, company_name, product_quality, quantity_bundle, purchase_price, wholesale_price, retail_price, image_id, created_at, updated_at)
                        SELECT 
                            id,
                            COALESCE(name, 'Unknown Product') as product_name,
                            COALESCE(company, 'Unknown Company') as company_name,
                            COALESCE(quality, 'Standard') as product_quality,
                            COALESCE(quantity, 1) as quantity_bundle,
                            COALESCE(purchase_price, 0) as purchase_price,
                            COALESCE(wholesale_price, 0) as wholesale_price,
                            COALESCE(retail_price, 0) as retail_price,
                            image_id,
                            COALESCE(created_at, CURRENT_TIMESTAMP) as created_at,
                            CURRENT_TIMESTAMP as updated_at
                        FROM products
                    `);
                    console.log('Data migrated to new schema');
                } catch (migrateError) {
                    console.log('Could not migrate data, creating fresh table');
                }
                
                // Drop old table and rename new table
                this.db.run('DROP TABLE products');
                this.db.run('ALTER TABLE products_new RENAME TO products');
                
                console.log('Database schema migration completed');
                
                // Save the migrated database
                await this.saveDatabase();
            } else {
                console.log('Database schema is up to date');
            }
        } catch (error) {
            console.error('Error migrating database schema:', error);
        }
    }




}

// Create global instance
window.databaseManager = new DatabaseManager();

// Initialize database manager immediately
(async function() {
    try {
        await window.databaseManager.init();
        console.log('Database manager initialized globally');
    } catch (error) {
        console.error('Failed to initialize database manager globally:', error);
    }
})();
