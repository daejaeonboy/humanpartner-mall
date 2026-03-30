import React, { useState, useEffect } from 'react';
import { Loader2, Calendar, CheckCircle, XCircle, Trash2, Phone, Building2, FileText } from 'lucide-react';
import {
    getBookings,
    updateBookingStatus,
    deleteBooking,
    Booking,
    BOOKING_STATUS_OPTIONS,
} from '../../src/api/bookingApi';
import { createNotification } from '../../src/api/notificationApi';

const STATUS_NOTIFICATION_MAP: Record<Booking['status'], {
    title: string;
    message: (name: string) => string;
    type: 'info' | 'success' | 'warning' | 'error';
}> = {
    pending: {
        title: '견적 요청',
        message: (name) => `${name} 견적 요청이 정상 접수되었습니다. 담당자가 순차적으로 확인합니다.`,
        type: 'info',
    },
    quote_sent: {
        title: '견적 확인',
        message: (name) => `${name} 견적 내용이 확인되었습니다. 상세 조건은 마이페이지에서 확인해주세요.`,
        type: 'info',
    },
    confirmed: {
        title: '계약 완료',
        message: (name) => `${name} 계약이 완료되었습니다. 진행 일정을 순차적으로 안내드리겠습니다.`,
        type: 'success',
    },
    cancelled: {
        title: '요청 취소',
        message: (name) => `${name} 요청이 취소 처리되었습니다.`,
        type: 'error',
    },
};

