
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HistoryItem, Category, AppMode } from '../types';
import { fetchLibraryImages, toggleGenerationFavorite, fetchCategories, createCategory, fetchProfiles, deleteGenerationsBulk, fetchImageById } from '../services/supabaseService';
import { Heart, Plus, X, FolderPlus, Filter, Calendar, User, Layers, Copy, ChevronLeft, ChevronRight, Trash2, CheckSquare, Square, Minus, ZoomIn, ZoomOut, Info } from 'lucide-react';
import Masonry from 'react-masonry-css';

import { FullscreenImageModal } from './FullscreenImageModal';

interface LibraryViewProps {
    onSelectImage: (image: string, options?: { mode?: string; imageType?: string; prompt?: string }) => void;
    onClose: () => void;
    isAdmin?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onSelectImage, onClose, isAdmin = false }) => {
    console.log("LibraryView - isAdmin:", isAdmin);
    const [images, setImages] = useState<HistoryItem[]>([]);
    const [trendingImages, setTrendingImages] = useState<HistoryItem[]>([]); // New state for Trending
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'ALL_USERS' | 'LIBRARY'>('LIBRARY');
    const [sectionType, setSectionType] = useState<'STUDIO' | 'CREATIVE'>('CREATIVE'); // Main section filter - default to CREATIVE

    // Filters
    const [users, setUsers] = useState<{ id: string, email: string }[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [selectedImageType, setSelectedImageType] = useState<string>('');
    const [selectedDays, setSelectedDays] = useState<number | undefined>(undefined);

    // Pagination
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver | null>(null);

    // Add Category State
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Add to Library Modal State
    const [itemToFavorite, setItemToFavorite] = useState<HistoryItem | null>(null);
    const [showCategorySelect, setShowCategorySelect] = useState(false);
    const [modalSectionType, setModalSectionType] = useState<'CREATIVE' | 'STUDIO'>('CREATIVE');

    // Bulk Delete State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Reset pagination when filters change
    useEffect(() => {
        setPage(0);
        setHasMore(true);
        setImages([]);
        loadData(0, true);
    }, [viewMode, selectedCategory, selectedUser, selectedImageType, selectedDays, sectionType]);

    // Fetch Trending Images on Mount
    // Fetch Trending Images on Mount
    useEffect(() => {
        const loadTrending = async () => {
            // 1. Fetch categories to find "Trending" ID
            const cats = await fetchCategories();

            // Handle duplicate names by appending ID
            const nameCounts = new Map<string, number>();
            cats.forEach(c => {
                const name = c.name.trim().toLowerCase();
                nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
            });

            const processedCats = cats.map(c => {
                const name = c.name.trim().toLowerCase();
                if ((nameCounts.get(name) || 0) > 1) {
                    return { ...c, name: `${c.name} (${c.id})` };
                }
                return c;
            });

            console.log("LibraryView - Processed Categories:", processedCats);

            // Update categories state if not already loaded (optimization)
            if (categories.length === 0) setCategories(processedCats);

            const trendingCat = cats.find(c => c.name.toLowerCase() === 'trending');

            if (trendingCat) {
                // 2. Fetch images for "Trending" category
                const trending = await fetchLibraryImages({
                    onlyFavorites: true,
                    categoryId: trendingCat.id, // Use Category ID
                    limit: 30,
                    page: 0
                });
                setTrendingImages(trending);
            } else {
                console.warn("Trending category not found");
                setTrendingImages([]);
            }
        };
        loadTrending();
    }, []);



    const loadData = async (pageToLoad: number, isReset: boolean = false) => {
        if (!hasMore && !isReset) return;

        setIsLoading(true);

        // Fetch profiles only if in ALL_USERS mode and not fetched yet
        if (viewMode === 'ALL_USERS' && users.length === 0) {
            const profiles = await fetchProfiles();
            setUsers(profiles);
        }

        // Fetch categories only once
        if (categories.length === 0) {
            const cats = await fetchCategories();
            // Handle duplicate names by appending ID
            const nameCounts = new Map<string, number>();
            cats.forEach(c => {
                const name = c.name.trim().toLowerCase();
                nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
            });

            const processedCats = cats.map(c => {
                const name = c.name.trim().toLowerCase();
                if ((nameCounts.get(name) || 0) > 1) {
                    return { ...c, name: `${c.name} (${c.id})` };
                }
                return c;
            });
            setCategories(processedCats);
        }

        const fetchOptions = {
            onlyFavorites: viewMode === 'LIBRARY',
            categoryId: selectedCategory || undefined,
            userId: viewMode === 'ALL_USERS' && selectedUser ? selectedUser : undefined,
            imageType: viewMode === 'ALL_USERS' && selectedImageType ? selectedImageType : undefined,
            daysAgo: viewMode === 'ALL_USERS' ? selectedDays : undefined,
            page: pageToLoad,
            limit: 60,
            sectionType: viewMode === 'LIBRARY' ? sectionType : undefined // Apply section filter only in LIBRARY mode
        };

        const newImages = await fetchLibraryImages(fetchOptions);

        if (newImages.length < 60) {
            setHasMore(false);
        }

        setImages(prev => {
            if (isReset) return newImages;
            // Deduplicate: Filter out images that are already in the list
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNewImages = newImages.filter(img => !existingIds.has(img.id));
            return [...prev, ...uniqueNewImages];
        });
        setIsLoading(false);
    };

    const lastImageElementRef = useCallback((node: HTMLDivElement) => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => {
                    const nextPage = prevPage + 1;
                    loadData(nextPage);
                    return nextPage;
                });
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, hasMore]);

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        const newCat = await createCategory(newCategoryName);
        if (newCat) {
            setCategories([...categories, newCat]);
            setNewCategoryName('');
            setShowAddCategory(false);
        }
    };

    const handleHeartClick = (item: HistoryItem) => {
        if (item.isFavorite) {
            // If already favorite, remove it immediately (toggle off)
            handleToggleFavorite(item, false);
        } else {
            // If not favorite, open modal to select category
            setItemToFavorite(item);
            setShowCategorySelect(true);
        }
    };

    const confirmAddToLibrary = async (categoryId?: number) => {
        if (!itemToFavorite) return;
        // Determine the mode based on the selected section type in the modal
        const modeForSection = modalSectionType === 'CREATIVE' ? 'CREATIVE' : (itemToFavorite.mode !== 'CREATIVE' ? itemToFavorite.mode : 'CREATIVE_POSE');
        await handleToggleFavorite(itemToFavorite, true, categoryId, modeForSection);
        setShowCategorySelect(false);
        setItemToFavorite(null);
    };

    const handleToggleFavorite = async (item: HistoryItem, isFavorite: boolean, categoryId?: number, mode?: string) => {
        // Optimistic update
        setImages(prev => prev.map(img =>
            img.id === item.id ? { ...img, isFavorite: isFavorite, categoryId: categoryId, mode: (mode as AppMode) || img.mode } : img
        ));

        // If in Library view and removing, remove from list
        if (viewMode === 'LIBRARY' && !isFavorite) {
            setImages(prev => prev.filter(img => img.id !== item.id));
        }

        const success = await toggleGenerationFavorite(item.id, isFavorite, categoryId, mode);

        if (!success) {
            alert("Failed to update favorite status");
        }
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedItems.size} images? This cannot be undone.`)) return;

        setIsLoading(true);
        const { successCount, failCount } = await deleteGenerationsBulk(Array.from(selectedItems));
        setIsLoading(false);

        alert(`Deleted ${successCount} images.${failCount > 0 ? ` Failed to delete ${failCount}.` : ''}`);

        // Reset selection and reload
        setIsSelectionMode(false);
        setSelectedItems(new Set());
        setPage(0);
        setImages([]);
        loadData(0, true);
    };

    const handleQuickDelete = async (item: HistoryItem) => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        // Optimistic update
        setImages(prev => prev.filter(img => img.id !== item.id));

        const { successCount } = await deleteGenerationsBulk([item.id]);

        if (successCount === 0) {
            alert("Failed to delete image.");
            // Revert optimistic update (reload data or just warn)
            // For simplicity, we just warn. Ideally we should revert state.
        }
    };

    const [selectedImageForModal, setSelectedImageForModal] = useState<HistoryItem | null>(null);

    // Deep Linking: Check URL for image ID on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const imageId = params.get('image');

        if (imageId) {
            const findAndSetImage = async () => {
                // First check if already in loaded images (unlikely on fresh load but possible)
                const existing = images.find(img => img.id === imageId);
                if (existing) {
                    setSelectedImageForModal(existing);
                } else {
                    // Fetch specifically
                    const image = await fetchImageById(imageId);
                    if (image) {
                        setSelectedImageForModal(image);
                    }
                }
            };
            findAndSetImage();
        }
    }, []); // Run once on mount

    // Update URL when modal opens/closes
    useEffect(() => {
        const url = new URL(window.location.href);
        if (selectedImageForModal) {
            url.searchParams.set('image', selectedImageForModal.id);
        } else {
            url.searchParams.delete('image');
        }
        window.history.replaceState(window.history.state, '', url.toString());
    }, [selectedImageForModal]);

    // ... existing code ...

    // Handle Modal Back Button & Body Scroll Lock
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (selectedImageForModal) {
                setSelectedImageForModal(null);
            }
        };

        if (selectedImageForModal) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('popstate', handlePopState);
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            window.removeEventListener('popstate', handlePopState);
            document.body.style.overflow = 'unset';
        };
    }, [selectedImageForModal]);

    // --- MODAL NAVIGATION & ZOOM ---
    const [showDetails, setShowDetails] = useState(false); // Used only when rendering old modal details, but now handled inside FullscreenImageModal
    // Note: Zoom logic and touch events have been moved to FullscreenImageModal.tsx

    const handleCopyPrompt = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Prompt copied to clipboard!");
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-200 bg-black/20 rounded-[24px] border border-white/10">
            {/* Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-black/50 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {viewMode === 'LIBRARY' ? <Heart className="text-red-500 fill-red-500" size={20} /> : <Filter className="text-mystic-accent" size={20} />}
                        {viewMode === 'LIBRARY' ? 'Discover' : 'All Generations'}
                    </h2>

                    {isAdmin && (
                        <div className="flex items-center gap-3">
                            {viewMode === 'ALL_USERS' && (
                                <button
                                    onClick={() => {
                                        setIsSelectionMode(!isSelectionMode);
                                        setSelectedItems(new Set());
                                    }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${isSelectionMode ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'}`}
                                >
                                    {isSelectionMode ? 'Cancel Selection' : 'Select'}
                                </button>
                            )}
                            <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                                <button
                                    onClick={() => {
                                        setViewMode('LIBRARY');
                                        // Reset filters
                                        setSelectedCategory(null);
                                        setSelectedUser('');
                                        setSelectedImageType('');
                                        setSelectedDays(undefined);
                                    }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'LIBRARY' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Discover
                                </button>
                                <button
                                    onClick={() => {
                                        setViewMode('ALL_USERS');
                                        // Reset filters
                                        setSelectedCategory(null);
                                        setSelectedUser('');
                                        setSelectedImageType('');
                                        setSelectedDays(undefined);
                                    }}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'ALL_USERS' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                                >
                                    All Users
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                    <X size={18} />
                </button>
            </div>

            {/* Filters Bar (Only for All Users) */}
            {viewMode === 'ALL_USERS' && (
                <div className="h-12 border-b border-white/5 flex items-center px-6 gap-4 bg-black/40 shrink-0 overflow-x-auto custom-scrollbar">
                    {/* User Filter */}
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                        <User size={14} className="text-gray-400" />
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="bg-transparent text-xs text-white focus:outline-none w-32"
                        >
                            <option value="">All Users</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id} className="bg-black text-white">{user.email}</option>
                            ))}
                        </select>
                    </div>

                    {/* Image Type Filter */}
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                        <Layers size={14} className="text-gray-400" />
                        <select
                            value={selectedImageType}
                            onChange={(e) => setSelectedImageType(e.target.value)}
                            className="bg-transparent text-xs text-white focus:outline-none w-32"
                        >
                            <option value="">All Types</option>
                            <option value="STANDARD" className="bg-black text-white">Standard</option>
                            <option value="PREMIUM" className="bg-black text-white">Premium</option>
                            <option value="SCALEX2" className="bg-black text-white">Scale X2</option>
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                        <Calendar size={14} className="text-gray-400" />
                        <select
                            value={selectedDays || ''}
                            onChange={(e) => setSelectedDays(e.target.value ? Number(e.target.value) : undefined)}
                            className="bg-transparent text-xs text-white focus:outline-none w-32"
                        >
                            <option value="">Any Time</option>
                            <option value="1" className="bg-black text-white">Last 24 Hours</option>
                            <option value="7" className="bg-black text-white">Last 7 Days</option>
                            <option value="30" className="bg-black text-white">Last 30 Days</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Category Bar */}


            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-6 pt-6 pb-0 custom-scrollbar bg-[#0a0a0a]">


                {/* TRENDING SECTION - HIDDEN
                {viewMode === 'LIBRARY' && !selectedCategory && (
                    <div className="mb-8">
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <span className="text-yellow-400">🔥</span> Trending Now
                        </h2>
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                            {trendingImages.map((item) => (
                                <div key={`trending-${item.id}`} className="snap-center shrink-0 w-[160px] md:w-[200px] aspect-[3/4] rounded-xl overflow-hidden relative group cursor-pointer border border-white/10" onClick={() => setSelectedImageForModal(item)}>
                                    <img src={item.thumbnail} alt={item.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                        <p className="text-[10px] text-gray-300 line-clamp-2">{item.prompt}</p>
                                    </div>
                                </div>
                            ))}
                            {trendingImages.length === 0 && (
                                <div className="w-full py-8 text-center text-gray-500 text-sm">Loading trending...</div>
                            )}
                        </div>
                    </div>
                )}
                */}

                {/* CREATIVE / STUDIO Section Tabs */}
                {viewMode === 'LIBRARY' && (
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => { setSectionType('CREATIVE'); setSelectedCategory(null); }}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${sectionType === 'CREATIVE' ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
                        >
                            ✨ CREATIVE
                        </button>
                        <button
                            onClick={() => { setSectionType('STUDIO'); setSelectedCategory(null); }}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${sectionType === 'STUDIO' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
                        >
                            🎨 STUDIO
                        </button>
                    </div>
                )}

                {/* Category Bar - Only show if more than 1 category in current section */}
                {categories.filter(cat => viewMode !== 'LIBRARY' || !cat.section_type || cat.section_type === sectionType).length > 1 && (
                    <div className="h-14 border-b border-white/5 flex items-center px-6 gap-2 overflow-x-auto custom-scrollbar bg-black/30 shrink-0 mb-6 rounded-xl">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === null ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30 hover:text-white'}`}
                        >
                            Tất cả
                        </button>
                        {categories
                            .filter(cat => viewMode !== 'LIBRARY' || !cat.section_type || cat.section_type === sectionType)
                            .map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === cat.id ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30 hover:text-white'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}

                        {isAdmin && (
                            <button
                                onClick={() => setShowAddCategory(true)}
                                className="w-8 h-8 rounded-full border border-dashed border-white/20 flex items-center justify-center text-white/40 hover:text-white hover:border-white/50 transition-all ml-2"
                                title="Add Category"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </div>
                )}

                {/* MAIN GRID HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    {/* ... (Header content if any, currently empty in previous view but structure implies it) ... */}
                </div>

                {/* MAIN GRID - Masonry for CREATIVE, Fixed grid for STUDIO */}
                {viewMode === 'LIBRARY' && sectionType === 'CREATIVE' ? (
                    <Masonry
                        breakpointCols={{ default: 5, 1280: 4, 1024: 3, 768: 2 }}
                        className="flex -ml-3 w-auto"
                        columnClassName="pl-3 bg-clip-padding"
                    >
                        {images.filter(item => {
                            if (viewMode === 'LIBRARY' && !selectedCategory) {
                                return !trendingImages.some(t => t.id === item.id);
                            }
                            return true;
                        }).map((item, index, arr) => (
                            <div
                                key={`${item.id}-${index}`}
                                ref={index === arr.length - 1 ? lastImageElementRef : null}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        toggleSelection(item.id);
                                    } else {
                                        setSelectedImageForModal(item);
                                        window.history.pushState({ modalOpen: true }, '');
                                    }
                                }}
                                className={`group relative mb-3 bg-[#1a1a1a] rounded-xl overflow-hidden border transition-all shadow-lg hover:shadow-glow-sm cursor-pointer ${selectedItems.has(item.id) ? 'border-red-500 ring-2 ring-red-500/50' : 'border-white/5 hover:border-mystic-accent/50'}`}
                            >
                                <img
                                    src={item.thumbnail}
                                    alt={item.prompt}
                                    className="w-full h-auto block"
                                    loading="lazy"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.minHeight = '200px';
                                        target.style.background = 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)';
                                    }}
                                />

                                {/* Heart Button */}
                                {isAdmin && (
                                    <div className={`absolute top-2 right-2 z-10 transition-all duration-200 ${item.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleHeartClick(item);
                                            }}
                                            className={`p-2 rounded-full backdrop-blur-md transition-all ${item.isFavorite
                                                ? 'bg-red-500 text-white shadow-lg scale-110'
                                                : 'bg-black/40 text-white/60 hover:bg-white hover:text-black'
                                                }`}
                                        >
                                            <Heart size={16} className={item.isFavorite ? "fill-current" : ""} />
                                        </button>
                                    </div>
                                )}

                                {/* Bottom Overlay */}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3 pt-12">
                                    <p className="text-[10px] text-gray-300 line-clamp-2 font-medium leading-relaxed">{item.prompt}</p>
                                </div>

                                {/* Type Badge */}
                                {item.imageType && (
                                    <div className="absolute top-2 left-2 px-2 py-1 rounded-lg backdrop-blur-xl bg-white/10 border border-white/20 text-[10px] font-medium text-white/90 shadow-lg">
                                        {(() => {
                                            const type = item.imageType?.toLowerCase();
                                            if (type === 'standard') return '🍌 Banana';
                                            if (type === 'premium') return '🍌 BananaPro';
                                            if (type === 's4.0') return '🌱 Seedream 4';
                                            if (type === 's4.5') return '🌱 Seedream 4.5';
                                            return item.imageType;
                                        })()}
                                    </div>
                                )}

                                {/* Selection Checkbox */}
                                {isSelectionMode && (
                                    <div className="absolute inset-0 bg-black/20 z-20 flex items-start justify-end p-2">
                                        <div className={`p-1 rounded-full ${selectedItems.has(item.id) ? 'bg-red-500 text-white' : 'bg-black/50 text-gray-400'}`}>
                                            {selectedItems.has(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </Masonry>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {images.filter(item => {
                            if (viewMode === 'LIBRARY' && !selectedCategory) {
                                return !trendingImages.some(t => t.id === item.id);
                            }
                            return true;
                        }).map((item, index, arr) => (
                            <div
                                key={`${item.id}-${index}`}
                                ref={index === arr.length - 1 ? lastImageElementRef : null}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        toggleSelection(item.id);
                                    } else {
                                        setSelectedImageForModal(item);
                                        window.history.pushState({ modalOpen: true }, '');
                                    }
                                }}
                                className={`group relative aspect-[2/3] bg-[#1a1a1a] rounded-xl overflow-hidden border transition-all shadow-lg hover:shadow-glow-sm cursor-pointer ${selectedItems.has(item.id) ? 'border-red-500 ring-2 ring-red-500/50' : 'border-white/5 hover:border-mystic-accent/50'}`}
                            >
                                <img
                                    src={item.thumbnail}
                                    alt={item.prompt}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />

                                {/* Heart Button */}
                                {isAdmin && (
                                    <>
                                        {/* Quick Delete Button (Only in All Users view) */}
                                        {viewMode === 'ALL_USERS' && (
                                            <div className={`absolute top-2 right-10 z-10 transition-all duration-200 opacity-0 group-hover:opacity-100`}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleQuickDelete(item);
                                                    }}
                                                    className="p-2 rounded-full backdrop-blur-md bg-black/40 text-white/60 hover:bg-red-600 hover:text-white transition-all"
                                                    title="Delete Image"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}

                                        <div className={`absolute top-2 right-2 z-10 transition-all duration-200 ${item.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleHeartClick(item);
                                                }}
                                                className={`p-2 rounded-full backdrop-blur-md transition-all ${item.isFavorite
                                                    ? 'bg-red-500 text-white shadow-lg scale-110'
                                                    : 'bg-black/40 text-white/60 hover:bg-white hover:text-black'
                                                    }`}
                                            >
                                                <Heart size={16} className={item.isFavorite ? "fill-current" : ""} />
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* Bottom Overlay */}
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3 pt-12">
                                    <p className="text-[10px] text-gray-300 line-clamp-2 font-medium leading-relaxed">{item.prompt}</p>
                                </div>

                                {/* Type Badge */}
                                {item.imageType && (
                                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-md backdrop-blur-md border text-[10px] font-bold uppercase shadow-lg ${item.imageType === 'SCALE2' ? 'bg-black/60 text-purple-400 border-purple-500/50' :
                                        (item.imageType === 'SCALE4' || item.imageType === 'SCALEX2') ? 'bg-black/60 text-pink-500 border-pink-500/50' :
                                            'bg-black/60 text-white border-white/10'
                                        }`}>
                                        {(() => {
                                            const type = item.imageType?.toUpperCase();
                                            if (type === 'STANDARD') return 'AIR';
                                            if (type === 'PREMIUM') return 'PRO';
                                            if (type === 'SCALE2' || type === 'SCALEX2') return '2K';
                                            if (type === 'SCALE4') return '4K';
                                            return '';
                                        })()}
                                    </div>
                                )}

                                {/* Selection Checkbox */}
                                {isSelectionMode && (
                                    <div className="absolute inset-0 bg-black/20 z-20 flex items-start justify-end p-2">
                                        <div className={`p-1 rounded-full ${selectedItems.has(item.id) ? 'bg-red-500 text-white' : 'bg-black/50 text-gray-400'}`}>
                                            {selectedItems.has(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}


                {isLoading && (
                    <div className="flex w-full items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                )}

                {!isLoading && images.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <FolderPlus size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">No images found matching your filters.</p>
                    </div>
                )}

            </div>
            {/* End Content */}

            {/* Bulk Delete Floating Bar */}
            {
                isSelectionMode && selectedItems.size > 0 && (
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in">
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold shadow-2xl hover:scale-105 transition-all"
                        >
                            <Trash2 size={18} />
                            <span>Delete {selectedItems.size} Images</span>
                        </button>
                    </div>
                )
            }

            {/* Add Category Modal */}
            {
                showAddCategory && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                            <h3 className="text-lg font-bold text-white mb-4">New Category</h3>
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Category Name"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-mystic-accent mb-4"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setShowAddCategory(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-400 font-bold text-xs hover:bg-white/10 hover:text-white transition-colors">Cancel</button>
                                <button onClick={handleCreateCategory} className="flex-1 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-gray-200 transition-colors">Create</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Select Category Modal (Add to Library) */}
            {
                showCategorySelect && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                            <h3 className="text-lg font-bold text-white mb-4">Add to Library</h3>
                            <p className="text-xs text-gray-400 mb-4">Select a section and category for this image:</p>

                            {/* Section Toggle inside Modal */}
                            <div className="flex gap-2 mb-4 p-1 bg-black/40 rounded-xl">
                                <button
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${modalSectionType === 'CREATIVE' ? 'bg-mystic-accent text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    onClick={() => setModalSectionType('CREATIVE')}
                                >
                                    Creative
                                </button>
                                <button
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${modalSectionType === 'STUDIO' ? 'bg-mystic-accent text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                    onClick={() => setModalSectionType('STUDIO')}
                                >
                                    Studio
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                                <button
                                    onClick={() => confirmAddToLibrary(undefined)}
                                    className="p-3 rounded-lg bg-white/5 hover:bg-white hover:text-black text-gray-300 text-xs font-bold transition-colors border border-white/5 text-left truncate"
                                >
                                    Uncategorized
                                </button>
                                {categories.filter(cat => !cat.section_type || cat.section_type === modalSectionType).map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => confirmAddToLibrary(cat.id)}
                                        className="p-3 rounded-lg bg-white/5 hover:bg-white hover:text-black text-gray-300 text-xs font-bold transition-colors border border-white/5 text-left truncate"
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowCategorySelect(false)} className="w-full py-3 rounded-xl bg-white/5 text-gray-400 font-bold text-xs hover:bg-white/10 hover:text-white">Cancel</button>
                        </div>
                    </div>
                )
            }

            {/* Fullscreen Image Modal */}
            {selectedImageForModal && (
                <FullscreenImageModal
                    images={images}
                    selectedImage={selectedImageForModal}
                    onClose={() => {
                        if (window.history.state?.modalOpen) {
                            window.history.back();
                        } else {
                            setSelectedImageForModal(null);
                        }
                    }}
                    onNavigate={(newImage) => setSelectedImageForModal(newImage as any)}
                    onUseImage={onSelectImage}
                    showCreatorInfo={viewMode === 'ALL_USERS'}
                />
            )}
        </div >
    );
};
