// Performance utilities for low-end devices like electronic whiteboards

// Detect if device is low-performance
export const isLowPerformanceDevice = () => {
    // Check for low memory
    const memory = navigator.deviceMemory;
    if (memory && memory < 4) return true;

    // Check for low CPU cores
    const cores = navigator.hardwareConcurrency;
    if (cores && cores < 4) return true;

    // Check for touch device (often electronic whiteboards)
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Check for slow connection
    const connection = navigator.connection;
    if (connection && connection.effectiveType === '2g') return true;

    // Check screen size (electronic whiteboards are often large but low-res)
    const pixelRatio = window.devicePixelRatio || 1;
    if (pixelRatio < 1.5 && window.innerWidth > 1200) return true;

    return false;
};

// Performance settings based on device capability
export const getPerformanceSettings = () => {
    const isLowPerf = isLowPerformanceDevice();

    return {
        // Disable shadows on low-end devices
        enableShadows: !isLowPerf,

        // Use simpler gradients
        enableGradients: !isLowPerf,

        // Reduce animation frame rate
        targetFPS: isLowPerf ? 30 : 60,

        // Disable glow effects
        enableGlow: !isLowPerf,

        // Reduce grid complexity
        simpleGrid: isLowPerf,

        // Canvas quality
        canvasQuality: isLowPerf ? 'low' : 'high',

        // Disable blur effects
        enableBlur: !isLowPerf
    };
};

// Throttle function for reducing event frequency
export const throttle = (func, limit) => {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Debounce function
export const debounce = (func, wait) => {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

// Simple solid color instead of gradient for low-end devices
export const getOptimizedFill = (ctx, x1, y1, x2, y2, color1, color2, settings) => {
    if (!settings.enableGradients) {
        return color1;
    }
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
};

// Apply or skip shadow based on performance
export const applyOptimizedShadow = (ctx, settings, color, blur) => {
    if (settings.enableShadows) {
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
    } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    }
};

// Clear shadow
export const clearShadow = (ctx) => {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
};

console.log('Performance utilities loaded. Low-end device:', isLowPerformanceDevice());
