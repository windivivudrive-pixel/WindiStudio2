import React, { useState, useEffect } from 'react';
import App from './App';
import LandingPage from './LandingPage';

const Main: React.FC = () => {
    const [showStudio, setShowStudio] = useState(() => {
        // Check URL params on initial load
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view');
        const hasAccessToken = window.location.hash.includes('access_token');

        // If coming from OAuth redirect or explicitly requesting studio, show it
        return viewParam === 'studio' || hasAccessToken;
    });

    useEffect(() => {
        // Also listen for popstate changes
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            if (params.get('view') === 'studio') {
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
