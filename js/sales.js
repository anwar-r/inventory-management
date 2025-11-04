// Sales Management JavaScript
// This file contains all sales-related functionality

// Global sales variables
let sales = [];
let filteredSales = [];
let customers = [];
let lineItemCounter = 0;
let editingSaleId = null;
let currentSale = {
    line_items: []
};

// Page navigation
async function showPage(page) {
    // Hide all pages
    document.getElementById('productsPage').classList.remove('active');
    document.getElementById('salesPage').classList.remove('active');
    
    // Show selected page
    if (page === 'products') {
        document.getElementById('productsPage').classList.add('active');
        document.getElementById('productsActions').style.display = 'flex';
        document.getElementById('salesActions').style.display = 'none';
        document.getElementById('navProducts').classList.add('active');
        document.getElementById('navSales').classList.remove('active');
    } else if (page === 'sales') {
        document.getElementById('salesPage').classList.add('active');
        document.getElementById('productsActions').style.display = 'none';
        document.getElementById('salesActions').style.display = 'flex';
        document.getElementById('navProducts').classList.remove('active');
        document.getElementById('navSales').classList.add('active');
        // Load products for autocomplete
        if (typeof window.products === 'undefined' || !window.products || window.products.length === 0) {
            window.products = await databaseManager.getAllProducts();
        }
        await loadSales();
    }
}

// Load and render sales
async function loadSales() {
    try {
        showLoading();
        sales = await databaseManager.getAllSales();
        filteredSales = [...sales];
        renderSales();
        updateSalesStats();
        hideLoading();
    } catch (error) {
        console.error('Error loading sales:', error);
        alert('Failed to load sales. Please try again.');
        hideLoading();
    }
}

