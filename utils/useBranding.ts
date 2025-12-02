
import React, { useState } from 'react';
import { BrandingConfig, UserProfile } from '../types';
import { uploadImageToStorage, saveBrandingToDb } from '../services/supabaseService';

export const useBranding = (
    userProfile: UserProfile | null,
    setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>
) => {
    const [brandingLogo, setBrandingLogo] = useState<string | null>(null);
    const [brandingConfig, setBrandingConfig] = useState<BrandingConfig>({
        layoutMode: 'single',
        x: 95, // Default Bottom Right approx
        y: 95,
        gap: 5,
        scale: 0.2,
        opacity: 1,
        applyToPreview: true, // Default to Always Visible
        // Legacy defaults
        position: 'bottom-right',
        margin: 20
    });
    const [isSavingBranding, setIsSavingBranding] = useState(false);

    const handleSaveBranding = async () => {
        if (!userProfile) return;

        // Dev mode specific behavior
        if (userProfile.payment_code === 'DEVMODE') {
            // Just ensure branding logo is set in state (mock saving)
            alert("Dev Mode: Branding settings applied locally.");
            return;
        }

        setIsSavingBranding(true);
        try {
            let finalLogoUrl = brandingLogo;
            // If brandingLogo is a Base64 string (new upload), upload it to storage first
            if (brandingLogo && brandingLogo.startsWith('data:')) {
                const fileName = `${userProfile.id}/branding_logo_${Date.now()}.png`;
                finalLogoUrl = await uploadImageToStorage(brandingLogo, fileName);
            }

            if (finalLogoUrl) {
                await saveBrandingToDb(userProfile.id, finalLogoUrl, brandingConfig);
                // Update local profile state
                setUserProfile({
                    ...userProfile,
                    branding_logo_url: finalLogoUrl,
                    branding_config: brandingConfig
                });
                // Reload logo to ensure we use the remote URL
                setBrandingLogo(finalLogoUrl);
                alert("Branding settings saved!");
            }
        } catch (e) {
            console.error(e);
            alert("Failed to save branding settings.");
        } finally {
            setIsSavingBranding(false);
        }
    };

    return {
        brandingLogo,
        setBrandingLogo,
        brandingConfig,
        setBrandingConfig,
        isSavingBranding,
        handleSaveBranding
    };
};
