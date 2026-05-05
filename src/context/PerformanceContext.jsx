import React, { createContext, useContext, useState, useEffect } from 'react';
import { isLowPerformanceDevice, getPerformanceSettings } from '../utils/performance';

// Performance Context
const PerformanceContext = createContext(null);

export const usePerformance = () => {
    const context = useContext(PerformanceContext);
    if (!context) {
        // Return default settings if context not available
        return {
            isLowPerf: false,
            settings: getPerformanceSettings(),
            setLowPerfMode: () => { }
        };
    }
    return context;
};

export const PerformanceProvider = ({ children }) => {
    const [isLowPerf, setIsLowPerf] = useState(false);
    const [settings, setSettings] = useState(getPerformanceSettings());

    useEffect(() => {
        // Auto-detect low performance device
        const detected = isLowPerformanceDevice();
        setIsLowPerf(detected);

        if (detected) {
            document.body.classList.add('low-performance-mode');
            console.log('Low performance mode enabled');
        }

        // Also check via URL parameter for manual override
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('lowperf') === '1') {
            setIsLowPerf(true);
            document.body.classList.add('low-performance-mode');
        }
    }, []);

    useEffect(() => {
        // Update settings when mode changes
        const newSettings = {
            enableShadows: !isLowPerf,
            enableGradients: !isLowPerf,
            targetFPS: isLowPerf ? 30 : 60,
            enableGlow: !isLowPerf,
            simpleGrid: isLowPerf,
            canvasQuality: isLowPerf ? 'low' : 'high',
            enableBlur: !isLowPerf
        };
        setSettings(newSettings);

        if (isLowPerf) {
            document.body.classList.add('low-performance-mode');
        } else {
            document.body.classList.remove('low-performance-mode');
        }
    }, [isLowPerf]);

    const setLowPerfMode = (enabled) => {
        setIsLowPerf(enabled);
    };

    return (
        <PerformanceContext.Provider value={{ isLowPerf, settings, setLowPerfMode }}>
            {children}
        </PerformanceContext.Provider>
    );
};
