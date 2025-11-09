let currentTab = 'qr';
let generatedCanvas = null;
let isDark = false;
let settingsOpen = false;

function switchTab(tab) {
    currentTab = tab;
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Find the clicked button and make it active
    const buttons = document.querySelectorAll('.nav-btn');
    if (tab === 'qr') {
        buttons[0].classList.add('active');
    } else {
        buttons[1].classList.add('active');
    }
    
    // Show/hide inputs
    const qrInput = document.getElementById('qr-input');
    const barcodeInput = document.getElementById('barcode-input');
    if (qrInput) qrInput.classList.toggle('hidden', tab !== 'qr');
    if (barcodeInput) barcodeInput.classList.toggle('hidden', tab !== 'barcode');
    
    // Show/hide settings
    const qrSettings = document.getElementById('qr-settings');
    const barcodeSettings = document.getElementById('barcode-settings');
    if (qrSettings) qrSettings.classList.toggle('hidden', tab !== 'qr');
    if (barcodeSettings) barcodeSettings.classList.toggle('hidden', tab !== 'barcode');
    
    clearOutput();
}

function clearOutput() {
    document.getElementById('output').innerHTML = '<div class="placeholder">Enter content to generate code</div>';
    document.getElementById('download-section').classList.add('hidden');
    generatedCanvas = null;
}

function generateQR() {
    const text = document.getElementById('qr-text').value.trim();
    if (!text) {
        clearOutput();
        return;
    }

    try {
        if (typeof QRious === 'undefined') {
            document.getElementById('output').innerHTML = '<div class="placeholder">QR library not loaded</div>';
            return;
        }
        
        const canvas = document.createElement('canvas');
        const qr = new QRious({
            element: canvas,
            value: text,
            size: parseInt(document.getElementById('qr-size').value),
            foreground: document.getElementById('qr-color').value,
            background: document.getElementById('qr-bg-color').value
        });
        
        generatedCanvas = canvas;
        document.getElementById('output').innerHTML = '';
        document.getElementById('output').appendChild(canvas);
        document.getElementById('download-section').classList.remove('hidden');
    } catch (error) {
        console.error('QR Error:', error);
        document.getElementById('output').innerHTML = '<div class="placeholder">Error: ' + error.message + '</div>';
    }
}

function generateBarcode() {
    const text = document.getElementById('barcode-text').value.trim();
    if (!text) {
        clearOutput();
        return;
    }

    try {
        if (typeof JsBarcode === 'undefined') {
            document.getElementById('output').innerHTML = '<div class="placeholder">Barcode library not loaded</div>';
            return;
        }
        
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, text, {
            format: document.getElementById('barcode-format').value,
            width: parseFloat(document.getElementById('barcode-width').value),
            height: parseInt(document.getElementById('barcode-height').value),
            lineColor: document.getElementById('barcode-color').value,
            background: document.getElementById('barcode-bg-color').value,
            displayValue: true
        });

        generatedCanvas = canvas;
        document.getElementById('output').innerHTML = '';
        document.getElementById('output').appendChild(canvas);
        document.getElementById('download-section').classList.remove('hidden');
    } catch (error) {
        console.error('Barcode Error:', error);
        document.getElementById('output').innerHTML = '<div class="placeholder">Error: ' + error.message + '</div>';
    }
}

let savedCodes = [];
let currentPage = 1;
const itemsPerPage = 4;
let currentFilter = 'all';

function saveToPage() {
    if (!generatedCanvas) return;
    
    const savedItem = {
        dataURL: generatedCanvas.toDataURL(),
        type: currentTab,
        content: currentTab === 'qr' ? document.getElementById('qr-text').value : document.getElementById('barcode-text').value,
        timestamp: new Date().toLocaleString()
    };
    
    savedCodes.push(savedItem);
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({savedCodes: savedCodes});
    }
    updateGallery();
}

