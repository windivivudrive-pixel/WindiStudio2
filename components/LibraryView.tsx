
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HistoryItem, Category } from '../types';
import { fetchLibraryImages, toggleGenerationFavorite, fetchCategories, createCategory, fetchProfiles } from '../services/supabaseService';
import { Heart, Plus, X, FolderPlus, Filter, Calendar, User, Layers, Copy } from 'lucide-react';

interface LibraryViewProps {
    onSelectImage: (image: string) => void;
    onClose: () => void;
    isAdmin?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onSelectImage, onClose, isAdmin = false }) => {
    console.log("LibraryView - isAdmin:", isAdmin);
    const [images, setImages] = useState<HistoryItem[]>([]);
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

    // Reset pagination when filters change
    useEffect(() => {
        setPage(0);
        setHasMore(true);
        setImages([]);
        loadData(0, true);
    }, [viewMode, selectedCategory, selectedUser, selectedImageType, selectedDays]);

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
            setCategories(cats);
        }

        const newImages = await fetchLibraryImages({
            onlyFavorites: viewMode === 'LIBRARY',
            categoryId: selectedCategory || undefined,
            userId: viewMode === 'ALL_USERS' && selectedUser ? selectedUser : undefined,
            imageType: viewMode === 'ALL_USERS' && selectedImageType ? selectedImageType : undefined,
            daysAgo: viewMode === 'ALL_USERS' ? selectedDays : undefined,
            page: pageToLoad,
            limit: 60
        });

        if (newImages.length < 60) {
            setHasMore(false);
        }

        setImages(prev => isReset ? newImages : [...prev, ...newImages]);
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

    const [selectedImageForModal, setSelectedImageForModal] = useState<HistoryItem | null>(null);

    // ... existing code ...

    // Handle Modal Back Button
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (selectedImageForModal) {
                setSelectedImageForModal(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [selectedImageForModal]);

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
                        <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                            <button
                                onClick={() => setViewMode('LIBRARY')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'LIBRARY' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                Discover
                            </button>
                            <button
                                onClick={() => setViewMode('ALL_USERS')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'ALL_USERS' ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                            >
                                All Users
                            </button>
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
            <div className="h-14 border-b border-white/5 flex items-center px-6 gap-2 overflow-x-auto custom-scrollbar bg-black/30 shrink-0">
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

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0a0a0a]">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {images.map((item, index) => (
                        <div
                            key={`${item.id}-${index}`}
                            ref={index === images.length - 1 ? lastImageElementRef : null}
                            onClick={() => {
                                setSelectedImageForModal(item);
                                window.history.pushState({ modalOpen: true }, '');
                            }}
                            className="group relative aspect-[2/3] bg-[#1a1a1a] rounded-xl overflow-hidden border border-white/5 hover:border-mystic-accent/50 transition-all shadow-lg hover:shadow-glow-sm cursor-pointer"
                        >
                            <img
                                src={item.thumbnail}
                                alt={item.prompt}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />

                            {/* Heart Button - Always visible if favorite, or on hover */}
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

                            {/* Bottom Overlay - Only show basic info, click opens modal */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3 pt-12">
                                <p className="text-[10px] text-gray-300 line-clamp-2 font-medium leading-relaxed">{item.prompt}</p>
                            </div>

                            {/* Type Badge (Mini) */}
                            {item.imageType && (
                                <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10 text-[8px] font-bold text-white uppercase">
                                    {item.imageType === 'STANDARD' ? 'FLASH' :
                                        item.imageType === 'PREMIUM' ? 'PRO' :
                                            item.imageType === 'SCALE2' ? '2K' :
                                                (item.imageType === 'SCALE4' || item.imageType === 'SCALEX2') ? '4K' : ''}
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

            {/* Add Category Modal */}
            {showAddCategory && (
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
            )}

            {/* Select Category Modal (Add to Library) */}
            {showCategorySelect && (
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
            )}

            {/* Fullscreen Image Modal */}
            {selectedImageForModal && (
                <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-200" onClick={() => window.history.back()}>
                    <button
                        onClick={() => window.history.back()}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-50"
                    >
                        <X size={24} />
                    </button>

                    <div className="w-full h-full flex flex-col md:flex-row max-w-7xl mx-auto p-4 md:p-8 gap-6" onClick={e => e.stopPropagation()}>
                        {/* Image Container */}
                        <div className="flex-1 relative flex items-center justify-center bg-black/20 rounded-2xl overflow-hidden border border-white/5">
                            <img
                                src={selectedImageForModal.thumbnail}
                                alt="Fullscreen"
                                className="max-w-full max-h-full object-contain shadow-2xl"
                            />
                            {/* Type Badge */}
                            <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-white uppercase shadow-lg">
                                {selectedImageForModal.imageType === 'STANDARD' ? 'FLASH' :
                                    selectedImageForModal.imageType === 'PREMIUM' ? 'PRO' :
                                        selectedImageForModal.imageType === 'SCALE2' ? '2K' :
                                            (selectedImageForModal.imageType === 'SCALE4' || selectedImageForModal.imageType === 'SCALEX2') ? '4K' : 'AI'}
                            </div>
                        </div>

                        {/* Details Panel */}
                        <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4 shrink-0">
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
                    </div>
                </div>
            )}
        </div>
    );
};
