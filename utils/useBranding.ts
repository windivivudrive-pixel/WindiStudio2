
import React, { useState, useEffect } from 'react';
import { BrandingConfig, UserProfile } from '../types';
import { uploadImageToStorage, saveBrandingToDb, fetchTransactions, updateUserCredits, checkUserHasBranding, fetchUserBranding } from '../services/supabaseService';

const BRANDING_COST = 50; // 50 xu for first-time branding
const VIP_DEPOSIT_THRESHOLD = 1000000; // 1 million VND

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

    // Load branding from DB when user changes
    useEffect(() => {
        const loadBranding = async () => {
            if (!userProfile) return;

            const branding = await fetchUserBranding(userProfile.id);
            if (branding) {
                setBrandingLogo(branding.branding_logo);
                if (branding.branding_config) {
                    setBrandingConfig(prev => ({
                        ...prev,
                        ...branding.branding_config
                    }));
                }
            }
        };

        loadBranding();
    }, [userProfile?.id]);

    // Check if user is eligible for free branding
    const checkBrandingEligibility = async (): Promise<{ isFree: boolean; reason?: string }> => {
        if (!userProfile) return { isFree: false };

        // 1. Check if user already has branding in DB (not first time)
        const hasBranding = await checkUserHasBranding(userProfile.id);
        if (hasBranding) {
            return { isFree: true, reason: 'existing_branding' };
        }

        // 2. Check if user has deposited over 1 million VND
        try {
            const transactions = await fetchTransactions(userProfile.id);
            const hasVipDeposit = transactions.some(t =>
                t.type === 'DEPOSIT' &&
                t.status === 'SUCCESS' &&
                t.amount_vnd >= VIP_DEPOSIT_THRESHOLD
            );
            if (hasVipDeposit) {
                return { isFree: true, reason: 'vip_deposit' };
            }
        } catch (e) {
            console.error('Error checking transactions:', e);
        }

        // First time + no VIP deposit = need to pay
        return { isFree: false };
    };

    const handleSaveBranding = async () => {
        if (!userProfile) return;

        // Dev mode specific behavior
        if (userProfile.payment_code === 'DEVMODE') {
            // Just ensure branding logo is set in state (mock saving)
            alert("Dev Mode: Branding settings applied locally.");
            return;
        }

        // Check pricing eligibility
        const eligibility = await checkBrandingEligibility();

        // If not free, check credits and charge
        if (!eligibility.isFree) {
            if (userProfile.credits < BRANDING_COST) {
                alert(`Không đủ xu! Cần ${BRANDING_COST} xu để kích hoạt Branding Kit lần đầu.`);
                return;
            }

            // Confirm charge
            const confirmed = window.confirm(
                `Kích hoạt Branding Kit lần đầu sẽ tốn ${BRANDING_COST} xu. Sau này thay đổi logo sẽ miễn phí. Bạn có muốn tiếp tục?`
            );
            if (!confirmed) return;
        }

        setIsSavingBranding(true);
        try {
            let finalLogoUrl = brandingLogo;
            // If brandingLogo is a Base64 string (new upload), upload it to storage first
            if (brandingLogo && brandingLogo.startsWith('data:')) {
                const fileName = `${userProfile.id}/branding_logo_${Date.now()}.png`;
                finalLogoUrl = await uploadImageToStorage(brandingLogo, fileName);
            }

            // Save to DB (finalLogoUrl can be null if user deleted logo)
            await saveBrandingToDb(userProfile.id, finalLogoUrl, brandingConfig);

            // Deduct credits if first time
            if (!eligibility.isFree && finalLogoUrl) {
                const newBalance = userProfile.credits - BRANDING_COST;
                await updateUserCredits(userProfile.id, newBalance);
                setUserProfile({
                    ...userProfile,
                    credits: newBalance,
                    branding_logo_url: finalLogoUrl,
                    branding_config: brandingConfig
                });
            } else {
                // Update local profile state
                setUserProfile({
                    ...userProfile,
                    branding_logo_url: finalLogoUrl,
                    branding_config: brandingConfig
                });
            }

            // Reload logo to ensure we use the remote URL
            setBrandingLogo(finalLogoUrl);
            alert(finalLogoUrl ? "Branding settings saved!" : "Branding logo removed!");
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
