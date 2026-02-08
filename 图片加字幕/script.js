document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const dropZone = document.getElementById('drop-zone');
    
    const subtitleHeightInput = document.getElementById('subtitle-height');
    const fontSizeInput = document.getElementById('font-size');
    const fontColorInput = document.getElementById('font-color');
    const fontColorText = document.getElementById('font-color-text');
    const outlineColorInput = document.getElementById('outline-color');
    const outlineColorText = document.getElementById('outline-color-text');
    const fontFamilyInput = document.getElementById('font-family');
    const fontWeightInput = document.getElementById('font-weight');
    const subtitleTextInput = document.getElementById('subtitle-text');
    
    const generateBtn = document.getElementById('generate-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    const previewCanvas = document.getElementById('preview-canvas');
    const previewContainer = document.getElementById('preview-container');
    const placeholderText = document.getElementById('placeholder-text');
    const toast = document.getElementById('toast');

    // State
    let originalImage = null;
    let originalFileName = 'subtitle_image.png';

    // Event Listeners for Upload
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('bg-blue-50', 'border-blue-300');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-blue-50', 'border-blue-300');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-blue-50', 'border-blue-300');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect({ target: fileInput });
        }
    });

    // Color Inputs Sync
    fontColorInput.addEventListener('input', (e) => {
        fontColorText.textContent = e.target.value.toUpperCase();
    });
    outlineColorInput.addEventListener('input', (e) => {
        outlineColorText.textContent = e.target.value.toUpperCase();
    });

    // Generate Button
    generateBtn.addEventListener('click', generateImage);

    // Download Button
    downloadBtn.addEventListener('click', downloadImage);

    // Functions
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('请上传图片文件');
            return;
        }

        fileNameDisplay.textContent = file.name;
        originalFileName = file.name;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                // Initial display of original image
                displayOriginalImage();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function displayOriginalImage() {
        if (!originalImage) return;

        // Reset canvas to original image size
        previewCanvas.width = originalImage.width;
        previewCanvas.height = originalImage.height;
        
        const ctx = previewCanvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0);

        showCanvas();
    }

    function showCanvas() {
        previewCanvas.classList.remove('hidden');
        placeholderText.classList.add('hidden');
    }

    function generateImage() {
        if (!originalImage) {
            alert('请先上传图片');
            return;
        }

        const subtitles = subtitleTextInput.value.split('\n'); // Keep empty lines if any, as per logic
        // Filter out completely empty lines at the end if desired, but PRD says support empty lines.
        // However, standard behavior for split with trailing newline might give empty string.
        // Let's keep all lines as user intended.

        if (subtitles.length === 0 || (subtitles.length === 1 && subtitles[0].trim() === '')) {
            // If no subtitles, just show original image
            displayOriginalImage();
            return;
        }

        const config = {
            subtitleHeight: parseInt(subtitleHeightInput.value) || 80,
            fontSize: parseInt(fontSizeInput.value) || 40,
            fontColor: fontColorInput.value,
            outlineColor: outlineColorInput.value,
            fontFamily: fontFamilyInput.value,
            fontWeight: fontWeightInput.value,
            lines: subtitles
        };

        renderStitchedImage(config);
        showToast();
    }

    function renderStitchedImage(config) {
        const ctx = previewCanvas.getContext('2d');
        const img = originalImage;
        const W = img.width;
        const H = img.height;
        const subH = config.subtitleHeight;
        const lines = config.lines;
        const lineCount = lines.length;

        // Calculate final height
        // Base image contains line 1.
        // Additional (lineCount - 1) slices are appended.
        // If lineCount is 0 (handled above), height is H.
        // If lineCount >= 1, Height = H + (lineCount - 1) * subH.
        // Wait, if lineCount is 1, Height = H.
        
        const finalHeight = H + Math.max(0, lineCount - 1) * subH;

        previewCanvas.width = W;
        previewCanvas.height = finalHeight;

        // 1. Draw Original Image (Base)
        ctx.drawImage(img, 0, 0);

        // 2. Draw Appended Slices
        // Slice is the bottom 'subH' pixels of the original image.
        // Source Y = H - subH
        for (let i = 1; i < lineCount; i++) {
            const destY = H + (i - 1) * subH;
            
            // Draw the slice
            ctx.drawImage(
                img, 
                0, H - subH, W, subH, // Source: Bottom strip
                0, destY, W, subH     // Dest: Appended strip
            );
        }

        // 3. Draw Text
        ctx.font = `${config.fontWeight} ${config.fontSize}px "${config.fontFamily}", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Setup text styles
        ctx.fillStyle = config.fontColor;
        ctx.lineWidth = Math.max(2, config.fontSize / 15); // Dynamic outline width
        ctx.strokeStyle = config.outlineColor;
        
        // Helper to draw text with outline
        const drawText = (text, y) => {
            if (!text) return;
            ctx.strokeText(text, W / 2, y);
            ctx.fillText(text, W / 2, y);
        };

        lines.forEach((line, index) => {
            let y;
            if (index === 0) {
                // First line is on the original image bottom
                y = H - (subH / 2);
            } else {
                // Subsequent lines are on the appended slices
                // Slice i starts at H + (i-1)*subH
                // Center of slice is start + subH/2
                y = H + (index - 1) * subH + (subH / 2);
            }
            drawText(line, y);
        });
    }

    function downloadImage() {
        if (!originalImage || previewCanvas.classList.contains('hidden')) {
            return;
        }

        const link = document.createElement('a');
        // Generate filename based on original name
        const namePart = originalFileName.substring(0, originalFileName.lastIndexOf('.')) || originalFileName;
        link.download = `${namePart}_subtitle.png`;
        link.href = previewCanvas.toDataURL('image/png');
        link.click();
    }

    function showToast() {
        toast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
        }, 3000);
    }
});