export const BookingList = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [statusDrafts, setStatusDrafts] = useState<Record<string, Booking['status']>>({});

    useEffect(() => {
        loadBookings();
    }, []);

    const loadBookings = async () => {
        try {
            setLoading(true);
            const data = await getBookings();
            setBookings(data);
            setStatusDrafts(
                data.reduce<Record<string, Booking['status']>>((acc, booking) => {
                    if (booking.id) {
                        acc[booking.id] = booking.status;
                    }
                    return acc;
                }, {}),
            );
        } catch (error) {
            console.error('Failed to load bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, status: Booking['status']) => {
        const statusLabel = BOOKING_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
        if (!confirm(`이 요청 상태를 '${statusLabel}'로 변경하시겠습니까?`)) return;

        setUpdatingId(id);
        try {
            await updateBookingStatus(id, status);
            setBookings(bookings.map(b => b.id === id ? { ...b, status } : b));
            setStatusDrafts((prev) => ({ ...prev, [id]: status }));

            // Send Notification
            const targetBooking = bookings.find(b => b.id === id);
            if (targetBooking?.user_id) {
                const statusNotification = STATUS_NOTIFICATION_MAP[status];
                 await createNotification(
                    targetBooking.user_id,
                    statusNotification.title,
                    statusNotification.message(targetBooking.products?.name || '상품'),
                    statusNotification.type,
                    '/mypage'
                );
            }

            alert(`요청 상태가 '${statusLabel}'로 변경되었습니다.`);
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('상태 변경에 실패했습니다.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('이 견적 요청을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        setDeletingId(id);
        try {
            await deleteBooking(id);
            setBookings(bookings.filter(b => b.id !== id));
            setStatusDrafts((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
            alert('견적 요청이 삭제되었습니다.');
        } catch (error) {
            console.error('Failed to delete booking:', error);
            alert('삭제에 실패했습니다.');
        } finally {
            setDeletingId(null);
        }
    };

    const getStatusBadge = (status: Booking['status']) => {
        const config = {
            pending: { 
                className: 'bg-orange-100 border border-orange-300 text-orange-800', 
                icon: Calendar, 
                label: '견적 요청' 
            },
            quote_sent: {
                className: 'bg-cyan-100 border border-cyan-300 text-cyan-800',
                icon: FileText,
                label: '견적 확인'
            },
            confirmed: { 
                className: 'bg-emerald-100 border border-emerald-300 text-emerald-800', 
                icon: CheckCircle, 
                label: '계약 완료' 
            },
            cancelled: { 
                className: 'bg-gray-100 border border-gray-300 text-gray-700', 
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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-[#001E45]" size={40} />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">견적 요청 관리</h2>
                    <p className="text-slate-500 text-sm mt-1">총 {bookings.length}건</p>
                </div>
                <button
                    onClick={loadBookings}
                    className="text-sm text-[#001E45] hover:text-teal-700"
                >
                    새로고침
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">상품</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">고객명</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">사업자명</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">연락처</th>
                                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">기간</th>
                                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">금액</th>
                                <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">상태</th>
                                <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {bookings.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-400">
                                        견적 요청 내역이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking) => (
                                    <React.Fragment key={booking.id}>
                                        <tr
                                            className={`hover:bg-slate-50 cursor-pointer transition-colors ${expandedId === booking.id ? 'bg-slate-50' : ''}`}
                                            onClick={() => setExpandedId(expandedId === booking.id ? null : (booking.id || null))}
                                        >
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    {booking.products?.image_url && (
                                                        <img
                                                            src={booking.products.image_url}
                                                            alt={booking.products.name}
                                                            className="w-10 h-10 object-cover rounded-lg shadow-sm"
                                                        />
                                                    )}
                                                    <span className="font-bold text-slate-800">
                                                        {booking.products?.name || booking.product_id}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-slate-900 font-bold">
                                                    {booking.user_profiles?.name || '-'}
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    {booking.user_email || booking.user_id}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                                                    <Building2 size={14} className="text-slate-400" />
                                                    <span>{booking.user_profiles?.company_name || '-'}</span>
                                                </div>
                                                {booking.user_profiles?.business_number && (
                                                    <div className="text-[11px] text-slate-400 mt-0.5 ml-5">
                                                        {booking.user_profiles.business_number}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                                                    <Phone size={14} className="text-slate-400" />
                                                    <span>{booking.user_profiles?.phone || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-slate-600 text-sm font-medium">
                                                <div className="flex flex-col">
                                                    <span>{formatDate(booking.start_date)}</span>
                                                    <span className="text-slate-300 text-[10px] py-0.5">↓</span>
                                                    <span>{formatDate(booking.end_date)}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right font-black text-slate-900">
                                                {booking.total_price.toLocaleString()}원
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {getStatusBadge(booking.status)}
                                            </td>
                                            <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-2">
                                                    {updatingId === booking.id || deletingId === booking.id ? (
                                                        <Loader2 className="animate-spin text-slate-400" size={20} />
                                                    ) : (
                                                        <>
                                                            <select
                                                                value={statusDrafts[booking.id!] || booking.status}
                                                                onChange={(e) =>
                                                                    setStatusDrafts((prev) => ({
                                                                        ...prev,
                                                                        [booking.id!]: e.target.value as Booking['status'],
                                                                    }))
                                                                }
                                                                className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white min-w-[122px]"
                                                            >
                                                                {BOOKING_STATUS_OPTIONS.map((option) => (
                                                                    <option key={option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <button
                                                                onClick={() => handleStatusChange(booking.id!, statusDrafts[booking.id!] || booking.status)}
                                                                disabled={(statusDrafts[booking.id!] || booking.status) === booking.status}
                                                                className="px-2.5 py-1.5 text-xs rounded-lg bg-[#001E45] text-white disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-[#03295b] transition-colors"
                                                            >
                                                                저장
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(booking.id!)}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="삭제"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedId === booking.id && (
                                            <tr className="bg-slate-50/50">
                                                <td colSpan={8} className="px-8 py-6">
                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <div className="bg-white p-5 rounded-xl border border-[#001E45]/10 shadow-sm">
                                                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                                                                <div className="w-1.5 h-4 bg-[#001E45] rounded-full"></div>
                                                                <h4 className="font-bold text-slate-800 text-sm">추가 선택 옵션</h4>
                                                            </div>
                                                            {booking.selected_options && booking.selected_options.length > 0 ? (
                                                                <div className="space-y-3">
                                                                    {booking.selected_options.map((opt, i) => (
                                                                        <div key={i} className="flex justify-between items-center bg-[#FFF9F9] p-3 rounded-lg border border-[#FFEAEA]">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-base font-bold text-slate-800">{opt.name}</span>
                                                                                <span className="text-xs text-slate-400">{opt.price.toLocaleString()}원 × {opt.quantity}개</span>
                                                                            </div>
                                                                            <span className="font-black text-[#001E45] text-base">{(opt.price * opt.quantity).toLocaleString()}원</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-slate-400 italic py-2">선택한 추가 옵션이 없습니다.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