function renderSales() {
    const tbody = document.getElementById('salesTable');
    
    if (!tbody) {
        console.error('Sales table not found');
        return;
    }
    
    if (filteredSales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: #6b7280;">No sales found. Click "New Sale" to create one.</td></tr>';
        return;
    }

    const rows = filteredSales.map(sale => {
        const statusBadge = {
            'draft': '<span style="background: #f3f4f6; color: #374151; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem;">Draft</span>',
            'pending': '<span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem;">Pending</span>',
            'complete': '<span style="background: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.85rem;">Complete</span>'
        };

        const invoiceNumber = sale.invoice_number || 'N/A';
        const saleDate = sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : 'N/A';
        const customerName = sale.customer_name || 'N/A';
        const itemCount = sale.line_items?.length || 0;
        const subtotal = parseFloat(sale.subtotal || 0).toFixed(2);
        const discount = parseFloat(sale.discount_amount || 0).toFixed(2);
        const total = parseFloat(sale.total_amount || 0).toFixed(2);
        const status = statusBadge[sale.status] || statusBadge.draft;

        return `
            <tr class="fade-in">
                <td>${invoiceNumber}</td>
                <td>${saleDate}</td>
                <td>${customerName}</td>
                <td>${itemCount} items</td>
                <td class="price">₹${subtotal}</td>
                <td>₹${discount}</td>
                <td class="price">₹${total}</td>
                <td>${status}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="editSale(${sale.id})" title="Edit">✏️</button>
                        <button class="btn-edit" onclick="viewInvoice(${sale.id})" title="View/Print">👁️</button>
                        <button class="btn-delete" onclick="deleteSale(${sale.id})" title="Delete">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rows.join('');
}

function updateSalesStats() {
    try {
        const totalSales = sales.length || 0;
        const pendingSales = sales.filter(s => s.status === 'pending').length || 0;
        const completeSales = sales.filter(s => s.status === 'complete').length || 0;
        const totalRevenue = sales
            .filter(s => s.status === 'complete')
            .reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);

        const totalSalesEl = document.getElementById('totalSales');
        const pendingSalesEl = document.getElementById('pendingSales');
        const completeSalesEl = document.getElementById('completeSales');
        const totalRevenueEl = document.getElementById('totalRevenue');

        if (totalSalesEl) totalSalesEl.textContent = totalSales;
        if (pendingSalesEl) pendingSalesEl.textContent = pendingSales;
        if (completeSalesEl) completeSalesEl.textContent = completeSales;
        if (totalRevenueEl) totalRevenueEl.textContent = `₹${totalRevenue.toFixed(2)}`;
    } catch (error) {
        console.error('Error updating sales stats:', error);
    }
}

async function filterSales() {
    try {
        const searchInput = document.getElementById('salesSearchInput');
        if (!searchInput) return;

        const searchTerm = searchInput.value.toLowerCase();
        if (searchTerm.trim() === '') {
            filteredSales = [...sales];
        } else {
            filteredSales = sales.filter(sale => {
                const invoiceMatch = sale.invoice_number && sale.invoice_number.toLowerCase().includes(searchTerm);
                const customerMatch = sale.customer_name && sale.customer_name.toLowerCase().includes(searchTerm);
                const addressMatch = sale.customer_address && sale.customer_address.toLowerCase().includes(searchTerm);
                return invoiceMatch || customerMatch || addressMatch;
            });
        }
        renderSales();
    } catch (error) {
        console.error('Error filtering sales:', error);
    }
}

// Open new sale modal
async function openNewSaleModal() {
    try {
        editingSaleId = null;
        currentSale = { line_items: [] };
        lineItemCounter = 0;
        
        // Load products if not already loaded
        if (typeof window.products === 'undefined' || !window.products || window.products.length === 0) {
            window.products = await databaseManager.getAllProducts();
        }
        
        // Set default date
        const saleDateInput = document.getElementById('saleDate');
        if (saleDateInput) {
            saleDateInput.value = new Date().toISOString().split('T')[0];
        }
        
        // Clear form
        const salesForm = document.getElementById('salesForm');
        if (salesForm) salesForm.reset();
        
        const invoiceNumberInput = document.getElementById('invoiceNumber');
        if (invoiceNumberInput) invoiceNumberInput.value = '';
        
        const lineItemsTable = document.getElementById('lineItemsTable');
        if (lineItemsTable) lineItemsTable.innerHTML = '';
        
        const customerSelect = document.getElementById('customerSelect');
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">Select or enter customer</option>';
        }
        
        const salesModalTitle = document.getElementById('salesModalTitle');
        if (salesModalTitle) salesModalTitle.textContent = 'New Sale';
        
        const saveSaleBtn = document.getElementById('saveSaleBtn');
        if (saveSaleBtn) saveSaleBtn.textContent = 'Save Sale';
        
        // Load customers
        await loadCustomers();
        
        // Generate invoice number
        const invoiceNumber = await databaseManager.generateInvoiceNumberFallback();
        if (invoiceNumberInput) {
            invoiceNumberInput.value = invoiceNumber;
        }
        
        const salesModal = document.getElementById('salesModal');
        if (salesModal) {
            salesModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
        
        calculateTotals();
    } catch (error) {
        console.error('Error opening new sale modal:', error);
        alert('Failed to open sales form. Please try again.');
    }
}

// Load customers
async function loadCustomers() {
    try {
        customers = await databaseManager.getAllCustomers();
        const select = document.getElementById('customerSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Select or enter customer</option>';
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            const displayText = customer.customer_name + (customer.address ? ' - ' + customer.address : '');
            option.textContent = displayText;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

// Load customer details
async function loadCustomerDetails() {
    try {
        const select = document.getElementById('customerSelect');
        if (!select) return;

        const customerId = select.value;
        
        if (customerId) {
            const customer = await databaseManager.getCustomerById(customerId);
            if (customer) {
                const customerNameInput = document.getElementById('customerName');
                const customerAddressInput = document.getElementById('customerAddress');
                
                if (customerNameInput) customerNameInput.value = customer.customer_name || '';
                if (customerAddressInput) customerAddressInput.value = customer.address || '';
            }
        }
    } catch (error) {
        console.error('Error loading customer details:', error);
    }
}

// Add line item
function addLineItem() {
    try {
        const tbody = document.getElementById('lineItemsTable');
        if (!tbody) return;

        const itemId = `item_${lineItemCounter++}`;
        const serialNumber = tbody.children.length + 1;
        
        const row = document.createElement('tr');
        row.id = itemId;
        
        // Get products list for datalist
        const productsList = typeof window.products !== 'undefined' && window.products && window.products.length > 0
            ? window.products.map(p => `<option value="${p.product_name || ''}">${p.product_name || ''} - ₹${p.retail_price || 0}</option>`).join('')
            : '';
        
        row.innerHTML = `
            <td style="padding: 0.75rem; text-align: center;">${serialNumber}</td>
            <td style="padding: 0.75rem;">
                <input type="text" class="form-input" placeholder="Product name" 
                       id="${itemId}_product" style="width: 100%; padding: 0.5rem;" 
                       onchange="updateLineItemProduct('${itemId}')" list="productsList">
                <datalist id="productsList">
                    ${productsList}
                </datalist>
            </td>
            <td style="padding: 0.75rem;">
                <div style="display: flex; gap: 0.25rem;">
                    <input type="number" class="form-input" placeholder="Qty" 
                           id="${itemId}_qty" style="flex: 1; padding: 0.5rem;" 
                           min="1" value="1" onchange="updateLineItem('${itemId}')">
                    <input type="text" class="form-input" placeholder="Unit" 
                           id="${itemId}_unit" style="width: 60px; padding: 0.5rem;" 
                           value="Pcs" onchange="updateLineItem('${itemId}')">
                </div>
            </td>
            <td style="padding: 0.75rem;">
                <input type="number" class="form-input" placeholder="Rate" 
                       id="${itemId}_rate" style="width: 100%; padding: 0.5rem;" 
                       step="0.01" min="0" onchange="updateLineItem('${itemId}')">
            </td>
            <td style="padding: 0.75rem;">
                <input type="number" class="form-input" placeholder="Amount" 
                       id="${itemId}_amount" style="width: 100%; padding: 0.5rem;" 
                       step="0.01" readonly>
            </td>
            <td style="padding: 0.75rem; text-align: center;">
                <button type="button" class="btn-delete" onclick="removeLineItem('${itemId}')" style="padding: 0.25rem 0.5rem;">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(row);
    } catch (error) {
        console.error('Error adding line item:', error);
        alert('Failed to add line item. Please try again.');
    }
}

// Update line item product
function updateLineItemProduct(itemId) {
    try {
        const productInput = document.getElementById(`${itemId}_product`);
        if (!productInput) return;

        const productName = productInput.value;
        
        // Find product in products list
        if (typeof window.products !== 'undefined' && window.products && window.products.length > 0) {
            const product = window.products.find(p => p.product_name === productName);
            if (product) {
                const rateInput = document.getElementById(`${itemId}_rate`);
                if (rateInput) {
                    rateInput.value = product.retail_price || 0;
                    updateLineItem(itemId);
                }
            }
        }
    } catch (error) {
        console.error('Error updating line item product:', error);
    }
}

// Update line item
function updateLineItem(itemId) {
    try {
        const qtyInput = document.getElementById(`${itemId}_qty`);
        const rateInput = document.getElementById(`${itemId}_rate`);
        const amountInput = document.getElementById(`${itemId}_amount`);
        
        if (!qtyInput || !rateInput || !amountInput) return;

        const qty = parseFloat(qtyInput.value) || 0;
        const rate = parseFloat(rateInput.value) || 0;
        const amount = qty * rate;
        
        amountInput.value = amount.toFixed(2);
        
        // Update serial numbers
        updateSerialNumbers();
        calculateTotals();
    } catch (error) {
        console.error('Error updating line item:', error);
    }
}

// Remove line item
function removeLineItem(itemId) {
    try {
        const item = document.getElementById(itemId);
        if (item) {
            item.remove();
            updateSerialNumbers();
            calculateTotals();
        }
    } catch (error) {
        console.error('Error removing line item:', error);
    }
}

// Update serial numbers
function updateSerialNumbers() {
    try {
        const tbody = document.getElementById('lineItemsTable');
        if (!tbody) return;

        const rows = tbody.children;
        for (let i = 0; i < rows.length; i++) {
            const firstCell = rows[i].querySelector('td:first-child');
            if (firstCell) {
                firstCell.textContent = i + 1;
            }
        }
    } catch (error) {
        console.error('Error updating serial numbers:', error);
    }
}

// Calculate totals
function calculateTotals() {
    try {
        const tbody = document.getElementById('lineItemsTable');
        if (!tbody) return;

        const rows = tbody.children;
        let subtotal = 0;
        
        for (let row of rows) {
            const amountInput = row.querySelector('input[id$="_amount"]');
            if (amountInput) {
                const amount = parseFloat(amountInput.value) || 0;
                subtotal += amount;
            }
        }
        
        // Calculate discount
        const discountAmountInput = document.getElementById('discountAmount');
        const discountPercentageInput = document.getElementById('discountPercentage');
        
        let discountAmount = 0;
        if (discountAmountInput) {
            discountAmount = parseFloat(discountAmountInput.value) || 0;
        }
        
        const discountPercentage = discountPercentageInput ? parseFloat(discountPercentageInput.value) || 0 : 0;
        
        if (discountPercentage > 0) {
            discountAmount = (subtotal * discountPercentage) / 100;
            if (discountAmountInput) {
                discountAmountInput.value = discountAmount.toFixed(2);
            }
        }
        
        const total = subtotal - discountAmount;
        
        const subtotalDisplay = document.getElementById('subtotalDisplay');
        const discountDisplay = document.getElementById('discountDisplay');
        const totalDisplay = document.getElementById('totalDisplay');
        
        if (subtotalDisplay) subtotalDisplay.textContent = `₹${subtotal.toFixed(2)}`;
        if (discountDisplay) discountDisplay.textContent = `₹${discountAmount.toFixed(2)}`;
        if (totalDisplay) totalDisplay.textContent = `₹${total.toFixed(2)}`;
    } catch (error) {
        console.error('Error calculating totals:', error);
    }
}

// Close sales modal
function closeSalesModal() {
    try {
        const salesModal = document.getElementById('salesModal');
        if (salesModal) {
            salesModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        currentSale = { line_items: [] };
        editingSaleId = null;
    } catch (error) {
        console.error('Error closing sales modal:', error);
    }
}

// Save sale
function initializeSalesForm() {
    const salesForm = document.getElementById('salesForm');
    if (!salesForm) return;

    salesForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            showLoading();
            
            // Collect line items
            const lineItems = [];
            const tbody = document.getElementById('lineItemsTable');
            if (tbody) {
                const rows = tbody.children;
                
                for (let row of rows) {
                    const productInput = row.querySelector('input[id$="_product"]');
                    const qtyInput = row.querySelector('input[id$="_qty"]');
                    const unitInput = row.querySelector('input[id$="_unit"]');
                    const rateInput = row.querySelector('input[id$="_rate"]');
                    const amountInput = row.querySelector('input[id$="_amount"]');
                    
                    if (productInput && qtyInput && rateInput && amountInput) {
                        const productName = productInput.value.trim();
                        const qty = parseInt(qtyInput.value) || 1;
                        const unit = unitInput ? (unitInput.value || 'Pcs') : 'Pcs';
                        const rate = parseFloat(rateInput.value) || 0;
                        const amount = parseFloat(amountInput.value) || 0;
                        
                        if (productName && qty > 0 && rate > 0) {
                            // Find product ID if exists
                            const product = (typeof window.products !== 'undefined' && window.products)
                                ? window.products.find(p => p.product_name === productName)
                                : null;
                            
                            lineItems.push({
                                product_id: product ? product.id : null,
                                product_name: productName,
                                quantity: qty,
                                unit: unit,
                                rate: rate,
                                amount: amount
                            });
                        }
                    }
                }
            }
            
            if (lineItems.length === 0) {
                alert('Please add at least one line item.');
                hideLoading();
                return;
            }
            
            // Calculate totals
            const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
            const discountAmountInput = document.getElementById('discountAmount');
            const discountPercentageInput = document.getElementById('discountPercentage');
            const discountAmount = discountAmountInput ? parseFloat(discountAmountInput.value) || 0 : 0;
            const discountPercentage = discountPercentageInput ? parseFloat(discountPercentageInput.value) || 0 : 0;
            const totalAmount = subtotal - discountAmount;
            
            // Get customer info
            const customerSelect = document.getElementById('customerSelect');
            const customerNameInput = document.getElementById('customerName');
            const customerAddressInput = document.getElementById('customerAddress');
            
            const customerId = customerSelect ? (customerSelect.value || null) : null;
            const customerName = customerNameInput ? customerNameInput.value.trim() : '';
            const customerAddress = customerAddressInput ? customerAddressInput.value.trim() : '';
            
            // Get form values
            const invoiceNumberInput = document.getElementById('invoiceNumber');
            const saleDateInput = document.getElementById('saleDate');
            const saleStatusInput = document.getElementById('saleStatus');
            const saleNotesInput = document.getElementById('saleNotes');
            
            const saleData = {
                invoice_number: invoiceNumberInput ? invoiceNumberInput.value : '',
                customer_id: customerId,
                customer_name: customerName,
                customer_address: customerAddress,
                sale_date: saleDateInput ? saleDateInput.value : new Date().toISOString().split('T')[0],
                status: saleStatusInput ? saleStatusInput.value : 'draft',
                discount_amount: discountAmount,
                discount_percentage: discountPercentage > 0 ? discountPercentage : 0,
                subtotal: subtotal,
                total_amount: totalAmount,
                notes: saleNotesInput ? saleNotesInput.value : '',
                line_items: lineItems
            };
            
            if (editingSaleId) {
                await databaseManager.updateSale(editingSaleId, saleData);
                showSalesSuccess('Sale updated successfully!');
            } else {
                await databaseManager.addSale(saleData);
                showSalesSuccess('Sale created successfully!');
            }
            
            hideLoading();
            await loadSales();
            setTimeout(() => {
                closeSalesModal();
            }, 1500);
            
        } catch (error) {
            console.error('Error saving sale:', error);
            alert('Failed to save sale. Please try again.');
            hideLoading();
        }
    });
}

