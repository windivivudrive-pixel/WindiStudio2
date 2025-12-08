
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HistoryItem, Category, AppMode } from '../types';
import { fetchLibraryImages, toggleGenerationFavorite, fetchCategories, createCategory, fetchProfiles, deleteGenerationsBulk, fetchImageById } from '../services/supabaseService';
import { Heart, Plus, X, FolderPlus, Filter, Calendar, User, Layers, Copy, ChevronLeft, ChevronRight, Trash2, CheckSquare, Square, Minus, ZoomIn, ZoomOut, Info } from 'lucide-react';

interface LibraryViewProps {
    onSelectImage: (image: string) => void;
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

    // Bulk Delete State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Reset pagination when filters change
    useEffect(() => {
        setPage(0);
        setHasMore(true);
        setImages([]);
        loadData(0, true);
    }, [viewMode, selectedCategory, selectedUser, selectedImageType, selectedDays]);

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
            limit: 60
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
        await handleToggleFavorite(itemToFavorite, true, categoryId);
        setShowCategorySelect(false);
        setItemToFavorite(null);
    };

    const handleToggleFavorite = async (item: HistoryItem, isFavorite: boolean, categoryId?: number) => {
        // Optimistic update
        setImages(prev => prev.map(img =>
            img.id === item.id ? { ...img, isFavorite: isFavorite, categoryId: categoryId } : img
        ));

        // If in Library view and removing, remove from list
        if (viewMode === 'LIBRARY' && !isFavorite) {
            setImages(prev => prev.filter(img => img.id !== item.id));
        }

        const success = await toggleGenerationFavorite(item.id, isFavorite, categoryId);

        if (!success) {
            // Revert on failure
            // We might want to reload data here, but for now just alert
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
    // --- MODAL NAVIGATION & ZOOM ---
    // --- MODAL NAVIGATION & ZOOM ---
    const [zoomLevel, setZoomLevel] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [showDetails, setShowDetails] = useState(false); // Mobile bottom sheet state

    // Refs for direct DOM manipulation (Performance & Scroll Fix)
    const imgRef = useRef<HTMLImageElement>(null);
    const zoomLevelRef = useRef(1);
    const panRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    // Pinch Zoom Refs
    const isPinchingRef = useRef(false);
    const initialPinchDistanceRef = useRef(0);
    const initialZoomLevelRef = useRef(1);

    // For Swipe Detection (at 1x zoom)
    const touchStartRef = useRef<number | null>(null);
    const touchEndRef = useRef<number | null>(null);
    const lastTouchTimeRef = useRef(0); // For tap detection

    // Sync zoom state to ref
    useEffect(() => {
        zoomLevelRef.current = zoomLevel;
        if (zoomLevel === 1) {
            // Reset pan when zooming out
            panRef.current = { x: 0, y: 0 };
            if (imgRef.current) {
                imgRef.current.style.transform = `scale(1)`;
                imgRef.current.style.cursor = 'zoom-in';
                imgRef.current.style.touchAction = 'auto'; // Allow default scrolling at 1x
            }
        } else {
            if (imgRef.current) {
                imgRef.current.style.cursor = 'grab';
                imgRef.current.style.touchAction = 'none'; // Disable browser handling at >1x
                // Apply current pan (which should be 0,0 on fresh zoom in)
                updateTransform();
            }
        }
    }, [zoomLevel]);

    // Reset everything when image changes
    useEffect(() => {
        setZoomLevel(1);
        panRef.current = { x: 0, y: 0 };
        // Transform reset handled by zoomLevel effect above
    }, [selectedImageForModal]);

    const updateTransform = () => {
        if (imgRef.current) {
            imgRef.current.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomLevelRef.current})`;
        }
    };

    const handleNextImage = (e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation();
        if (!selectedImageForModal) return;
        const currentIndex = images.findIndex(img => img.id === selectedImageForModal.id);
        if (currentIndex !== -1 && currentIndex < images.length - 1) {
            setSelectedImageForModal(images[currentIndex + 1]);
        }
    };

    const handlePrevImage = (e?: React.MouseEvent | KeyboardEvent) => {
        e?.stopPropagation();
        if (!selectedImageForModal) return;
        const currentIndex = images.findIndex(img => img.id === selectedImageForModal.id);
        if (currentIndex > 0) {
            setSelectedImageForModal(images[currentIndex - 1]);
        }
    };

    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoomLevel(prev => Math.min(prev + 1, 4));
    };

    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoomLevel(prev => Math.max(prev - 1, 1));
    };

    const handleDoubleTap = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (zoomLevelRef.current > 1) {
            // Reset to 1x
            setZoomLevel(1);
            panRef.current = { x: 0, y: 0 };
        } else {
            // Zoom to 2x at click point
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            panRef.current = { x: -x, y: -y };
            setZoomLevel(2);
        }
    };



    // Mouse Events for Panning
    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoomLevelRef.current > 1) {
            e.preventDefault();
            isDraggingRef.current = true;
            dragStartRef.current = {
                x: e.clientX - panRef.current.x,
                y: e.clientY - panRef.current.y
            };
            if (imgRef.current) imgRef.current.style.cursor = 'grabbing';
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDraggingRef.current && zoomLevelRef.current > 1) {
            e.preventDefault();
            panRef.current = {
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            };
            updateTransform();
        }
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
        if (imgRef.current && zoomLevelRef.current > 1) imgRef.current.style.cursor = 'grab';
    };

    const handleMouseLeave = () => {
        isDraggingRef.current = false;
        if (imgRef.current && zoomLevelRef.current > 1) imgRef.current.style.cursor = 'grab';
    };

    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedImageForModal) return;
            // Only navigate if not zoomed in, to avoid conflict if we add pan keys later
            if (zoomLevel === 1) {
                if (e.key === 'ArrowRight') handleNextImage(e);
                if (e.key === 'ArrowLeft') handlePrevImage(e);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedImageForModal, images, zoomLevel]);

    // Touch Logic (Swipe, Pan, Pinch, Tap)
    useEffect(() => {
        const imgEl = imgRef.current;
        if (!imgEl) return;

        const getDistance = (touches: TouchList) => {
            return Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
        };

        const onTouchStart = (e: TouchEvent) => {
            e.stopPropagation();

            // Disable transition during gesture for instant response
            if (imgRef.current) {
                imgRef.current.style.transition = 'none';
            }

            // Handle Pinch Start
            if (e.touches.length === 2) {
                isPinchingRef.current = true;
                initialPinchDistanceRef.current = getDistance(e.touches);
                initialZoomLevelRef.current = zoomLevelRef.current;
                return;
            }

            // Handle Drag/Swipe Start
            if (e.touches.length === 1) {
                lastTouchTimeRef.current = Date.now();
                touchEndRef.current = null;
                touchStartRef.current = e.touches[0].clientX;
                // Track Y for vertical swipe
                dragStartRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY
                };

                if (zoomLevelRef.current > 1) {
                    isDraggingRef.current = true;
                    // Adjust for pan offset
                    dragStartRef.current = {
                        x: e.touches[0].clientX - panRef.current.x,
                        y: e.touches[0].clientY - panRef.current.y
                    };
                }
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            e.stopPropagation();
            if (e.cancelable) e.preventDefault(); // Prevent scrolling

            // Handle Pinch Move
            if (isPinchingRef.current && e.touches.length === 2) {
                const currentDistance = getDistance(e.touches);
                const scale = currentDistance / initialPinchDistanceRef.current;
                const newZoom = Math.min(Math.max(initialZoomLevelRef.current * scale, 1), 4); // Clamp 1x-4x

                zoomLevelRef.current = newZoom;
                // Update transform immediately for smooth pinch
                updateTransform();
                return;
            }

            // Handle Drag/Swipe Move
            if (e.touches.length === 1) {
                if (zoomLevelRef.current === 1) {
                    touchEndRef.current = e.touches[0].clientX;
                } else if (isDraggingRef.current) {
                    panRef.current = {
                        x: e.touches[0].clientX - dragStartRef.current.x,
                        y: e.touches[0].clientY - dragStartRef.current.y
                    };
                    updateTransform();
                }
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            e.stopPropagation();

            // Restore transition after gesture
            if (imgRef.current && e.touches.length === 0) {
                imgRef.current.style.transition = '';
            }

            // Handle Pinch End
            if (isPinchingRef.current && e.touches.length < 2) {
                isPinchingRef.current = false;
                // Sync ref to state to update UI
                setZoomLevel(zoomLevelRef.current);
                return;
            }

            isDraggingRef.current = false;



            // Handle Swipe (at 1x)
            if (zoomLevelRef.current === 1 && touchStartRef.current && touchEndRef.current) {
                const distanceX = touchStartRef.current - touchEndRef.current;
                const distanceY = dragStartRef.current.y - e.changedTouches[0].clientY; // Positive = Swipe Up

                // Horizontal Swipe (Next/Prev) - Only if vertical movement is small
                if (Math.abs(distanceX) > 50 && Math.abs(distanceY) < 30) {
                    if (distanceX > 0) handleNextImage();
                    else handlePrevImage();
                }

                // Vertical Swipe (Show/Hide Details) - Only if horizontal movement is small
                if (Math.abs(distanceY) > 50 && Math.abs(distanceX) < 30) {
                    if (distanceY > 0) setShowDetails(true); // Swipe Up
                    else setShowDetails(false); // Swipe Down
                }
            }
        };

        // Attach non-passive listeners
        imgEl.addEventListener('touchstart', onTouchStart, { passive: false });
        imgEl.addEventListener('touchmove', onTouchMove, { passive: false });
        imgEl.addEventListener('touchend', onTouchEnd);

        return () => {
            imgEl.removeEventListener('touchstart', onTouchStart);
            imgEl.removeEventListener('touchmove', onTouchMove);
            imgEl.removeEventListener('touchend', onTouchEnd);
        };
    }, [selectedImageForModal]); // Re-attach when modal opens/image changes

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
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0a0a0a]">


                {/* TRENDING SECTION (Horizontal Scroll) */}
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

                {/* Category Bar */}
                <div className="h-14 border-b border-white/5 flex items-center px-6 gap-2 overflow-x-auto custom-scrollbar bg-black/30 shrink-0 mb-6 rounded-xl">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${selectedCategory === null ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30 hover:text-white'}`}
                    >
                        All Categories
                    </button>
                    {categories.map(cat => (
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

                {/* MAIN GRID HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    {/* ... (Header content if any, currently empty in previous view but structure implies it) ... */}
                </div>

                {/* MAIN GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {images.filter(item => {
                        // Only filter out trending images if we are in LIBRARY mode AND no category is selected (Trending section is visible)
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
                            <p className="text-xs text-gray-400 mb-4">Select a category for this image:</p>

                            <div className="grid grid-cols-2 gap-2 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                                <button
                                    onClick={() => confirmAddToLibrary(undefined)}
                                    className="p-3 rounded-lg bg-white/5 hover:bg-white hover:text-black text-gray-300 text-xs font-bold transition-colors border border-white/5 text-left truncate"
                                >
                                    Uncategorized
                                </button>
                                {categories.map(cat => (
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
            {
                selectedImageForModal && (
                    <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200" onClick={() => {
                        if (window.history.state?.modalOpen) {
                            window.history.back();
                        } else {
                            setSelectedImageForModal(null);
                        }
                    }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.history.state?.modalOpen) {
                                    window.history.back();
                                } else {
                                    setSelectedImageForModal(null);
                                }
                            }}
                            className={`absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-50 ${!showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        >
                            <X size={24} />
                        </button>

                        <div
                            className={`w-full h-full flex flex-col md:flex-row max-w-7xl mx-auto p-4 md:p-8 gap-6 transition-all duration-300 ${!showControls || zoomLevel > 1 ? 'max-w-full p-0 md:p-0' : ''}`}
                            onClick={e => e.stopPropagation()}
                            style={{ touchAction: 'none' }}
                        >
                            {/* Image Container */}
                            <div
                                className={`flex-1 relative flex items-center justify-center bg-black/20 rounded-2xl overflow-hidden border border-white/5 select-none transition-all duration-300 ${!showControls || zoomLevel > 1 ? 'rounded-none border-0 bg-black' : ''}`}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseLeave}
                            >
                                <img
                                    ref={imgRef}
                                    src={selectedImageForModal.thumbnail}
                                    alt="Fullscreen"
                                    className={`max-w-full max-h-full object-contain shadow-2xl transition-transform duration-200 ${zoomLevel > 1 ? 'cursor-grab' : 'cursor-zoom-in'}`}
                                    // Style transform is now handled by direct DOM manipulation for performance
                                    onDoubleClick={handleDoubleTap}
                                    draggable={false}
                                />

                                {/* Navigation Arrows (Desktop) */}
                                <button
                                    onClick={handlePrevImage}
                                    className={`absolute left-4 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all hidden md:flex ${!showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                >
                                    <ChevronLeft size={32} />
                                </button>
                                <button
                                    onClick={handleNextImage}
                                    className={`absolute right-4 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-all hidden md:flex ${!showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                >
                                    <ChevronRight size={32} />
                                </button>

                                {/* Desktop Zoom Controls */}
                                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 transition-all hidden md:flex ${!showControls ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                                    <button
                                        onClick={handleZoomOut}
                                        disabled={zoomLevel <= 1}
                                        className={`p-2 rounded-full transition-colors ${zoomLevel <= 1 ? 'text-white/20 cursor-not-allowed' : 'text-white hover:bg-white/20'}`}
                                    >
                                        <Minus size={20} />
                                    </button>
                                    <span className="text-xs font-bold text-white w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                                    <button
                                        onClick={handleZoomIn}
                                        disabled={zoomLevel >= 4}
                                        className={`p-2 rounded-full transition-colors ${zoomLevel >= 4 ? 'text-white/20 cursor-not-allowed' : 'text-white hover:bg-white/20'}`}
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>

                                {/* Mobile Info Button (Fallback for Swipe) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDetails(prev => !prev);
                                    }}
                                    className={`md:hidden absolute bottom-6 right-6 p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white shadow-lg z-[65] transition-all ${!showControls || showDetails ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
                                >
                                    <Info size={24} />
                                </button>

                                {/* Type Badge */}
                                <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-lg backdrop-blur-md border text-xs font-bold uppercase shadow-lg pointer-events-none ${selectedImageForModal.imageType === 'SCALE2' ? 'bg-black/60 text-purple-400 border-purple-500/50' :
                                    (selectedImageForModal.imageType === 'SCALE4' || selectedImageForModal.imageType === 'SCALEX2') ? 'bg-black/60 text-pink-500 border-pink-500/50' :
                                        'bg-black/60 text-white border-white/10'
                                    }`}>
                                    {(() => {
                                        const type = selectedImageForModal.imageType?.toUpperCase();
                                        if (type === 'STANDARD') return 'AIR';
                                        if (type === 'PREMIUM') return 'PRO';
                                        if (type === 'SCALE2' || type === 'SCALEX2') return '2K';
                                        if (type === 'SCALE4') return '4K';
                                        return 'AI';
                                    })()}
                                </div>
                            </div>

                            {/* Details Panel - Mobile Bottom Sheet & Desktop Side Panel */}
                            {/* Mobile: Fixed Bottom Sheet */}
                            <div className={`md:hidden fixed inset-x-0 bottom-0 z-[60] bg-[#1a1a1a] rounded-t-3xl p-6 flex flex-col gap-4 transition-transform duration-300 ease-out shadow-[0_-10px_40px_rgba(0,0,0,0.8)] border-t border-white/10 ${showDetails ? 'translate-y-0' : 'translate-y-full'}`}>
                                {/* Drag Handle */}
                                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2" />

                                <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    <div>
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
                                            Prompt
                                            <button
                                                onClick={() => handleCopyPrompt(selectedImageForModal.prompt)}
                                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </h3>
                                        <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                                            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                {selectedImageForModal.prompt}
                                            </p>
                                        </div>
                                    </div>

                                    {viewMode === 'ALL_USERS' && selectedImageForModal.userEmail && (
                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5">
                                            <User size={14} className="text-gray-400" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold">Creator</span>
                                                <span className="text-xs text-white truncate max-w-[200px]">{selectedImageForModal.userEmail}</span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            onSelectImage(selectedImageForModal.thumbnail);
                                            window.history.back();
                                        }}
                                        className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-all shadow-glow flex items-center justify-center gap-2 mt-2"
                                    >
                                        Use Image
                                    </button>
                                </div>
                            </div>

                            {/* Desktop: Side Panel (Existing) */}
                            {showControls && zoomLevel === 1 && (
                                <div className="hidden md:flex w-full md:w-80 lg:w-96 flex-col gap-4 shrink-0 animate-in slide-in-from-right-4 fade-in duration-300">
                                    <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-white/10 bg-[#1a1a1a]">
                                        <div>
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
                                                Prompt
                                                <button
                                                    onClick={() => handleCopyPrompt(selectedImageForModal.prompt)}
                                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                    title="Copy Prompt"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </h3>
                                            <div className="p-3 rounded-xl bg-black/40 border border-white/5 max-h-60 overflow-y-auto custom-scrollbar">
                                                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                                                    {selectedImageForModal.prompt}
                                                </p>
                                            </div>
                                        </div>

                                        {viewMode === 'ALL_USERS' && selectedImageForModal.userEmail && (
                                            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5">
                                                <User size={14} className="text-gray-400" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-gray-500 uppercase font-bold">Creator</span>
                                                    <span className="text-xs text-white truncate max-w-[200px]">{selectedImageForModal.userEmail}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-auto pt-2">
                                            <button
                                                onClick={() => {
                                                    onSelectImage(selectedImageForModal.thumbnail);
                                                    window.history.back();
                                                }}
                                                className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-200 transition-all shadow-glow flex items-center justify-center gap-2"
                                            >
                                                Use Image
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
};
