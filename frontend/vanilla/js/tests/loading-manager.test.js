// frontend/vanilla/js/tests/loading-manager.test.js

import loadingManager from '../utils/LoadingManager.js';

describe('LoadingManager', () => {
    let container;

    beforeAll(() => {
        // Create a container for the overlay if it doesn't exist
        container = document.getElementById('loader-overlay');
        if (!container) {
            container = document.createElement('div');
            container.id = 'loader-overlay';
            document.body.appendChild(container);
        }
    });

    beforeEach(() => {
        // Reset the overlay state before each test
        loadingManager.hideSpinner();
        document.body.innerHTML = ''; // Clear body to test element creation
        loadingManager._createOverlay(); // Re-create overlay for each test
    });

    test('should create a single instance (singleton)', () => {
        const instance1 = loadingManager;
        const instance2 = loading anager;
        expect(instance1).toBe(instance2);
    });

    test('showSpinner should display the loader overlay', () => {
        const overlay = document.querySelector('.loader-overlay');
        expect(overlay.style.display).toBe('none');
        loadingManager.showSpinner();
        expect(overlay.style.display).toBe('flex');
    });

    test('hideSpinner should hide the loader overlay', () => {
        loadingManager.showSpinner();
        const overlay = document.querySelector('.loader-overlay');
        expect(overlay.style.display).toBe('flex');
        loadingManager.hideSpinner();
        expect(overlay.style.display).toBe('none');
    });

    test('getSkeletonHTML should generate correct HTML for text skeleton', () => {
        const html = loadingManager.getSkeletonHTML({ type: 'text', lines: 3, className: 'my-class' });
        document.body.innerHTML = html;
        expect(document.querySelector('.my-class')).not.toBeNull();
        expect(document.querySelectorAll('.skeleton-text').length).toBe(3);
        expect(document.querySelector('.skeleton-text:last-child').style.width).toBe('80%');
    });

    test('getSkeletonHTML should generate correct HTML for an avatar', () => {
        const html = loadingManager.getSkeletonHTML({ type: 'avatar', className: 'profile-pic' });
        document.body.innerHTML = html;
        expect(document.querySelector('.skeleton.skeleton-avatar.profile-pic')).not.toBeNull();
    });

    test('getSkeletonHTML should handle custom width and height', () => {
        const html = loadingManager.getSkeletonHTML({ width: '100px', height: '50px' });
        document.body.innerHTML = html;
        const element = document.querySelector('.skeleton');
        expect(element.style.width).toBe('100px');
        expect(element.style.height).toBe('50px');
    });

    test('getProgressBarHTML should generate correct HTML for a progress bar', () => {
        const html = loadingManager.getProgressBarHTML({ id: 'my-progress', initialValue: 25, className: 'upload-progress' });
        document.body.innerHTML = html;
        const container = document.querySelector('.progress-bar.upload-progress');
        const fill = document.querySelector('#my-progress');
        expect(container).not.toBeNull();
        expect(fill).not.toBeNull();
        expect(fill.style.width).toBe('25%');
    });

    test('updateProgressBar should update the width of the progress bar fill', () => {
        const html = loadingManager.getProgressBarHTML({ id: 'update-progress', initialValue: 10 });
        document.body.innerHTML = html;
        
        const fill = document.querySelector('#update-progress');
        expect(fill.style.width).toBe('10%');
        
        loadingManager.updateProgressBar('update-progress', 75);
        expect(fill.style.width).toBe('75%');
    });

    test('updateProgressBar should handle values outside 0-100 range', () => {
        const html = loadingManager.getProgressBarHTML({ id: 'range-progress' });
        document.body.innerHTML = html;
        const fill = document.querySelector('#range-progress');

        loadingManager.updateProgressBar('range-progress', 150);
        expect(fill.style.width).toBe('100%');

        loadingManager.updateProgressBar('range-progress', -50);
        expect(fill.style.width).toBe('0%');
    });
}); 