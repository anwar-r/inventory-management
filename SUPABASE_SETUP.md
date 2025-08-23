# Supabase Setup Guide

## Prerequisites
1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project

## Setup Steps

### 1. Create Supabase Project
1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `inventory-management`
   - Database Password: Choose a strong password
   - Region: Choose closest to your users
5. Click "Create new project"

### 2. Get Your Project Credentials
1. Go to Settings → API in your Supabase dashboard
2. Copy the following values:
   - **Project URL**: `https://db.ilerskls.supabase.co` (or your project URL)
   - **Anon Key**: The public anon key (starts with `eyJ...`)

### 3. Set Up Database Tables
1. Go to SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `supabase-setup.sql`
3. Click "Run" to execute the script
4. This will create:
   - `products` table with all required fields
   - `dynamic_fields` table for custom fields
   - Proper indexes for performance
   - Row Level Security policies
   - Automatic timestamp updates

### 4. Update Application Configuration
1. Open `js/database.js`
2. Replace the Supabase client initialization with your actual credentials:

```javascript
this.supabase = supabase.createClient(
    'https://db.ilerskls.supabase.co',  // Your Project URL
    'your-actual-anon-key-here'         // Your Anon Key
);
```

### 5. Test the Application
1. Open `index.html` in your browser
2. Try adding a product with an image
3. Verify that data is saved to Supabase
4. Check the Supabase dashboard → Table Editor to see your data

## Database Schema

### Products Table
- `id`: Auto-incrementing primary key
- `product_name`: Product name (required)
- `company_name`: Company name (required)
- `product_quality`: Product quality (required)
- `quantity_bundle`: Quantity (required)
- `purchase_price`: Purchase price (required)
- `wholesale_price`: Wholesale price (required)
- `retail_price`: Retail price (required)
- `image_data`: Base64 encoded image (optional)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

### Dynamic Fields Table
- `id`: Auto-incrementing primary key
- `product_id`: Foreign key to products table
- `field_name`: Custom field name
- `field_value`: Custom field value
- `field_type`: Field type (text, number, date, email)
- `created_at`: Creation timestamp

## Features

### ✅ Real-time Database
- PostgreSQL database with real-time capabilities
- Automatic data synchronization
- Scalable and reliable

### ✅ Image Storage
- Images stored as base64 in the database
- Automatic compression (300x300px, JPEG 0.8 quality)
- No external storage dependencies

### ✅ Dynamic Fields
- Add custom fields to products
- Support for different field types
- Flexible schema

### ✅ CRUD Operations
- Create, Read, Update, Delete products
- Search functionality
- Export/Import data

### ✅ Security
- Row Level Security (RLS) enabled
- Public access policies (modify as needed)
- Secure API access

## Troubleshooting

### Connection Issues
- Verify your Project URL and Anon Key are correct
- Check that RLS policies allow public access
- Ensure tables are created properly

### Data Not Saving
- Check browser console for errors
- Verify Supabase client is initialized
- Check RLS policies allow INSERT operations

### Images Not Loading
- Verify image_data field is properly populated
- Check base64 encoding is working
- Ensure image compression is functioning

## Security Notes

⚠️ **Important**: The current setup allows public access to all data. For production use:

1. Implement proper authentication
2. Modify RLS policies to restrict access
3. Use environment variables for sensitive data
4. Enable additional security features

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify Supabase dashboard for data
3. Check RLS policies and table structure
4. Ensure all setup steps are completed