function showSalesSuccess(message) {
    try {
        const successMsg = document.getElementById('salesSuccessMessage');
        if (successMsg) {
            successMsg.textContent = message;
            successMsg.style.display = 'block';
            setTimeout(() => {
                successMsg.style.display = 'none';
            }, 3000);
        }
    } catch (error) {
        console.error('Error showing success message:', error);
    }
}

// Edit sale
async function editSale(saleId) {
    try {
        showLoading();
        const sale = await databaseManager.getSaleById(saleId);
        
        if (!sale) {
            alert('Sale not found!');
            hideLoading();
            return;
        }
        
        editingSaleId = saleId;
        currentSale = sale;
        
        // Populate form
        const invoiceNumberInput = document.getElementById('invoiceNumber');
        const saleDateInput = document.getElementById('saleDate');
        const customerNameInput = document.getElementById('customerName');
        const customerAddressInput = document.getElementById('customerAddress');
        const discountAmountInput = document.getElementById('discountAmount');
        const discountPercentageInput = document.getElementById('discountPercentage');
        const saleStatusInput = document.getElementById('saleStatus');
        const saleNotesInput = document.getElementById('saleNotes');
        
        if (invoiceNumberInput) invoiceNumberInput.value = sale.invoice_number || '';
        if (saleDateInput) saleDateInput.value = sale.sale_date || new Date().toISOString().split('T')[0];
        if (customerNameInput) customerNameInput.value = sale.customer_name || '';
        if (customerAddressInput) customerAddressInput.value = sale.customer_address || '';
        if (discountAmountInput) discountAmountInput.value = sale.discount_amount || 0;
        if (discountPercentageInput) discountPercentageInput.value = sale.discount_percentage || 0;
        if (saleStatusInput) saleStatusInput.value = sale.status || 'draft';
        if (saleNotesInput) saleNotesInput.value = sale.notes || '';
        
        // Load customers
        await loadCustomers();
        const customerSelect = document.getElementById('customerSelect');
        if (customerSelect && sale.customer_id) {
            customerSelect.value = sale.customer_id;
        }
        
        // Populate line items
        const lineItemsTable = document.getElementById('lineItemsTable');
        if (lineItemsTable) {
            lineItemsTable.innerHTML = '';
            lineItemCounter = 0;
            
            if (sale.line_items && sale.line_items.length > 0) {
                sale.line_items.forEach(item => {
                    const itemId = `item_${lineItemCounter++}`;
                    const row = document.createElement('tr');
                    row.id = itemId;
                    
                    const serialNumber = item.serial_number || lineItemCounter;
                    const productName = item.product_name || '';
                    const quantity = item.quantity || 1;
                    const unit = item.unit || 'Pcs';
                    const rate = item.rate || 0;
                    const amount = item.amount || 0;
                    
                    row.innerHTML = `
                        <td style="padding: 0.75rem; text-align: center;">${serialNumber}</td>
                        <td style="padding: 0.75rem;">
                            <input type="text" class="form-input" value="${productName.replace(/"/g, '&quot;')}" 
                                   id="${itemId}_product" style="width: 100%; padding: 0.5rem;" 
                                   onchange="updateLineItemProduct('${itemId}')" list="productsList">
                        </td>
                        <td style="padding: 0.75rem;">
                            <div style="display: flex; gap: 0.25rem;">
                                <input type="number" class="form-input" value="${quantity}" 
                                       id="${itemId}_qty" style="flex: 1; padding: 0.5rem;" 
                                       min="1" onchange="updateLineItem('${itemId}')">
                                <input type="text" class="form-input" value="${unit.replace(/"/g, '&quot;')}" 
                                       id="${itemId}_unit" style="width: 60px; padding: 0.5rem;" 
                                       onchange="updateLineItem('${itemId}')">
                            </div>
                        </td>
                        <td style="padding: 0.75rem;">
                            <input type="number" class="form-input" value="${rate}" 
                                   id="${itemId}_rate" style="width: 100%; padding: 0.5rem;" 
                                   step="0.01" min="0" onchange="updateLineItem('${itemId}')">
                        </td>
                        <td style="padding: 0.75rem;">
                            <input type="number" class="form-input" value="${amount}" 
                                   id="${itemId}_amount" style="width: 100%; padding: 0.5rem;" 
                                   step="0.01" readonly>
                        </td>
                        <td style="padding: 0.75rem; text-align: center;">
                            <button type="button" class="btn-delete" onclick="removeLineItem('${itemId}')" style="padding: 0.25rem 0.5rem;">🗑️</button>
                        </td>
                    `;
                    lineItemsTable.appendChild(row);
                });
            }
        }
        
        const salesModalTitle = document.getElementById('salesModalTitle');
        const saveSaleBtn = document.getElementById('saveSaleBtn');
        
        if (salesModalTitle) salesModalTitle.textContent = 'Edit Sale';
        if (saveSaleBtn) saveSaleBtn.textContent = 'Update Sale';
        
        calculateTotals();
        
        const salesModal = document.getElementById('salesModal');
        if (salesModal) {
            salesModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error loading sale:', error);
        alert('Failed to load sale. Please try again.');
        hideLoading();
    }
}

// Delete sale
async function deleteSale(saleId) {
    if (!confirm('Are you sure you want to delete this sale?')) {
        return;
    }
    
    try {
        showLoading();
        await databaseManager.deleteSale(saleId);
        await loadSales();
        hideLoading();
    } catch (error) {
        console.error('Error deleting sale:', error);
        alert('Failed to delete sale. Please try again.');
        hideLoading();
    }
}

// View invoice (for print/share)
async function viewInvoice(saleId) {
    await editSale(saleId);
}

// Print invoice
function printInvoice() {
    try {
        const invoiceData = getInvoiceData();
        if (!invoiceData) {
            alert('Please fill in all invoice details before printing.');
            return;
        }
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Popup blocked. Please allow popups and try again.');
            return;
        }
        
        const invoiceHTML = generateInvoiceHTML(invoiceData);
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    } catch (error) {
        console.error('Error printing invoice:', error);
        alert('Failed to print invoice. Please try again.');
    }
}

