import { useEffect, useMemo, useRef, useState } from 'react';
import { Edit2, Eye, EyeOff, Image as ImageIcon, Loader2, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import {
    addMiceTabPost,
    addTabMenuItem,
    deleteMiceTabPost,
    deleteTabMenuItem,
    getAllMiceTabPosts,
    getAllTabMenuItems,
    MiceTabPost,
    MiceTabType,
    TabMenuItem,
    updateTabMenuItem,
    updateMiceTabPost
} from '../../src/api/cmsApi';
import { uploadImage } from '../../src/api/storageApi';

type FilterType = 'all' | MiceTabType;

const TAB_LABEL: Record<MiceTabType, string> = {
    notice: '공지사항',
    event: '이벤트',
    review: '설치후기'
};

const TAB_BADGE_STYLE: Record<MiceTabType, string> = {
    notice: 'bg-blue-50 text-blue-700 border-blue-200',
    event: 'bg-orange-50 text-orange-700 border-orange-200',
    review: 'bg-emerald-50 text-emerald-700 border-emerald-200'
};

interface FormData {
    board_type: MiceTabType;
    title: string;
    summary: string;
    content: string;
    image_url: string;
    mobile_image_url: string;
    link: string;
    display_order: number;
    is_active: boolean;
}

interface TabFormData {
    name: string;
    link: string;
    display_order: number;
    is_active: boolean;
}

const EMPTY_FORM: FormData = {
    board_type: 'notice',
    title: '',
    summary: '',
    content: '',
    image_url: '',
    mobile_image_url: '',
    link: '',
    display_order: 1,
    is_active: true
};

const EMPTY_TAB_FORM: TabFormData = {
    name: '',
    link: '/notice',
    display_order: 1,
    is_active: true
};

const TAB_PRESETS = [
    { name: '공지사항', link: '/notice' },
    { name: '이벤트', link: '/event' },
    { name: '설치후기', link: '/review' },
    { name: '고객센터', link: '/cs' },
];

export const GnbSectionManager = () => {
    const [gnbTabs, setGnbTabs] = useState<TabMenuItem[]>([]);
    const [posts, setPosts] = useState<MiceTabPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tabSaving, setTabSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [filterType, setFilterType] = useState<FilterType>('all');

    const [showTabModal, setShowTabModal] = useState(false);
    const [editingTab, setEditingTab] = useState<TabMenuItem | null>(null);
    const [tabFormData, setTabFormData] = useState<TabFormData>(EMPTY_TAB_FORM);

    const [showModal, setShowModal] = useState(false);
    const [editingPost, setEditingPost] = useState<MiceTabPost | null>(null);
    const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
    const desktopFileInputRef = useRef<HTMLInputElement>(null);
    const mobileFileInputRef = useRef<HTMLInputElement>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [postData, tabData] = await Promise.all([
                getAllMiceTabPosts(),
                getAllTabMenuItems()
            ]);
            setPosts(postData);
            setGnbTabs(tabData);
        } catch (error) {
            console.error('Failed to load GNB tab posts:', error);
            alert('GNB 탭 데이터를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredPosts = useMemo(() => {
        if (filterType === 'all') return posts;
        return posts.filter((post) => post.board_type === filterType);
    }, [posts, filterType]);

    const openAddTabModal = () => {
        setEditingTab(null);
        setTabFormData({
            ...EMPTY_TAB_FORM,
            display_order: gnbTabs.length + 1
        });
        setShowTabModal(true);
    };

    const openEditTabModal = (tab: TabMenuItem) => {
        setEditingTab(tab);
        setTabFormData({
            name: tab.name || '',
            link: tab.link || '/notice',
            display_order: tab.display_order || 1,
            is_active: tab.is_active
        });
        setShowTabModal(true);
    };

    const closeTabModal = () => {
        setShowTabModal(false);
        setEditingTab(null);
    };

    const handleTabSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTabSaving(true);
        try {
            if (editingTab?.id) {
                await updateTabMenuItem(editingTab.id, tabFormData);
            } else {
                await addTabMenuItem(tabFormData);
            }
            await loadData();
            closeTabModal();
        } catch (error) {
            console.error('Failed to save GNB tab:', error);
            alert('탭 저장에 실패했습니다.');
        } finally {
            setTabSaving(false);
        }
    };

    const handleDeleteTab = async (id?: string) => {
        if (!id) return;
        if (!confirm('이 탭을 삭제하시겠습니까?')) return;
        try {
            await deleteTabMenuItem(id);
            await loadData();
        } catch (error) {
            console.error('Failed to delete tab:', error);
            alert('탭 삭제에 실패했습니다.');
        }
    };

    const toggleTabActive = async (tab: TabMenuItem) => {
        if (!tab.id) return;
        try {
            await updateTabMenuItem(tab.id, { is_active: !tab.is_active });
            await loadData();
        } catch (error) {
            console.error('Failed to toggle tab active:', error);
            alert('탭 상태 변경에 실패했습니다.');
        }
    };

    const openAddModal = () => {
        const inferredType = filterType === 'all' ? 'notice' : filterType;
        const nextOrder = posts.filter((p) => p.board_type === inferredType).length + 1;
        setEditingPost(null);
        setFormData({
            ...EMPTY_FORM,
            board_type: inferredType,
            display_order: nextOrder
        });
        setShowModal(true);
    };

    const openEditModal = (post: MiceTabPost) => {
        setEditingPost(post);
        setFormData({
            board_type: post.board_type,
            title: post.title || '',
            summary: post.summary || '',
            content: post.content || '',
            image_url: post.image_url || '',
            mobile_image_url: post.mobile_image_url || '',
            link: post.link || '',
            display_order: post.display_order || 1,
            is_active: post.is_active
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingPost(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload: Omit<FormData, 'mobile_image_url'> & { mobile_image_url?: string } = {
            board_type: formData.board_type,
            title: formData.title,
            summary: formData.summary,
            content: formData.content,
            image_url: formData.image_url,
            link: formData.link,
            display_order: formData.display_order,
            is_active: formData.is_active
        };

        if (formData.mobile_image_url.trim()) {
            payload.mobile_image_url = formData.mobile_image_url.trim();
        }

        try {
            if (editingPost?.id) {
                await updateMiceTabPost(editingPost.id, payload);
            } else {
                await addMiceTabPost(payload);
            }
            await loadData();
            closeModal();
        } catch (error) {
            console.error('Failed to save GNB tab post:', error);
            alert('저장에 실패했습니다. 모바일 이미지 저장이 실패한다면 add_mice_tab_posts_mobile_image_col.sql 을 먼저 실행해주세요.');
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'desktop' | 'mobile') => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드할 수 있습니다.');
            return;
        }

        setUploading(true);
        try {
            const imageUrl = await uploadImage(file);
            if (target === 'desktop') {
                setFormData((prev) => ({ ...prev, image_url: imageUrl }));
            } else {
                setFormData((prev) => ({ ...prev, mobile_image_url: imageUrl }));
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
            if (target === 'desktop' && desktopFileInputRef.current) desktopFileInputRef.current.value = '';
            if (target === 'mobile' && mobileFileInputRef.current) mobileFileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id?: string) => {
        if (!id) return;
        if (!confirm('이 항목을 삭제하시겠습니까?')) return;

        try {
            await deleteMiceTabPost(id);
            await loadData();
        } catch (error) {
            console.error('Failed to delete GNB tab post:', error);
            alert('삭제에 실패했습니다.');
        }
    };

    const toggleActive = async (post: MiceTabPost) => {
        if (!post.id) return;
        try {
            await updateMiceTabPost(post.id, { is_active: !post.is_active });
            await loadData();
        } catch (error) {
            console.error('Failed to toggle active:', error);
            alert('상태 변경에 실패했습니다.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-[#001E45]" size={40} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-[#001E45] mb-1">
                        <div className="w-8 h-1 bg-[#001E45] rounded-full" />
                        <span className="text-xs font-bold tracking-wider uppercase">CMS Control Center</span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">GNB 섹션 관리</h1>
                    <p className="text-slate-500 mt-2 max-w-2xl">
                        홈페이지 상단 메뉴와 각 카테고리별 콘텐츠를 통합 관리합니다.
                        고객센터(CS)는 통합 문의 시스템과 연동되어 실시간으로 반영됩니다.
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="group flex items-center gap-2 bg-[#001E45] text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-[#001E45]/20 active:scale-95"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    <span className="font-semibold">새 게시글 등록</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: GNB Tab Menu Management (Sticky) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-6">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div>
                                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                    <div className="p-1.5 bg-white rounded-lg border border-slate-200">
                                        <Plus size={14} className="text-[#001E45]" />
                                    </div>
                                    GNB 탭 관리
                                </h2>
                            </div>
                            <button
                                onClick={openAddTabModal}
                                className="text-xs font-bold text-[#001E45] hover:underline"
                            >
                                추가하기
                            </button>
                        </div>

                        <div className="p-2">
                            {gnbTabs.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm italic">등록된 탭이 없습니다.</div>
                            ) : (
                                <div className="space-y-1">
                                    {gnbTabs.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((tab) => (
                                        <div
                                            key={tab.id}
                                            className={`group p-3 rounded-xl flex items-center justify-between transition-all ${tab.is_active ? 'hover:bg-slate-50' : 'bg-slate-50/50 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:text-[#001E45] group-hover:border-[#001E45]/20 transition-colors">
                                                    {tab.display_order}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`font-bold text-sm truncate ${tab.is_active ? 'text-slate-800' : 'text-slate-500'}`}>
                                                        {tab.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 truncate tracking-tight">{tab.link}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => toggleTabActive(tab)}
                                                    className={`p-1.5 rounded-md ${tab.is_active ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                                    title={tab.is_active ? '비활성화' : '활성화'}
                                                >
                                                    {tab.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                                                </button>
                                                <button
                                                    onClick={() => openEditTabModal(tab)}
                                                    className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTab(tab.id)}
                                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-md"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                                * 탭 순서는 숫자가 작을수록 앞에 노출됩니다.<br />
                                * 비활성화된 탭은 사용자에게 보이지 않습니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Post Management (Main Content) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Filter Navigation */}
                    <div className="bg-slate-100/50 p-1.5 rounded-2xl inline-flex flex-wrap gap-1 border border-slate-200/50">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${filterType === 'all'
                                    ? 'bg-white text-[#001E45] shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                                }`}
                        >
                            전체보기
                        </button>
                        {(Object.keys(TAB_LABEL) as MiceTabType[]).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${filterType === type
                                        ? 'bg-white text-[#001E45] shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                                    }`}
                            >
                                {TAB_LABEL[type]}
                            </button>
                        ))}
                    </div>

                    {/* Posts Grid/List */}
                    <div className="space-y-4">
                        {filteredPosts.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-20 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ImageIcon size={32} className="text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">등록된 게시글이 없습니다</h3>
                                <p className="text-slate-400 mt-1">상단의 '새 게시글 등록' 버튼을 눌러 첫 콘텐츠를 만들어보세요.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredPosts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((post) => (
                                    <div
                                        key={post.id}
                                        className={`group relative bg-white rounded-2xl border transition-all hover:shadow-md ${post.is_active ? 'border-slate-200' : 'border-slate-100 opacity-80'
                                            }`}
                                    >
                                        <div className="p-4 flex gap-5">
                                            {/* Thumbnail Area */}
                                            <div className="relative w-40 h-28 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0 group-hover:border-[#001E45]/20 transition-colors">
                                                {(post.image_url || post.mobile_image_url) ? (
                                                    <img
                                                        src={post.image_url || post.mobile_image_url}
                                                        alt={post.title}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                                        <ImageIcon size={24} />
                                                        <span className="text-[10px] font-bold mt-1">NO IMAGE</span>
                                                    </div>
                                                )}

                                                {/* Badge on Thumbnail */}
                                                <div className="absolute top-2 left-2">
                                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shadow-sm ${TAB_BADGE_STYLE[post.board_type]}`}>
                                                        {TAB_LABEL[post.board_type]}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Content Area */}
                                            <div className="flex-1 min-w-0 pr-12">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">ORDER No.{post.display_order}</span>
                                                    {post.mobile_image_url && (
                                                        <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-md font-bold">MOBILE ONLY</span>
                                                    )}
                                                    {!post.is_active && (
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md font-bold">HIDDEN</span>
                                                    )}
                                                </div>

                                                <h4 className="text-lg font-bold text-slate-900 truncate group-hover:text-[#001E45] transition-colors">
                                                    {post.title}
                                                </h4>
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                    {(post.summary || post.content || '').trim() || '입력된 상세 내용이 없습니다.'}
                                                </p>
                                                {post.link && (
                                                    <div className="mt-2 flex items-center gap-1.5 text-[#001E45] text-xs font-semibold overflow-hidden">
                                                        <div className="w-1.5 h-1.5 bg-[#001E45] rounded-full flex-shrink-0" />
                                                        <span className="truncate opacity-70 group-hover:opacity-100 transition-opacity">{post.link}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons (Floating on Right) */}
                                            <div className="absolute top-4 right-4 flex flex-col gap-1">
                                                <button
                                                    onClick={() => toggleActive(post)}
                                                    className={`p-2 rounded-xl transition-all shadow-sm border border-slate-100 ${post.is_active
                                                            ? 'bg-white text-green-600 hover:bg-green-50 hover:border-green-100'
                                                            : 'bg-slate-50 text-slate-400 hover:bg-white hover:text-green-600 hover:border-green-100'
                                                        }`}
                                                    title={post.is_active ? '비활성화' : '활성화'}
                                                >
                                                    {post.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(post)}
                                                    className="p-2 bg-white text-slate-400 hover:text-[#001E45] hover:bg-[#001E45]/5 hover:border-[#001E45]/10 rounded-xl transition-all shadow-sm border border-slate-100"
                                                    title="내용 수정"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    className="p-2 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 rounded-xl transition-all shadow-sm border border-slate-100"
                                                    title="삭제하기"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-8 bg-blue-50/50 rounded-2xl p-6 border border-blue-100/50">
                            <h5 className="text-sm font-bold text-blue-900 mb-2">콘텐츠 관리 가이드</h5>
                            <ul className="text-xs text-blue-700/80 space-y-2 leading-relaxed">
                                <li className="flex gap-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>순서 제어:</strong> 게시글 내 '표시 순서' 숫자를 조정하여 리스트 노출 순서를 변경할 수 있습니다.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>이미지 최적화:</strong> 고해상도 이미지는 로딩 속도에 영향을 줄 수 있으므로 1MB 이하의 WebP 형식을 권장합니다.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-blue-400">•</span>
                                    <span><strong>모바일 이미지:</strong> 모바일 전용 이미지를 등록하면 세로 비율이 높은 기기에서 더 선명한 최적의 화면을 제공합니다.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>


            {showTabModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800">{editingTab ? 'GNB 탭 수정' : 'GNB 탭 추가'}</h2>
                            <button onClick={closeTabModal} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleTabSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">기본 탭 빠른 선택</label>
                                <select
                                    value=""
                                    onChange={(e) => {
                                        const selected = TAB_PRESETS.find((preset) => preset.link === e.target.value);
                                        if (!selected) return;
                                        setTabFormData((prev) => ({
                                            ...prev,
                                            name: selected.name,
                                            link: selected.link
                                        }));
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                >
                                    <option value="">선택 시 이름/링크 자동 입력</option>
                                    {TAB_PRESETS.map((preset) => (
                                        <option key={preset.link} value={preset.link}>
                                            {preset.name} ({preset.link})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">탭 이름</label>
                                <input
                                    type="text"
                                    required
                                    value={tabFormData.name}
                                    onChange={(e) => setTabFormData({ ...tabFormData, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">링크</label>
                                <input
                                    type="text"
                                    required
                                    value={tabFormData.link}
                                    onChange={(e) => setTabFormData({ ...tabFormData, link: e.target.value })}
                                    placeholder="/notice, /event, /review, /cs"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">표시 순서</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={tabFormData.display_order}
                                    onChange={(e) => setTabFormData({ ...tabFormData, display_order: Number(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={tabFormData.is_active}
                                    onChange={(e) => setTabFormData({ ...tabFormData, is_active: e.target.checked })}
                                    className="w-4 h-4 accent-[#001E45]"
                                />
                                노출 활성화
                            </label>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeTabModal}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={tabSaving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#001E45] text-white rounded-lg hover:bg-slate-800 disabled:opacity-60"
                                >
                                    {tabSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800">{editingPost ? '항목 수정' : '항목 추가'}</h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">탭 종류</label>
                                    <select
                                        value={formData.board_type}
                                        onChange={(e) => setFormData({ ...formData, board_type: e.target.value as MiceTabType })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                    >
                                        {(Object.keys(TAB_LABEL) as MiceTabType[]).map((type) => (
                                            <option key={type} value={type}>{TAB_LABEL[type]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">표시 순서</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.display_order}
                                        onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) || 1 })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">요약</label>
                                <input
                                    type="text"
                                    value={formData.summary}
                                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                    placeholder="목록에 노출될 짧은 설명"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">본문</label>
                                <textarea
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45] min-h-[120px]"
                                    placeholder="상세 내용을 입력하세요."
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">PC 썸네일 이미지 (16:9 권장)</label>
                                        <input
                                            type="text"
                                            value={formData.image_url}
                                            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45] text-sm"
                                            placeholder="PC 이미지 URL 입력 또는 업로드"
                                        />
                                        <input
                                            type="file"
                                            ref={desktopFileInputRef}
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'desktop')}
                                            className="hidden"
                                        />
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => desktopFileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-60"
                                            >
                                                {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                                PC 이미지 업로드
                                            </button>
                                            {formData.image_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, image_url: '' })}
                                                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                                                >
                                                    삭제
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1">메인 배너/목록 카드의 기본 이미지로 사용됩니다.</p>
                                        {formData.image_url && (
                                            <div className="mt-2 aspect-[16/9] w-full max-w-[220px] bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                                                <img src={formData.image_url} alt="PC 썸네일 미리보기" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">모바일 썸네일 이미지 (16:18 권장)</label>
                                        <input
                                            type="text"
                                            value={formData.mobile_image_url}
                                            onChange={(e) => setFormData({ ...formData, mobile_image_url: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45] text-sm"
                                            placeholder="모바일 이미지 URL 입력 또는 업로드"
                                        />
                                        <input
                                            type="file"
                                            ref={mobileFileInputRef}
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, 'mobile')}
                                            className="hidden"
                                        />
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => mobileFileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-60"
                                            >
                                                {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                                모바일 이미지 업로드
                                            </button>
                                            {formData.mobile_image_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, mobile_image_url: '' })}
                                                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 text-sm"
                                                >
                                                    삭제
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1">모바일에서 우선 노출되며, 비어 있으면 PC 이미지로 자동 대체됩니다.</p>
                                        {formData.mobile_image_url && (
                                            <div className="mt-2 aspect-[16/18] w-full max-w-[180px] bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                                                <img src={formData.mobile_image_url} alt="모바일 썸네일 미리보기" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">링크 (선택)</label>
                                    <input
                                        type="text"
                                        value={formData.link}
                                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#001E45]"
                                        placeholder="/notice 또는 https://..."
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 accent-[#001E45]"
                                />
                                노출 활성화
                            </label>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#001E45] text-white rounded-lg hover:bg-slate-800 disabled:opacity-60"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    저장
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GnbSectionManager;
