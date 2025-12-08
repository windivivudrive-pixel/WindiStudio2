import React, { useState, useEffect } from 'react';
import App from './App';
import LandingPage from './LandingPage';

const Main: React.FC = () => {
    const [showStudio, setShowStudio] = useState(() => {
        // Check URL params on initial load
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view');
        const hasAccessToken = window.location.hash.includes('access_token');
        const validViews = ['studio', 'privacy', 'history', 'payment', 'branding'];

        // If coming from OAuth redirect or explicitly requesting any valid view, show App
        return (viewParam && validViews.includes(viewParam.toLowerCase())) || hasAccessToken;
    });

    useEffect(() => {
        // Also listen for popstate changes
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const viewParam = params.get('view');
            const validViews = ['studio', 'privacy', 'history', 'payment', 'branding'];
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

    return <LandingPage onEnterStudio={() => setShowStudio(true)} />;
};

export default Main;
