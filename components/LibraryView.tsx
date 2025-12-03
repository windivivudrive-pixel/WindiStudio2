import React, { useState, useEffect } from 'react';
import { Plus, Heart, Users, Filter, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Category, LibraryImage, HistoryItem } from '../types';
import { fetchCategories, createCategory, fetchLibraryImages, fetchAllUserGenerations, addToLibrary } from '../services/supabaseService';

interface LibraryViewProps {
    isAdmin: boolean;
    onSelectImage?: (imageUrl: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ isAdmin, onSelectImage }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [images, setImages] = useState<LibraryImage[]>([]);
    const [allUserHistory, setAllUserHistory] = useState<HistoryItem[]>([]);
    const [viewMode, setViewMode] = useState<'LIBRARY' | 'ALL_USERS'>('LIBRARY');
    const [isLoading, setIsLoading] = useState(false);

    // Admin State
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [selectedImageForAdmin, setSelectedImageForAdmin] = useState<HistoryItem | null>(null);

    useEffect(() => {
        loadCategories();
        loadLibraryImages();
    }, []);

    useEffect(() => {
        loadLibraryImages();
    }, [selectedCategory]);

    useEffect(() => {
        if (viewMode === 'ALL_USERS' && isAdmin) {
            loadAllUserHistory();
        }
    }, [viewMode, isAdmin]);

    const loadCategories = async () => {
        const data = await fetchCategories();
        setCategories(data);
    };

    const loadLibraryImages = async () => {
        setIsLoading(true);
        const data = await fetchLibraryImages(selectedCategory || undefined);
        setImages(data);
        setIsLoading(false);
    };

    const loadAllUserHistory = async () => {
        setIsLoading(true);
        const data = await fetchAllUserGenerations();
        setAllUserHistory(data);
        setIsLoading(false);
    };

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        const newCat = await createCategory(newCategoryName.trim());
        if (newCat) {
            setCategories([...categories, newCat]);
            setNewCategoryName('');
            setShowAddCategory(false);
        }
    };

    const handleAddToLibrary = async (item: HistoryItem) => {
        setSelectedImageForAdmin(item);
        setShowAdminModal(true);
    };

    const confirmAddToLibrary = async (categoryId: number) => {
        if (!selectedImageForAdmin) return;
        await addToLibrary(selectedImageForAdmin.thumbnail, categoryId, selectedImageForAdmin.prompt, selectedImageForAdmin.imageType);
        setShowAdminModal(false);
        setSelectedImageForAdmin(null);
        if (viewMode === 'LIBRARY' && (selectedCategory === null || selectedCategory === categoryId)) {
            loadLibraryImages();
        }
        alert("Added to Library!");
    };

    return (
        <div className="w-full h-full flex flex-col">
            {/* Header / Filter Bar */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Library</h2>
                    {isAdmin && (
                        <div className="flex bg-white/5 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('LIBRARY')}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${viewMode === 'LIBRARY' ? 'bg-mystic-accent text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Library
                            </button>
                            <button
                                onClick={() => setViewMode('ALL_USERS')}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'ALL_USERS' ? 'bg-mystic-accent text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                <Users size={14} /> All Users
                            </button>
                        </div>
                    )}
                </div>

                {viewMode === 'LIBRARY' && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedCategory === null ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'}`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${selectedCategory === cat.id ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/30'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                        {isAdmin && (
                            <button
                                onClick={() => setShowAddCategory(true)}
                                className="px-3 py-2 rounded-full border border-dashed border-white/30 text-gray-400 hover:text-white hover:border-white transition-all"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Add Category Modal (Inline) */}
            {showAddCategory && (
                <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2 animate-in slide-in-from-top-2">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="New Category Name"
                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mystic-accent"
                    />
                    <button onClick={handleCreateCategory} className="px-4 py-2 bg-mystic-accent rounded-lg text-white text-xs font-bold">Create</button>
                    <button onClick={() => setShowAddCategory(false)} className="p-2 text-gray-400 hover:text-white"><XCircle size={18} /></button>
                </div>
            )}

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 text-gray-500">Loading...</div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pb-10">
                        {viewMode === 'LIBRARY' ? (
                            images.length === 0 ? (
                                <div className="col-span-full text-center py-20 text-gray-500">No images in this category.</div>
                            ) : (
                                images.map(img => (
                                    <div key={img.id} className="relative aspect-[3/4] rounded-xl overflow-hidden group bg-black/20 border border-white/5 hover:border-mystic-accent/50 transition-all">
                                        <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            {onSelectImage && (
                                                <button onClick={() => onSelectImage(img.image_url)} className="px-4 py-2 bg-white text-black rounded-full text-xs font-bold hover:scale-105 transition-transform">Use Pose</button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )
                        ) : (
                            // ALL USERS VIEW (ADMIN ONLY)
                            allUserHistory.map(item => (
                                <div key={item.id} className="relative aspect-[3/4] rounded-xl overflow-hidden group bg-black/20 border border-white/5">
                                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-[9px] text-white font-mono">{new Date(item.timestamp).toLocaleDateString()}</div>
                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-[10px] text-gray-300 line-clamp-2 w-2/3">{item.prompt}</p>
                                        <button
                                            onClick={() => handleAddToLibrary(item)}
                                            className="p-2 rounded-full bg-pink-500/20 text-pink-400 hover:bg-pink-500 hover:text-white transition-all"
                                            title="Add to Library"
                                        >
                                            <Heart size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Admin Add to Library Modal */}
            {showAdminModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-white mb-4">Add to Library</h3>
                        <p className="text-sm text-gray-400 mb-4">Select a category for this image:</p>
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => confirmAddToLibrary(cat.id)}
                                    className="p-3 rounded-lg bg-white/5 hover:bg-mystic-accent hover:text-white text-gray-300 text-xs font-bold transition-colors border border-white/5"
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setShowAdminModal(false)} className="w-full py-3 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};