function updateGallery() {
    const gallery = document.getElementById('saved-gallery');
    const galleryItems = document.getElementById('gallery-items');
    
    if (!gallery || !galleryItems) return;
    
    if (savedCodes.length === 0) {
        gallery.classList.add('hidden');
        return;
    }
    
    gallery.classList.remove('hidden');
    galleryItems.innerHTML = '';
    
    const filteredCodes = currentFilter === 'all' ? savedCodes : savedCodes.filter(item => item.type === currentFilter);
    const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredCodes.slice(startIndex, endIndex);
    
    currentItems.forEach((item, index) => {
        const actualIndex = savedCodes.indexOf(item);
        const itemDiv = document.createElement('div');
        itemDiv.className = 'gallery-item';
        itemDiv.innerHTML = `
            <button class="delete-btn" data-index="${actualIndex}">×</button>
            <div class="item-name">${item.content.length > 15 ? item.content.substring(0, 15) + '...' : item.content}</div>
            <img src="${item.dataURL}" style="max-width: 100%; height: auto;">
            <div class="item-time">${item.timestamp}</div>
        `;
        
        const deleteBtn = itemDiv.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.getAttribute('data-index'));
            deleteItem(index);
        });
        
        itemDiv.addEventListener('click', function() {
            showBigView(item);
        });
        
        itemDiv.setAttribute('data-type', item.type);
        galleryItems.appendChild(itemDiv);
    });
    
    updatePagination(totalPages);
}

function updatePagination(totalPages) {
    const pagination = document.getElementById('pagination');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    
    if (!pagination) return;
    
    if (totalPages <= 1) {
        pagination.classList.add('hidden');
        return;
    }
    
    pagination.classList.remove('hidden');
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
}

function deleteItem(index) {
    savedCodes.splice(index, 1);
    const filteredCodes = currentFilter === 'all' ? savedCodes : savedCodes.filter(item => item.type === currentFilter);
    const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
        currentPage = totalPages;
    }
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({savedCodes: savedCodes});
    }
    updateGallery();
}

function clearGallery() {
    savedCodes = [];
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove('savedCodes');
    }
    updateGallery();
}

function loadSavedCodes() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['savedCodes'], (result) => {
            if (result.savedCodes) {
                savedCodes = result.savedCodes;
                updateGallery();
            }
        });
    }
}

function downloadCode(format) {
    if (!generatedCanvas) return;
    
    const link = document.createElement('a');
    link.download = `${currentTab}_code.${format}`;
    link.href = generatedCanvas.toDataURL();
    link.click();
}

function toggleSettings() {
    settingsOpen = !settingsOpen;
    const dropdown = document.getElementById('settings-dropdown');
    const icon = document.querySelector('.settings-icon');
    
    if (dropdown) {
        dropdown.classList.toggle('hidden', !settingsOpen);
    }
    if (icon) {
        icon.classList.toggle('spin', settingsOpen);
    }
}

function toggleTheme() {
    isDark = !isDark;
    document.body.classList.toggle('dark', isDark);
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.classList.toggle('rotated', isDark);
    }
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({isDark: isDark});
    }
}

function clearInput(type) {
    const input = document.getElementById(type + '-text');
    if (input) {
        input.value = '';
        if (type === 'qr') {
            generateQR();
        } else {
            generateBarcode();
        }
        toggleClearIcon(type);
    }
}

function toggleClearIcon(type) {
    const input = document.getElementById(type + '-text');
    if (input) {
        const icon = input.parentElement.querySelector('.clear-icon');
        if (icon) {
            if (input.value.trim()) {
                icon.classList.add('visible');
            } else {
                icon.classList.remove('visible');
            }
        }
    }
}

function filterGallery(type) {
    currentFilter = type;
    currentPage = 1;
    
    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    
    // Find and activate the correct filter button
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(type) || (type === 'all' && btn.textContent === 'All')) {
            btn.classList.add('active');
        }
    });
    
    updateGallery();
}

function toggleSavedVisibility() {
    const checkbox = document.getElementById('toggle-saved');
    const galleryItems = document.getElementById('gallery-items');
    const filterButtons = document.querySelector('.filter-buttons');
    const clearBtn = document.querySelector('.clear-btn');
    const pagination = document.getElementById('pagination');
    
    if (!galleryItems) return;
    
    if (checkbox.checked) {
        galleryItems.style.display = 'grid';
        if (filterButtons) filterButtons.style.display = 'flex';
        if (clearBtn) clearBtn.style.display = 'inline-block';
        if (pagination) pagination.style.display = 'flex';
    } else {
        galleryItems.style.display = 'none';
        if (filterButtons) filterButtons.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        if (pagination) pagination.style.display = 'none';
    }
}

