import React, { useState, useEffect, useRef } from 'react';
import { Container } from '../components/ui/Container';
import { Calendar, User, Clock, Loader2, CheckCircle, XCircle, AlertCircle, Package, Download, Ban, FileText } from 'lucide-react';
import { getUserBookings, Booking, updateBookingStatus } from '../src/api/bookingApi';
import { getProducts } from '../src/api/productApi';
import { useAuth } from '../src/context/AuthContext';
import { usePriceDisplay } from '../src/context/PriceDisplayContext';
import { getPublicPriceClassName, getPublicPriceText, INQUIRY_PRICE_TEXT_CLASS } from '../src/utils/priceDisplay';
import { Link } from 'react-router-dom';

export const MyPage: React.FC = () => {
    const { user, userProfile } = useAuth();
    const { mode: priceDisplayMode, loading: priceDisplayLoading, isInquiryMode } = usePriceDisplay();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageMap, setImageMap] = useState<Record<string, string>>({});
    const [cancellingId, setCancellingId] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const quoteRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        const fetchBookingsAndProducts = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const [bookingData, productsData] = await Promise.all([
                    getUserBookings(user.uid),
                    getProducts({ catalogType: 'all' })
                ]);

                const imgMap: Record<string, string> = {};
                productsData.forEach(p => {
                    if (p.image_url) {
                        imgMap[p.name] = p.image_url;
                    }
                });

                setImageMap(imgMap);
                setBookings(bookingData);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBookingsAndProducts();
    }, [user]);

    const getStatusBadge = (status: Booking['status']) => {
        const config = {
            pending: {
                className: 'bg-orange-50 border border-orange-200 text-orange-700',
                icon: Calendar,
                label: '견적 요청 접수'
            },
            quote_sent: {
                className: 'bg-cyan-50 border border-cyan-200 text-cyan-700',
                icon: Clock,
                label: '견적서 발송'
            },
            negotiating: {
                className: 'bg-amber-50 border border-amber-200 text-amber-700',
                icon: AlertCircle,
                label: '조정 중'
            },
            confirmed: {
                className: 'bg-blue-50 border border-blue-200 text-blue-700',
                icon: CheckCircle,
                label: '계약 확정'
            },
            completed: {
                className: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
                icon: Package,
                label: '진행 완료'
            },
            cancelled: {
                className: 'bg-gray-50 border border-gray-200 text-gray-600',
                icon: XCircle,
                label: '요청 취소'
            },
        };
        const { className, icon: Icon, label } = config[status];
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${className}`}>
                <Icon size={14} strokeWidth={2.5} />
                {label}
            </span>
        );
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const getItemImage = (name: string) => {
        if (name.includes('노트북') || name.includes('PC') || name.includes('모니터')) return '/comp-notebook.png';
        if (name.includes('테이블') || name.includes('책상') || name.includes('데스크')) return '/comp-table.png';
        if (name.includes('의자') || name.includes('소파')) return '/comp-chair.png';
        if (name.includes('복합기') || name.includes('프린터')) return '/comp-printer.png';
        if (name.includes('냉장고')) return '/comp-fridge.png';
        if (name.includes('커피') || name.includes('머신')) return '/comp-coffee.png';
        if (name.includes('간식') || name.includes('다과')) return '/comp-coffee.png';
        if (name.includes('배너') || name.includes('현수막')) return '/comp-printer.png';
        return null;
    };

    const getRentalDays = (startDate: string, endDate: string) => {
        const diffTime = Math.abs(new Date(endDate).getTime() - new Date(startDate).getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const canCancelBooking = (status: Booking['status']) => (
        status === 'pending' || status === 'quote_sent' || status === 'negotiating'
    );

    const handleCancelBooking = async (bookingId?: string) => {
        if (!bookingId || cancellingId) return;
        if (!confirm('이 견적 요청을 취소하시겠습니까?')) return;

        setCancellingId(bookingId);
        try {
            const updated = await updateBookingStatus(bookingId, 'cancelled');
            setBookings((prev) => prev.map((booking) => (
                booking.id === bookingId ? { ...booking, status: updated.status } : booking
            )));
        } catch (error) {
            console.error('Failed to cancel booking:', error);
            alert('견적 요청 취소에 실패했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            setCancellingId(null);
        }
    };

    const handleDownloadQuote = async (booking: Booking) => {
        if (!booking.id) return;
        const quoteNode = quoteRefs.current[booking.id];
        if (!quoteNode) return;

        setDownloadingId(booking.id);
        try {
            const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf'),
            ]);

            const canvas = await html2canvas(quoteNode, {
                scale: 2,
                backgroundColor: '#ffffff',
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new JsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            const documentFileLabel = isInquiryMode ? '견적요청서' : '견적서';

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${documentFileLabel}_${booking.products?.name || '상품'}_${booking.id.slice(0, 8)}.pdf`);
        } catch (error) {
            console.error('Failed to download quote PDF:', error);
            alert(`${isInquiryMode ? '견적 요청서' : '견적서'} 다운로드에 실패했습니다. 잠시 후 다시 시도해주세요.`);
        } finally {
            setDownloadingId(null);
        }
    };

    const visibleBookings = bookings.filter((booking) => booking.status !== 'cancelled');
    const formatCustomerPrice = (
        amount: number,
        options?: { suffix?: string; zeroAsHidden?: boolean },
    ) => getPublicPriceText({
        amount,
        mode: priceDisplayMode,
        loading: priceDisplayLoading,
        suffix: options?.suffix ?? '원',
        zeroAsHidden: options?.zeroAsHidden ?? false,
    });
    const documentTitle = isInquiryMode ? '견 적 요 청 서' : '견 적 서';
    const documentButtonText = isInquiryMode ? '견적 요청서 다운로드' : '견적서 다운로드';

    if (!user) {
        return (
            <div className="py-20 text-center">
                <p className="text-gray-500 mb-4">로그인이 필요합니다.</p>
                <Link to="/login" className="text-[#001E45] underline">로그인하기</Link>
            </div>
        );
    }

    return (
        <div className="py-12 bg-gray-50 min-h-screen">
            <Container>
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="md:w-1/4">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                            <div className="w-20 h-20 bg-[#B3C1D4] rounded-full mx-auto mb-4 flex items-center justify-center">
                                <User size={32} className="text-[#001E45]" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">{userProfile?.name || '고객'} 님</h2>
                            <p className="text-sm text-gray-500 mb-6">{userProfile?.email || user.email}</p>
                            <div className="text-left space-y-1 border-t border-gray-100 pt-4">
                                <Link to="/mypage" className="text-sm font-bold text-[#001E45] block w-full text-left py-2 px-2 rounded hover:bg-[#001E45]/5">
                                    대여 신청 내역
                                </Link>
                                <Link to="/quote-cart" className="text-sm text-gray-500 block w-full text-left py-2 px-2 rounded hover:bg-gray-50 hover:text-black">
                                    장바구니
                                </Link>
                                <Link to="/mypage/info" className="text-sm text-gray-500 block w-full text-left py-2 px-2 rounded hover:bg-gray-50 hover:text-black">
                                    내 정보 관리
                                </Link>
                                <Link to="/mypage/inquiry" className="text-sm text-gray-500 block w-full text-left py-2 px-2 rounded hover:bg-gray-50 hover:text-black">
                                    1:1 문의 내역
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="md:w-3/4">
                        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Clock size={24} /> 내 대여 신청 내역
                        </h1>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="animate-spin text-[#001E45]" size={40} />
                            </div>
                        ) : visibleBookings.length === 0 ? (
                            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
                                <p className="text-gray-500 mb-4">접수된 견적 요청이 없습니다.</p>
                                <Link to="/products" className="text-[#001E45] underline">상품 둘러보기</Link>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {visibleBookings.map((booking) => {
                                    const basicCount = booking.basic_components?.length || 0;
                                    const optionCount = booking.selected_options?.length || 0;
                                    const hasDetailedItems = basicCount + optionCount > 0;
                                    const optionAmount = (booking.selected_options || []).reduce(
                                        (sum, option) => sum + option.price * option.quantity,
                                        0
                                    );
                                    const baseAmount = Math.max(booking.total_price - optionAmount, 0);
                                    const rentalDays = getRentalDays(booking.start_date, booking.end_date);

                                    return (
                                        <div key={booking.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6 transition-all hover:shadow-md">
                                            <div
                                                className="lg:hidden cursor-pointer active:bg-gray-50 transition-colors"
                                                onClick={() => {
                                                    const el = document.getElementById(`details-${booking.id}`);
                                                    if (el) el.classList.toggle('hidden');
                                                }}
                                            >
                                                <div className="relative aspect-square bg-gray-50 border-b border-gray-100">
                                                    <img
                                                        src={booking.products?.image_url || 'https://picsum.photos/seed/booking/800/600'}
                                                        alt={booking.products?.name || '상품'}
                                                        className="w-full h-full object-contain"
                                                    />
                                                    <div className="absolute top-4 left-4">
                                                        {getStatusBadge(booking.status)}
                                                    </div>
                                                </div>
                                                <div className="p-5">
                                                    <h3 className="font-extrabold text-lg text-gray-900 mb-2 leading-tight">
                                                        {booking.products?.name || '상품'}
                                                    </h3>
                                                    <div className="text-sm text-gray-500 flex items-center gap-2 mb-4">
                                                        <span className="font-medium">{formatDate(booking.start_date)} ~ {formatDate(booking.end_date)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-6">
                                                        <span>
                                                            예상 금액{' '}
                                                            <span className={getPublicPriceClassName({
                                                                mode: priceDisplayMode,
                                                                loading: priceDisplayLoading,
                                                                visibleClass: 'text-gray-500',
                                                                hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                                                            })}>
                                                                {formatCustomerPrice(booking.total_price)}
                                                            </span>
                                                        </span>
                                                        <span>옵션 {optionCount}건</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const el = document.getElementById(`details-${booking.id}`);
                                                            if (el) el.classList.toggle('hidden');
                                                        }}
                                                        className="w-full h-[48px] bg-[#001E45] text-white rounded-xl text-base font-bold hover:bg-[#002D66] transition-all shadow-md active:scale-[0.98] flex items-center justify-center"
                                                    >
                                                        상세 내역보기
                                                    </button>
                                                    {canCancelBooking(booking.status) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void handleCancelBooking(booking.id);
                                                            }}
                                                            disabled={cancellingId === booking.id}
                                                            className="w-full mt-3 h-[48px] inline-flex items-center justify-center gap-2 px-4 rounded-xl border-2 border-red-600 bg-white text-red-600 text-base font-bold hover:bg-red-50 transition-all disabled:text-slate-300 disabled:border-slate-200"
                                                        >
                                                            {cancellingId === booking.id ? <Loader2 size={18} className="animate-spin" /> : null}
                                                            견적 요청 취소
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div
                                                className="hidden lg:flex p-6 md:p-8 flex-col md:flex-row justify-between items-center gap-6 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={() => {
                                                    const el = document.getElementById(`details-${booking.id}`);
                                                    if (el) el.classList.toggle('hidden');
                                                }}
                                            >
                                                <div className="flex gap-8 items-center flex-grow">
                                                    <div className="w-32 h-32 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm border border-gray-100">
                                                        <img
                                                            src={booking.products?.image_url || 'https://picsum.photos/seed/booking/200/200'}
                                                            alt={booking.products?.name || '상품'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>

                                                    <div className="min-w-0 flex flex-col gap-3">
                                                        <div className="flex items-center gap-3">
                                                            {getStatusBadge(booking.status)}
                                                            <span className="text-xs text-gray-400 font-medium tracking-tight">접수번호 {booking.id?.slice(0, 8)}</span>
                                                        </div>
                                                        <h3 className="font-extrabold text-2xl text-gray-900 leading-tight tracking-tight">
                                                            {booking.products?.name || '상품'}
                                                        </h3>
                                                        <div className="text-sm text-gray-500 flex items-center gap-2 font-medium">
                                                            <Calendar size={14} className="text-gray-300" />
                                                            <span>{formatDate(booking.start_date)} ~ {formatDate(booking.end_date)}</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
                                                            <span>
                                                                예상 금액{' '}
                                                                <span className={getPublicPriceClassName({
                                                                    mode: priceDisplayMode,
                                                                    loading: priceDisplayLoading,
                                                                    visibleClass: 'text-gray-500',
                                                                    hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                                                                })}>
                                                                    {formatCustomerPrice(booking.total_price)}
                                                                </span>
                                                            </span>
                                                            <span>기본 구성 {basicCount}건</span>
                                                            <span>추가 옵션 {optionCount}건</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-4 flex-shrink-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const el = document.getElementById(`details-${booking.id}`);
                                                            if (el) el.classList.toggle('hidden');
                                                        }}
                                                        className="w-[160px] h-[48px] bg-[#001E45] text-white rounded-lg text-base font-bold hover:bg-[#002D66] transition-all shadow-sm flex items-center justify-center gap-2"
                                                    >
                                                        상세 내역보기
                                                    </button>
                                                    {canCancelBooking(booking.status) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                void handleCancelBooking(booking.id);
                                                            }}
                                                            disabled={cancellingId === booking.id}
                                                            className="w-[160px] h-[48px] rounded-lg border-2 border-red-600 bg-white text-red-600 text-base font-bold hover:bg-red-50 transition-all disabled:text-slate-300 disabled:border-slate-200 inline-flex items-center justify-center gap-2"
                                                        >
                                                            {cancellingId === booking.id ? <Loader2 size={18} className="animate-spin" /> : null}
                                                            견적 요청 취소
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div id={`details-${booking.id}`} className="hidden bg-[#FAFAFA] border-t border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
                                                <div className="relative p-6 md:p-8 space-y-8 bg-white">
                                                    <div className="bg-white p-2">
                                                        <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
                                                            <h4 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                                <FileText size={20} className="text-[#001E45]" />
                                                                견적 요청 요약
                                                            </h4>
                                                            {getStatusBadge(booking.status)}
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                                                            <div className="flex justify-between items-center py-1">
                                                                <span className="text-sm text-slate-500 font-medium">상품명</span>
                                                                <span className="text-sm font-bold text-slate-900">{booking.products?.name || '상품'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1">
                                                                <span className="text-sm text-slate-500 font-medium">접수번호</span>
                                                                <span className="text-sm font-bold text-slate-900">{booking.id?.slice(0, 8) || '-'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1">
                                                                <span className="text-sm text-slate-500 font-medium">접수일</span>
                                                                <span className="text-sm font-bold text-slate-900">{formatDate(booking.created_at)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1">
                                                                <span className="text-sm text-slate-500 font-medium">대여 기간</span>
                                                                <span className="text-sm font-bold text-slate-900">{formatDate(booking.start_date)} ~ {formatDate(booking.end_date)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1">
                                                                <span className="text-sm text-slate-500 font-medium">예상 금액</span>
                                                                <span className={getPublicPriceClassName({
                                                                    mode: priceDisplayMode,
                                                                    loading: priceDisplayLoading,
                                                                    visibleClass: 'text-base font-bold text-[#001E45]',
                                                                    hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                                                                })}>{formatCustomerPrice(booking.total_price)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-1">
                                                                <span className="text-sm text-slate-500 font-medium">구성 현황</span>
                                                                <span className="text-sm font-bold text-slate-900">기본 {basicCount}건 / 옵션 {optionCount}건</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap gap-3 mt-8">
                                                            <button
                                                                onClick={() => handleDownloadQuote(booking)}
                                                                disabled={!booking.id || downloadingId === booking.id}
                                                                className="inline-flex items-center justify-center gap-2 px-6 h-[48px] rounded-xl bg-[#001E45] text-white text-base font-bold hover:bg-[#002D66] transition-all disabled:bg-slate-300 shadow-md"
                                                            >
                                                                {downloadingId === booking.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                                                                {documentButtonText}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {!hasDetailedItems && (
                                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
                                                            <p className="text-sm font-medium text-slate-600">
                                                                선택된 추가 구성 없이 기본 견적 요청으로 접수되었습니다.
                                                            </p>
                                                            <p className="text-xs text-slate-400 mt-2">
                                                                담당자가 견적 조건을 확인한 뒤 순차적으로 안내드립니다.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {basicCount > 0 && (
                                                        <div>
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h4 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                                                    <span className="w-1.5 h-6 bg-slate-800 inline-block rounded-sm"></span>
                                                                    기본 패키지 구성
                                                                </h4>
                                                                <span className="text-sm text-gray-500 font-medium">총 {basicCount}개 품목</span>
                                                            </div>

                                                            <div className="border-t-2 border-slate-900 pt-6">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                                                                    {booking.basic_components?.map((comp, i) => {
                                                                        const imageUrl = imageMap[comp.name] || getItemImage(comp.name);
                                                                        return (
                                                                            <div key={i} className="flex items-center gap-4 group">
                                                                                <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden relative">
                                                                                    {imageUrl ? (
                                                                                        <img src={imageUrl} alt={comp.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('fallback-icon'); }} />
                                                                                    ) : (
                                                                                        <Package size={20} className="text-slate-400" />
                                                                                    )}
                                                                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 -z-10">
                                                                                        <Package size={20} className="text-slate-400" />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex justify-between items-start">
                                                                                        <div>
                                                                                            <p className="font-bold text-gray-800 text-lg leading-tight">{comp.name}</p>
                                                                                            {comp.model_name && <p className="text-xs text-gray-400 mt-1">{comp.model_name}</p>}
                                                                                        </div>
                                                                                        <span className="text-lg font-bold text-[#001E45] whitespace-nowrap ml-2">{comp.quantity}개</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {optionCount > 0 && (
                                                        <div>
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h4 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                                                    <span className="w-1.5 h-6 bg-[#001E45] inline-block rounded-sm"></span>
                                                                    내가 추가한 유료 옵션
                                                                </h4>
                                                                <span className="text-sm text-[#001E45] font-bold">{optionCount}개 선택</span>
                                                            </div>

                                                            <div className="border-t-2 border-[#001E45] pt-6">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                                                                    {booking.selected_options?.map((opt, i) => {
                                                                        const imageUrl = imageMap[opt.name] || getItemImage(opt.name);
                                                                        return (
                                                                            <div key={i} className="flex items-center gap-4 group">
                                                                                <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden relative">
                                                                                    {imageUrl ? (
                                                                                        <img src={imageUrl} alt={opt.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.classList.add('fallback-icon'); }} />
                                                                                    ) : (
                                                                                        <Package size={20} className="text-slate-400" />
                                                                                    )}
                                                                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 -z-10">
                                                                                        <Package size={20} className="text-slate-400" />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="flex justify-between items-start">
                                                                                        <div>
                                                                                            <p className="font-bold text-gray-800 text-lg leading-tight">{opt.name}</p>
                                                                                        </div>
                                                                                        <span className="text-lg font-bold text-[#001E45] whitespace-nowrap ml-2">{opt.quantity}개</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {booking.id && (
                                                        <div className="absolute -left-[99999px] top-0 pointer-events-none">
                                                            <div
                                                                ref={(node) => {
                                                                    quoteRefs.current[booking.id!] = node;
                                                                }}
                                                                className="w-[820px] bg-white shadow-sm ring-1 ring-gray-200"
                                                            >
                                                                <div className="p-8 bg-white" style={{ fontFamily: 'Malgun Gothic, sans-serif' }}>
                                                                    <div className="text-center mb-8">
                                                                        <h1 className="text-3xl font-bold tracking-widest text-gray-900 border-b-4 border-double border-gray-900 pb-4 inline-block px-8">
                                                                            {documentTitle}
                                                                        </h1>
                                                                    </div>
                                                                    <table className="w-full border-collapse mb-6" style={{ fontSize: '12px' }}>
                                                                        <tbody>
                                                                            <tr>
                                                                                <td className="border border-gray-400 bg-gray-100 px-3 py-2 font-bold w-24 text-center">문서번호</td>
                                                                                <td className="border border-gray-400 px-3 py-2 w-48">Q-{booking.id.slice(0, 8)}</td>
                                                                                <td className="border border-gray-400 bg-gray-100 px-3 py-2 font-bold w-24 text-center">발행일자</td>
                                                                                <td className="border border-gray-400 px-3 py-2">{formatDate(booking.created_at)}</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td className="border border-gray-400 bg-gray-100 px-3 py-2 font-bold text-center">유효기간</td>
                                                                                <td className="border border-gray-400 px-3 py-2">발행일로부터 30일</td>
                                                                                <td className="border border-gray-400 bg-gray-100 px-3 py-2 font-bold text-center">담당자</td>
                                                                                <td className="border border-gray-400 px-3 py-2">영업팀</td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                                                        <div>
                                                                            <p className="font-bold text-sm mb-2 border-b border-gray-900 pb-1">【 수 신 】</p>
                                                                            <table className="w-full border-collapse" style={{ fontSize: '11px' }}>
                                                                                <tbody>
                                                                                    <tr>
                                                                                        <td className="border border-gray-400 bg-gray-100 px-2 py-1 font-bold w-16 text-center">상호명</td>
                                                                                        <td className="border border-gray-400 px-2 py-1">{userProfile?.company_name || '(미기재)'}</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td className="border border-gray-400 bg-gray-100 px-2 py-1 font-bold text-center">담당자</td>
                                                                                        <td className="border border-gray-400 px-2 py-1">{userProfile?.manager_name || userProfile?.name || '(미기재)'}</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td className="border border-gray-400 bg-gray-100 px-2 py-1 font-bold text-center">연락처</td>
                                                                                        <td className="border border-gray-400 px-2 py-1">{userProfile?.phone || '(미기재)'}</td>
                                                                                    </tr>
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-sm mb-2 border-b border-gray-900 pb-1">【 발 신 】</p>
                                                                            <table className="w-full border-collapse" style={{ fontSize: '11px' }}>
                                                                                <tbody>
                                                                                    <tr>
                                                                                        <td className="border border-gray-400 bg-gray-100 px-2 py-1 font-bold w-16 text-center">상호명</td>
                                                                                        <td className="border border-gray-400 px-2 py-1 relative">
                                                                                            렌탈어때
                                                                                            <span className="absolute right-2 top-0 text-[#001E45] text-[10px] font-bold">[인]</span>
                                                                                        </td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td className="border border-gray-400 bg-gray-100 px-2 py-1 font-bold text-center">대표자</td>
                                                                                        <td className="border border-gray-400 px-2 py-1">이기섭</td>
                                                                                    </tr>
                                                                                    <tr>
                                                                                        <td className="border border-gray-400 bg-gray-100 px-2 py-1 font-bold text-center">연락처</td>
                                                                                        <td className="border border-gray-400 px-2 py-1">010-4074-6967</td>
                                                                                    </tr>
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                    <table className="w-full border-collapse mb-6" style={{ fontSize: '12px' }}>
                                                                        <tbody>
                                                                            <tr>
                                                                                <td className="border border-gray-400 bg-gray-100 px-3 py-2 font-bold w-24 text-center">대여기간</td>
                                                                                <td className="border border-gray-400 px-3 py-2">{formatDate(booking.start_date)} ~ {formatDate(booking.end_date)} ({rentalDays}일간)</td>
                                                                                <td className="border border-gray-400 bg-gray-100 px-3 py-2 font-bold w-24 text-center">진행 상태</td>
                                                                                <td className="border border-gray-400 px-3 py-2 w-32">{booking.status}</td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                    <p className="font-bold text-sm mb-2">■ 견적 내역</p>
                                                                    <table className="w-full border-collapse mb-4" style={{ fontSize: '11px' }}>
                                                                        <thead>
                                                                            <tr className="bg-gray-800 text-white">
                                                                                <th className="border border-gray-600 px-3 py-2 text-center font-bold w-12">No</th>
                                                                                <th className="border border-gray-600 px-3 py-2 text-left font-bold">품목</th>
                                                                                <th className="border border-gray-600 px-3 py-2 text-center font-bold w-16">수량</th>
                                                                                <th className="border border-gray-600 px-3 py-2 text-right font-bold w-24">단가</th>
                                                                                <th className="border border-gray-600 px-3 py-2 text-right font-bold w-28">금액</th>
                                                                                <th className="border border-gray-600 px-3 py-2 text-center font-bold w-20">비고</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            <tr>
                                                                                <td className="border border-gray-400 px-3 py-2 text-center">1</td>
                                                                                <td className="border border-gray-400 px-3 py-2 font-medium">{booking.products?.name || '상품'}</td>
                                                                                <td className="border border-gray-400 px-3 py-2 text-center">{rentalDays}일</td>
                                                                                <td className={`border border-gray-400 px-3 py-2 text-right ${getPublicPriceClassName({
                                                                                    mode: priceDisplayMode,
                                                                                    loading: priceDisplayLoading,
                                                                                    visibleClass: '',
                                                                                    hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                                                                                })}`}>{formatCustomerPrice(baseAmount, { suffix: '' })}</td>
                                                                                <td className={`border border-gray-400 px-3 py-2 text-right font-medium ${getPublicPriceClassName({
                                                                                    mode: priceDisplayMode,
                                                                                    loading: priceDisplayLoading,
                                                                                    visibleClass: '',
                                                                                    hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                                                                                })}`}>{formatCustomerPrice(baseAmount, { suffix: '' })}</td>
                                                                                <td className="border border-gray-400 px-3 py-2 text-center text-gray-500">기본</td>
                                                                            </tr>
                                                                            {(booking.basic_components || []).map((item, idx) => (
                                                                                <tr key={`basic-${booking.id}-${idx}`} className="bg-blue-50">
                                                                                    <td className="border border-gray-400 px-3 py-1.5 text-center text-gray-400">-</td>
                                                                                    <td className="border border-gray-400 px-3 py-1.5 pl-6 text-gray-700">
                                                                                        {item.name}
                                                                                        {item.model_name && <span className="text-gray-400 ml-1">({item.model_name})</span>}
                                                                                    </td>
                                                                                    <td className="border border-gray-400 px-3 py-1.5 text-center">{item.quantity}</td>
                                                                                    <td className="border border-gray-400 px-3 py-1.5 text-right text-gray-400">-</td>
                                                                                    <td className="border border-gray-400 px-3 py-1.5 text-right text-gray-400">-</td>
                                                                                    <td className="border border-gray-400 px-3 py-1.5 text-center text-blue-600">기본포함</td>
                                                                                </tr>
                                                                            ))}
                                                                            {(booking.selected_options || []).map((option, idx) => (
                                                                                <tr key={`option-${booking.id}-${idx}`}>
                                                                                    <td className="border border-gray-400 px-3 py-2 text-center">{basicCount + idx + 2}</td>
                                                                                    <td className="border border-gray-400 px-3 py-2">{option.name}</td>
                                                                                    <td className="border border-gray-400 px-3 py-2 text-center">{option.quantity}</td>
                                                                                    <td className={`border border-gray-400 px-3 py-2 text-right ${getPublicPriceClassName({
                                                                                        mode: priceDisplayMode,
                                                                                        loading: priceDisplayLoading,
                                                                                        visibleClass: '',
                                                                                        hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                                                                                    })}`}>{formatCustomerPrice(option.price, { suffix: '' })}</td>
                                                                                    <td className={`border border-gray-400 px-3 py-2 text-right ${getPublicPriceClassName({
                                                                                        mode: priceDisplayMode,
                                                                                        loading: priceDisplayLoading,
                                                                                        visibleClass: '',
                                                                                        hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                                                                                    })}`}>{formatCustomerPrice(option.price * option.quantity, { suffix: '' })}</td>
                                                                                    <td className="border border-gray-400 px-3 py-2 text-center text-gray-500">추가</td>
                                                                                </tr>
                                                                            ))}
                                                                            {!hasDetailedItems && (
                                                                                <tr>
                                                                                    <td colSpan={6} className="border border-gray-400 px-3 py-4 text-center text-gray-400">선택된 추가 옵션 없음</td>
                                                                                </tr>
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                    <table className="w-full border-collapse mb-8" style={{ fontSize: '12px' }}>
                                                                        <tbody>
                                                                            <tr>
                                                                                <td className="border-2 border-gray-800 bg-gray-100 px-4 py-3 font-bold text-center w-24 whitespace-nowrap">공급가액</td>
                                                                                <td className={`border-2 border-gray-800 px-4 py-3 text-right font-medium whitespace-nowrap ${getPublicPriceClassName({
                                                                                    mode: priceDisplayMode,
                                                                                    loading: priceDisplayLoading,
                                                                                    visibleClass: '',
                                                                                    hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                                                                                })}`}>{formatCustomerPrice(Math.round(booking.total_price / 1.1))}</td>
                                                                                <td className="border-2 border-gray-800 bg-gray-100 px-4 py-3 font-bold text-center w-20 whitespace-nowrap">부가세</td>
                                                                                <td className={`border-2 border-gray-800 px-4 py-3 text-right font-medium whitespace-nowrap ${getPublicPriceClassName({
                                                                                    mode: priceDisplayMode,
                                                                                    loading: priceDisplayLoading,
                                                                                    visibleClass: '',
                                                                                    hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                                                                                })}`}>{formatCustomerPrice(Math.round(booking.total_price - booking.total_price / 1.1))}</td>
                                                                                <td className="border-2 border-gray-800 bg-gray-800 text-white px-4 py-3 font-bold text-center w-24 whitespace-nowrap">합계금액</td>
                                                                                <td className={`border-2 border-gray-800 px-4 py-3 text-right whitespace-nowrap ${getPublicPriceClassName({
                                                                                    mode: priceDisplayMode,
                                                                                    loading: priceDisplayLoading,
                                                                                    visibleClass: 'font-bold text-lg text-[#001E45]',
                                                                                    hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                                                                                })}`}>{formatCustomerPrice(booking.total_price)}</td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                    <div className="mb-6">
                                                                        <p className="font-bold text-sm mb-2">■ 유의사항</p>
                                                                        <div className="border border-gray-400 p-3" style={{ fontSize: '11px', lineHeight: '1.7' }}>
                                                                            <ul className="list-disc pl-4 space-y-1.5 text-gray-700">
                                                                                <li>본 {isInquiryMode ? '견적 요청서' : '견적서'}의 유효기간은 발행일로부터 30일입니다.</li>
                                                                                <li>{isInquiryMode ? '상세 금액은 별도 견적 상담 후 확정됩니다.' : '상기 금액은 부가가치세(VAT 10%)가 포함된 금액입니다.'}</li>
                                                                                <li>대여 일정 및 장소에 따라 운송비가 별도로 청구될 수 있습니다.</li>
                                                                                <li>현장 설치 및 철거가 필요한 경우 별도 협의가 필요합니다.</li>
                                                                                <li>대여 물품의 파손 또는 분실 시 수리비 또는 원가를 청구할 수 있습니다.</li>
                                                                            </ul>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-center pt-4 border-t border-gray-300" style={{ fontSize: '11px' }}>
                                                                        <p className="text-gray-500">본 {isInquiryMode ? '견적 요청서' : '견적서'}는 정식 계약서가 아니며, 최종 계약 시 세부 사항이 변경될 수 있습니다.</p>
                                                                        <p className="text-gray-600 mt-2 font-medium">렌탈어때 | 사업자등록번호: 314-07-32520 | 대전 유성구 지족로 282번길 17</p>
                                                                        <p className="text-gray-500 mt-1">Tel. 010-4074-6967 | Email. micepartner@micepartner.co.kr</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </Container>
        </div>
    );
};

