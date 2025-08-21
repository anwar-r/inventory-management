// Database Manager using SQLite for persistent storage
class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    // Initialize database
    async init() {
        try {
            // Load SQL.js
            if (typeof SQL === 'undefined') {
                await this.loadSQLJS();
            }

            // Create or load database
            await this.createDatabase();
            this.isInitialized = true;
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
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
            // Try to load existing database from localStorage
            const existingDB = localStorage.getItem('inventory-database');
            
            if (existingDB) {
                // Load existing database
                const uint8Array = new Uint8Array(existingDB.split(',').map(Number));
                this.db = new SQL.Database(uint8Array);
                console.log('Existing database loaded');
            } else {
                // Create new database
                this.db = new SQL.Database();
                await this.createTables();
                console.log('New database created');
            }
        } catch (error) {
            console.error('Error creating database:', error);
            // Create new database if loading fails
            this.db = new SQL.Database();
            await this.createTables();
        }
    }

    // Create database tables
    async createTables() {
        const createProductsTable = `
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                gst INTEGER NOT NULL,
                master INTEGER NOT NULL,
                inner INTEGER NOT NULL,
                mrp REAL NOT NULL,
                dp REAL NOT NULL,
                image_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

        const createCategoriesTable = `
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        try {
            this.db.run(createProductsTable);
            this.db.run(createImagesTable);
            this.db.run(createCategoriesTable);
            
            // Insert default categories
            const defaultCategories = [
                '10 Chipser & Nicer Dicer',
                '11 Juicer',
                '15 Modern Kitchen Need'
            ];

            for (const category of defaultCategories) {
                this.db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [category]);
            }

            console.log('Database tables created successfully');
        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
    }

    // Save database to localStorage
    saveDatabase() {
        try {
            const data = this.db.export();
            const array = Array.from(data);
            localStorage.setItem('inventory-database', array.toString());
            console.log('Database saved to localStorage');
        } catch (error) {
            console.error('Error saving database:', error);
        }
    }

    // Export database as file
    exportDatabase() {
        try {
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
            
            console.log('Database exported successfully');
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
            this.saveDatabase();
            
            console.log('Database imported successfully');
            return true;
        } catch (error) {
            console.error('Error importing database:', error);
            return false;
        }
    }

    // Product operations
    async addProduct(product) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO products (name, category, gst, master, inner, mrp, dp, image_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([
                product.name,
                product.category,
                product.gst,
                product.master,
                product.inner,
                product.mrp,
                product.dp,
                product.image_path || null
            ]);
            
            const productId = this.db.exec('SELECT last_insert_rowid()')[0].values[0][0];
            
            // Add category if it doesn't exist
            this.db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [product.category]);
            
            this.saveDatabase();
            
            return { ...product, id: productId };
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    }

    async updateProduct(id, product) {
        try {
            const stmt = this.db.prepare(`
                UPDATE products 
                SET name = ?, category = ?, gst = ?, master = ?, inner = ?, mrp = ?, dp = ?, image_path = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);
            
            stmt.run([
                product.name,
                product.category,
                product.gst,
                product.master,
                product.inner,
                product.mrp,
                product.dp,
                product.image_path || null,
                id
            ]);
            
            // Add category if it doesn't exist
            this.db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [product.category]);
            
            this.saveDatabase();
            
            return this.getProductById(id);
        } catch (error) {
            console.error('Error updating product:', error);
            throw error;
        }
    }

    async deleteProduct(id) {
        try {
            // Delete associated images first
            this.db.run('DELETE FROM images WHERE product_id = ?', [id]);
            
            // Delete product
            this.db.run('DELETE FROM products WHERE id = ?', [id]);
            
            this.saveDatabase();
            
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
                WHERE name LIKE ? OR category LIKE ?
                ORDER BY created_at DESC
            `, [searchTerm, searchTerm]);
            
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
            
            // Update product image path
            this.db.run('UPDATE products SET image_path = ? WHERE id = ?', [filePath, productId]);
            
            this.saveDatabase();
            
            return filePath;
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
                
                return imageData;
            }
            return null;
        } catch (error) {
            console.error('Error getting image data:', error);
            return null;
        }
    }

    deleteImage(productId) {
        try {
            this.db.run('DELETE FROM images WHERE product_id = ?', [productId]);
            this.db.run('UPDATE products SET image_path = NULL WHERE id = ?', [productId]);
            this.saveDatabase();
            return true;
        } catch (error) {
            console.error('Error deleting image:', error);
            return false;
        }
    }

    // Category operations
    getAllCategories() {
        try {
            const result = this.db.exec('SELECT name FROM categories ORDER BY name');
            if (result.length > 0) {
                return result[0].values.map(row => row[0]);
            }
            return [];
        } catch (error) {
            console.error('Error getting categories:', error);
            return [];
        }
    }

    // Statistics
    getStats() {
        try {
            const productsResult = this.db.exec('SELECT COUNT(*) as count FROM products')[0].values[0][0];
            const categoriesResult = this.db.exec('SELECT COUNT(*) as count FROM categories')[0].values[0][0];
            const avgPriceResult = this.db.exec('SELECT AVG(mrp) as avg FROM products')[0].values[0][0];
            
            return {
                totalProducts: productsResult,
                totalCategories: categoriesResult,
                avgPrice: Math.round(avgPriceResult || 0)
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return { totalProducts: 0, totalCategories: 0, avgPrice: 0 };
        }
    }

    // Utility methods
    generateImageId() {
        return 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Clear all data
    clearAllData() {
        try {
            this.db.run('DELETE FROM images');
            this.db.run('DELETE FROM products');
            this.db.run('DELETE FROM categories');
            this.saveDatabase();
            console.log('All data cleared');
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }
}

// Create global instance
window.databaseManager = new DatabaseManager();
