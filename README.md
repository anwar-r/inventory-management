# SR & SONS - Kitchen Catalog (PWA)

A Progressive Web App (PWA) for inventory management of kitchen products. This application works offline and can be installed on both mobile and desktop devices.

## 🚀 Features

- **Offline-First**: Works without internet connection
- **PWA Ready**: Can be installed as a native app
- **CRUD Operations**: Create, Read, Update, Delete products
- **Search & Filter**: Find products by name or category across all products
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Data Persistence**: Saves data locally using localStorage
- **Modern UI**: Beautiful, intuitive interface

## 📁 Project Structure

```
inventory-management/
├── index.html              # Main application file
├── manifest.json           # PWA manifest configuration
├── sw.js                   # Service worker for offline functionality
├── js/
│   └── database.js         # SQLite database management
├── assets/
│   └── logo.svg           # SR logo for PWA icon
└── README.md              # This file
```

## 🛠️ Setup & Installation

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (for development)

### Quick Start

1. **Clone or download** the project files
2. **Start a local server** in the project directory:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Open your browser** and navigate to:
   ```
   http://localhost:8000
   ```

4. **Install as PWA** (optional):
   - On desktop: Click the install button in the address bar
   - On mobile: Use "Add to Home Screen" option

## 📱 PWA Features

### Installation
- **Desktop**: Browser will show an install prompt
- **Mobile**: Use "Add to Home Screen" from browser menu
- **Icon**: Red background with "SR" typography

### Offline Functionality
- App works completely offline after first load
- Data is cached for offline access
- Changes are saved locally and sync when online

## 💾 Data Management

### SQLite Database
The application uses SQLite database for persistent storage:
- **Products Table**: Stores all product information
- **Images Table**: Stores base64 image data with relationships
- **Categories Table**: Manages product categories
- **Persistent Storage**: Data survives browser restarts and app updates

### Database Features
- **Real Database**: SQLite with proper SQL operations
- **Image Persistence**: Images never disappear during updates
- **Export/Import**: Download and restore complete database
- **Data Integrity**: Foreign key relationships and constraints

### CRUD Operations
- **Create**: Add new products via the modal form
- **Read**: View all products in the table (20 per page)
- **Update**: Edit existing products via edit button
- **Delete**: Remove products via delete button

## 🎨 Customization

### Logo
The PWA icon is defined in `assets/logo.svg`:
- Red background (`#dc2626`)
- White "SR" typography
- Circular design with decorative elements

### Styling
- Primary color: `#dc2626` (red)
- Modern gradient backgrounds
- Responsive design with mobile-first approach

## 🔧 Technical Details

### Service Worker
- Caches essential files for offline use
- Handles background sync
- Manages push notifications

### Data Manager
- Handles all CRUD operations
- Manages localStorage backup
- Provides search and filtering

### Browser Support
- Chrome 67+
- Firefox 67+
- Safari 11.1+
- Edge 79+

## 📊 Features Overview

| Feature | Status | Description |
|---------|--------|-------------|
| Offline Support | ✅ | Works without internet |
| PWA Installation | ✅ | Installable on devices |
| Product Management | ✅ | Add/view products |
| Search & Filter | ✅ | Find products easily |
| Responsive Design | ✅ | Mobile-friendly |
| Data Persistence | ✅ | Saves locally |
| Update Products | ✅ | Edit via modal form |
| Delete Products | ✅ | Delete with confirmation |
| Export Data | 🔄 | Planned feature |

## 🚀 Deployment

### Local Development
1. Use any local web server
2. Access via `http://localhost:8000`

### Production Deployment
1. Upload files to any web hosting service
2. Ensure HTTPS is enabled (required for PWA)
3. Service worker will handle caching automatically

### Recommended Hosting
- **Netlify**: Drag & drop deployment
- **Vercel**: Git-based deployment
- **GitHub Pages**: Free hosting for public repos
- **Firebase Hosting**: Google's hosting solution

## 🔒 Security Considerations

- Data is stored locally in the browser
- No server-side data processing
- HTTPS required for PWA features
- No sensitive data transmission

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For support or questions:
- Create an issue in the repository
- Contact the development team

---

**SR & SONS Kitchen Catalog** - Making inventory management simple and accessible everywhere! 🏠✨