// Share invoice
function shareInvoice() {
    try {
        const invoiceData = getInvoiceData();
        if (!invoiceData) {
            alert('Please fill in all invoice details before sharing.');
            return;
        }
        
        const invoiceText = generateInvoiceText(invoiceData);
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(invoiceText)}`;
        
        // Try Web Share API first
        if (navigator.share) {
            navigator.share({
                title: `Invoice ${invoiceData.invoice_number || ''}`,
                text: invoiceText,
                url: window.location.href
            }).catch(err => {
                console.log('Share failed, using WhatsApp:', err);
                window.open(whatsappUrl, '_blank');
            });
        } else {
            window.open(whatsappUrl, '_blank');
        }
    } catch (error) {
        console.error('Error sharing invoice:', error);
        alert('Failed to share invoice. Please try again.');
    }
}

function getInvoiceData() {
    try {
        const invoiceNumberInput = document.getElementById('invoiceNumber');
        const saleDateInput = document.getElementById('saleDate');
        const customerNameInput = document.getElementById('customerName');
        const customerAddressInput = document.getElementById('customerAddress');
        const lineItemsTable = document.getElementById('lineItemsTable');
        
        if (!invoiceNumberInput || !saleDateInput) {
            return null;
        }
        
        const invoiceNumber = invoiceNumberInput.value || '';
        const saleDate = saleDateInput.value || new Date().toISOString().split('T')[0];
        const customerName = customerNameInput ? customerNameInput.value || 'N/A' : 'N/A';
        const customerAddress = customerAddressInput ? customerAddressInput.value || 'N/A' : 'N/A';
        
        const lineItems = [];
        if (lineItemsTable) {
            const rows = lineItemsTable.children;
            for (let row of rows) {
                const productInput = row.querySelector('input[id$="_product"]');
                const qtyInput = row.querySelector('input[id$="_qty"]');
                const unitInput = row.querySelector('input[id$="_unit"]');
                const rateInput = row.querySelector('input[id$="_rate"]');
                const amountInput = row.querySelector('input[id$="_amount"]');
                
                if (productInput && qtyInput && rateInput && amountInput) {
                    const productName = productInput.value.trim() || '';
                    const qty = qtyInput.value || '0';
                    const unit = unitInput ? (unitInput.value || 'Pcs') : 'Pcs';
                    const rate = rateInput.value || '0';
                    const amount = amountInput.value || '0';
                    
                    if (productName) {
                        lineItems.push({
                            product_name: productName,
                            quantity: qty,
                            unit: unit,
                            rate: rate,
                            amount: amount
                        });
                    }
                }
            }
        }
        
        const subtotalDisplay = document.getElementById('subtotalDisplay');
        const discountDisplay = document.getElementById('discountDisplay');
        const totalDisplay = document.getElementById('totalDisplay');
        
        const subtotal = subtotalDisplay 
            ? parseFloat(subtotalDisplay.textContent.replace('₹', '').replace(',', '')) || 0 
            : 0;
        const discount = discountDisplay 
            ? parseFloat(discountDisplay.textContent.replace('₹', '').replace(',', '')) || 0 
            : 0;
        const total = totalDisplay 
            ? parseFloat(totalDisplay.textContent.replace('₹', '').replace(',', '')) || 0 
            : 0;
        
        return {
            invoice_number: invoiceNumber,
            date: saleDate,
            customer_name: customerName,
            customer_address: customerAddress,
            line_items: lineItems,
            subtotal: subtotal,
            discount: discount,
            total: total
        };
    } catch (error) {
        console.error('Error getting invoice data:', error);
        return null;
    }
}

function generateInvoiceHTML(data) {
    try {
        if (!data) return '';
        
        const invoiceNumber = data.invoice_number || 'N/A';
        const date = data.date ? new Date(data.date).toLocaleDateString() : new Date().toLocaleDateString();
        const customerName = data.customer_name || 'N/A';
        const customerAddress = data.customer_address || 'N/A';
        const lineItems = data.line_items || [];
        const subtotal = parseFloat(data.subtotal || 0).toFixed(2);
        const discount = parseFloat(data.discount || 0).toFixed(2);
        const total = parseFloat(data.total || 0).toFixed(2);
        
        const lineItemsHTML = lineItems.map((item, index) => {
            const productName = item.product_name || '';
            const quantity = item.quantity || '0';
            const unit = item.unit || 'Pcs';
            const rate = parseFloat(item.rate || 0).toFixed(2);
            const amount = parseFloat(item.amount || 0).toFixed(2);
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${productName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
                    <td>${quantity} ${unit}</td>
                    <td>₹${rate}</td>
                    <td>₹${amount}</td>
                </tr>
            `;
        }).join('');
        
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Invoice ${invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .invoice-header { text-align: center; margin-bottom: 30px; }
        .invoice-info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #374151; color: white; }
        .totals { margin-top: 20px; text-align: right; }
        .total-amount { font-size: 1.2em; font-weight: bold; color: #dc2626; }
    </style>
</head>
<body>
    <div class="invoice-header">
        <h1>SR & SONS</h1>
        <h2>INVOICE</h2>
    </div>
    <div class="invoice-info">
        <p><strong>No:</strong> ${invoiceNumber}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>To. M/s.:</strong> ${customerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        <p><strong>Address:</strong> ${customerAddress.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th>S.No</th>
                <th>Item Name</th>
                <th>Qty/Unit</th>
                <th>Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            ${lineItemsHTML}
        </tbody>
    </table>
    <div class="totals">
        <p>Subtotal: ₹${subtotal}</p>
        <p>Discount: ₹${discount}</p>
        <p class="total-amount">Net Amount: ₹${total}</p>
    </div>
</body>
</html>
        `;
    } catch (error) {
        console.error('Error generating invoice HTML:', error);
        return '<html><body><p>Error generating invoice</p></body></html>';
    }
}

function generateInvoiceText(data) {
    try {
        if (!data) {
            return 'Invoice data not available';
        }
        
        let text = `*SR & SONS - INVOICE*\n\n`;
        
        // Invoice number
        const invoiceNumber = data.invoice_number || 'N/A';
        text += `Invoice No: ${invoiceNumber}\n`;
        
        // Date
        try {
            const date = data.date ? new Date(data.date).toLocaleDateString() : new Date().toLocaleDateString();
            text += `Date: ${date}\n`;
        } catch (e) {
            text += `Date: ${data.date || new Date().toLocaleDateString()}\n`;
        }
        
        // Customer info
        const customerName = data.customer_name || 'N/A';
        const customerAddress = data.customer_address || 'N/A';
        text += `To. M/s.: ${customerName}\n`;
        text += `Address: ${customerAddress}\n\n`;
        
        // Line items
        text += `*Items:*\n`;
        const lineItems = data.line_items || [];
        
        if (lineItems.length === 0) {
            text += `No items added.\n`;
        } else {
            lineItems.forEach((item, index) => {
                try {
                    const productName = item.product_name || 'Unnamed Product';
                    const quantity = item.quantity || '0';
                    const unit = item.unit || 'Pcs';
                    const rate = parseFloat(item.rate || 0);
                    const amount = parseFloat(item.amount || 0);
                    
                    text += `${index + 1}. ${productName} - ${quantity} ${unit} @ ₹${rate.toFixed(2)} = ₹${amount.toFixed(2)}\n`;
                } catch (e) {
                    console.error('Error formatting line item:', e);
                    text += `${index + 1}. Error formatting item\n`;
                }
            });
        }
        
        // Totals
        try {
            const subtotal = parseFloat(data.subtotal || 0);
            const discount = parseFloat(data.discount || 0);
            const total = parseFloat(data.total || 0);
            
            text += `\nSubtotal: ₹${subtotal.toFixed(2)}\n`;
            text += `Discount: ₹${discount.toFixed(2)}\n`;
            text += `*Net Amount: ₹${total.toFixed(2)}*`;
        } catch (e) {
            console.error('Error formatting totals:', e);
            text += `\nError calculating totals`;
        }
        
        return text;
    } catch (error) {
        console.error('Error generating invoice text:', error);
        return 'Error generating invoice text. Please try again.';
    }
}

// Customer modal functions
function openCustomerModal() {
    try {
        const customerModal = document.getElementById('customerModal');
        const customerForm = document.getElementById('customerForm');
        
        if (customerModal) {
            customerModal.style.display = 'block';
        }
        if (customerForm) {
            customerForm.reset();
        }
    } catch (error) {
        console.error('Error opening customer modal:', error);
    }
}

function closeCustomerModal() {
    try {
        const customerModal = document.getElementById('customerModal');
        if (customerModal) {
            customerModal.style.display = 'none';
        }
    } catch (error) {
        console.error('Error closing customer modal:', error);
    }
}

function initializeCustomerForm() {
    const customerForm = document.getElementById('customerForm');
    if (!customerForm) return;

    customerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const customerNameInput = document.getElementById('newCustomerName');
            const customerAddressInput = document.getElementById('newCustomerAddress');
            const customerPhoneInput = document.getElementById('newCustomerPhone');
            const customerEmailInput = document.getElementById('newCustomerEmail');
            
            if (!customerNameInput || !customerNameInput.value.trim()) {
                alert('Please enter customer name.');
                return;
            }
            
            const customer = {
                customer_name: customerNameInput.value.trim(),
                address: customerAddressInput ? customerAddressInput.value.trim() : '',
                phone: customerPhoneInput ? customerPhoneInput.value.trim() : '',
                email: customerEmailInput ? customerEmailInput.value.trim() : ''
            };
            
            await databaseManager.addCustomer(customer);
            await loadCustomers();
            closeCustomerModal();
            showSalesSuccess('Customer added successfully!');
        } catch (error) {
            console.error('Error adding customer:', error);
            alert('Failed to add customer. Please try again.');
        }
    });
}

// Initialize sales functionality when DOM is ready
function initializeSales() {
    try {
        initializeSalesForm();
        initializeCustomerForm();
        
        // Close modal when clicking outside
        window.addEventListener('click', function(e) {
            try {
                const salesModal = document.getElementById('salesModal');
                const customerModal = document.getElementById('customerModal');
                
                if (e.target === salesModal) {
                    closeSalesModal();
                }
                if (e.target === customerModal) {
                    closeCustomerModal();
                }
            } catch (error) {
                console.error('Error handling modal click:', error);
            }
        });
    } catch (error) {
        console.error('Error initializing sales:', error);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSales);
} else {
    initializeSales();
}

