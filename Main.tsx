import React, { useState } from 'react';
import App from './App';
import LandingPage from './LandingPage';

const Main: React.FC = () => {
    const [showStudio, setShowStudio] = useState(false);

    if (showStudio) {
        return <App />;
    }

    return <LandingPage onEnterStudio={() => setShowStudio(true)} />;
};

export default Main;
