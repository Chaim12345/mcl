/**
 * Avatar Image Generator
 * Creates placeholder avatar images using Canvas API
 */

export class AvatarGenerator {
    constructor() {
        this.colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F8B500'
        ];
        this.initials = ['JD', 'JS', 'MJ', 'SW', 'AB', 'CD', 'EF', 'GH'];
    }

    generateAvatar(name, size = 100) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = size;
        canvas.height = size;
        
        // Get initials from name
        const initials = this.getInitials(name);
        const colorIndex = this.getColorIndex(name);
        const backgroundColor = this.colors[colorIndex];
        
        // Draw background circle
        ctx.fillStyle = backgroundColor;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw initials
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${size * 0.4}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initials, size / 2, size / 2);
        
        return canvas.toDataURL('image/png');
    }

    getInitials(name) {
        if (!name) return 'U';
        
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    getColorIndex(name) {
        if (!name) return 0;
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash) % this.colors.length;
    }

    createAvatarElement(name, size = 40, className = 'avatar') {
        const img = document.createElement('img');
        img.src = this.generateAvatar(name, size);
        img.alt = `Avatar for ${name}`;
        img.className = className;
        img.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255, 255, 255, 0.1);
        `;
        return img;
    }

    // Create and save avatar images to replace missing assets
    createAvatarAssets() {
        const avatars = [
            { name: 'John Doe', filename: 'avatar1.jpg' },
            { name: 'Jane Smith', filename: 'avatar2.jpg' },
            { name: 'Mike Johnson', filename: 'avatar3.jpg' },
            { name: 'Sarah Wilson', filename: 'avatar4.jpg' }
        ];

        avatars.forEach(({ name, filename }) => {
            const dataUrl = this.generateAvatar(name, 200);
            
            // Create download link (for manual saving)
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = filename;
            link.style.display = 'none';
            document.body.appendChild(link);
            
            console.log(`Generated avatar for ${name}: ${filename}`);
            
            // Store in sessionStorage for immediate use
            sessionStorage.setItem(`avatar-${filename}`, dataUrl);
        });
    }

    // Get avatar URL with fallback to generated avatar
    getAvatarUrl(filename, fallbackName) {
        // Check if we have a generated avatar in storage
        const stored = sessionStorage.getItem(`avatar-${filename}`);
        if (stored) {
            return stored;
        }

        // Generate on demand
        return this.generateAvatar(fallbackName || 'User', 200);
    }
}

export default AvatarGenerator;
