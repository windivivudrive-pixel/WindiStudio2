import React, { useState, useEffect } from 'react';
import App from './App';
import LandingPage from './LandingPage2';

const Main: React.FC = () => {
    const [showStudio, setShowStudio] = useState(() => {
        // Check URL params on initial load
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view');
        const hasAccessToken = window.location.hash.includes('access_token');
        const validViews = ['studio', 'privacy', 'history', 'payment', 'branding', 'terms'];

        // If coming from OAuth redirect or explicitly requesting any valid view, show App
        return (viewParam && validViews.includes(viewParam.toLowerCase())) || hasAccessToken;
    });

    useEffect(() => {
        // Also listen for popstate changes
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const viewParam = params.get('view');
            const validViews = ['studio', 'privacy', 'history', 'payment', 'branding', 'terms'];
            if (viewParam && validViews.includes(viewParam.toLowerCase())) {
                setShowStudio(true);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    if (showStudio) {
        return <App />;
    }

    return <LandingPage onEnterStudio={() => {
        // Navigate to Creative tab when clicking "Bắt đầu ngay"
        const url = new URL(window.location.href);
        url.searchParams.set('view', 'studio');
        url.searchParams.set('tab', 'creative');
        window.history.pushState({ view: 'STUDIO', tab: 'creative' }, '', url.toString());
        setShowStudio(true);
    }} />;
};

export default Main;