function showBigView(item) {
    const output = document.getElementById('output');
    const img = document.createElement('img');
    img.src = item.dataURL;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    
    output.innerHTML = '';
    output.appendChild(img);
    
    document.getElementById('download-section').classList.remove('hidden');
    generatedCanvas = null;
    
    // Create a temporary canvas for download functionality
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    img.onload = function() {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        generatedCanvas = canvas;
    };
}

function toggleExtensionMode() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({action: 'openSidepanel'}, () => {
            window.close();
        });
    }
}

function togglePopupMode() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({action: 'openPopup'});
    }
}

// Auto-generation
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, QRious available:', typeof QRious !== 'undefined');
    console.log('JsBarcode available:', typeof JsBarcode !== 'undefined');
    
    // Load saved theme
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['isDark'], (result) => {
            if (result.isDark) {
                isDark = true;
                document.body.classList.add('dark');
                const themeIcon = document.querySelector('.theme-icon');
                if (themeIcon) themeIcon.classList.add('rotated');
            }
        });
    }
    
    // Load saved codes
    loadSavedCodes();
    
    // Initialize gallery visibility
    setTimeout(() => {
        updateGallery();
    }, 100);
    
    // Settings icon event listener
    const settingsIcon = document.querySelector('.settings-icon');
    if (settingsIcon) {
        settingsIcon.addEventListener('click', toggleSettings);
    }
    
    // Theme icon event listener
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.addEventListener('click', toggleTheme);
    }
    
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            switchTab(tab);
        });
    });
    
    // Clear icons
    document.querySelectorAll('.clear-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            clearInput(type);
        });
    });
    
    // Save, download and panel buttons
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveToPage);
    }
    
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => downloadCode('png'));
    }
    
    const panelBtn = document.getElementById('panel-btn');
    if (panelBtn) {
        panelBtn.addEventListener('click', toggleExtensionMode);
    }
    
    // Gallery filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            filterGallery(filter);
        });
    });
    
    // Toggle saved visibility
    const toggleSaved = document.getElementById('toggle-saved');
    if (toggleSaved) {
        toggleSaved.addEventListener('change', toggleSavedVisibility);
    }
    
    // Clear gallery button
    const clearGalleryBtn = document.getElementById('clear-gallery-btn');
    if (clearGalleryBtn) {
        clearGalleryBtn.addEventListener('click', clearGallery);
    }
    
    // Popup button (in sidepanel)
    const popupBtn = document.getElementById('popup-btn');
    if (popupBtn) {
        popupBtn.addEventListener('click', togglePopupMode);
    }
    
    // Pagination buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateGallery();
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(savedCodes.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                updateGallery();
            }
        });
    }
    
    // Check if elements exist before adding listeners
    const qrText = document.getElementById('qr-text');
    const qrSize = document.getElementById('qr-size');
    const qrColor = document.getElementById('qr-color');
    const qrBgColor = document.getElementById('qr-bg-color');
    
    if (qrText) {
        qrText.addEventListener('input', function() {
            console.log('QR input changed:', this.value);
            generateQR();
            toggleClearIcon('qr');
        });
    }
    if (qrSize) qrSize.addEventListener('input', generateQR);
    if (qrColor) qrColor.addEventListener('input', generateQR);
    if (qrBgColor) qrBgColor.addEventListener('input', generateQR);
    
    // Barcode auto-generation
    const barcodeText = document.getElementById('barcode-text');
    const barcodeFormat = document.getElementById('barcode-format');
    const barcodeWidth = document.getElementById('barcode-width');
    const barcodeHeight = document.getElementById('barcode-height');
    const barcodeColor = document.getElementById('barcode-color');
    const barcodeBgColor = document.getElementById('barcode-bg-color');
    
    if (barcodeText) {
        barcodeText.addEventListener('input', function() {
            console.log('Barcode input changed:', this.value);
            generateBarcode();
            toggleClearIcon('barcode');
        });
    }
    if (barcodeFormat) barcodeFormat.addEventListener('change', generateBarcode);
    if (barcodeWidth) barcodeWidth.addEventListener('input', generateBarcode);
    if (barcodeHeight) barcodeHeight.addEventListener('input', generateBarcode);
    if (barcodeColor) barcodeColor.addEventListener('input', generateBarcode);
    if (barcodeBgColor) barcodeBgColor.addEventListener('input', generateBarcode);
    
    // Close settings when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.settings-dropdown') && !e.target.closest('.settings-icon')) {
            if (settingsOpen) toggleSettings();
        }
    });
});