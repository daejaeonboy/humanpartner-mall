import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, ChevronDown, Clock, FileText, Loader2, User, X } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Container } from "../components/ui/Container";
import { useAuth } from "../src/context/AuthContext";
import { checkAvailability, createBooking } from "../src/api/bookingApi";
import { createNotification } from "../src/api/notificationApi";
import { sendQuoteRequestNotificationEmail } from "../src/api/quoteEmailApi";
import {
  QuoteCartItem,
  clearQuoteCartItems,
  getQuoteCartItems,
  removeQuoteCartItem,
  setQuoteCartItems,
} from "../src/utils/quoteCart";
import { usePriceDisplay } from "../src/context/PriceDisplayContext";
import {
  getPublicPriceClassName,
  getPublicPriceText,
  INQUIRY_PRICE_TEXT_CLASS,
} from "../src/utils/priceDisplay";

export const QuoteCartPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { mode: priceDisplayMode, loading: priceDisplayLoading } = usePriceDisplay();
  const [items, setItems] = useState<QuoteCartItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string>("");

  useEffect(() => {
    setItems(getQuoteCartItems());
  }, []);

  useEffect(() => {
    setExpandedItems((prev) =>
      items.reduce<Record<string, boolean>>((next, item) => {
        next[item.cart_item_id] = prev[item.cart_item_id] ?? false;
        return next;
      }, {}),
    );
  }, [items]);

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.total_price, 0),
    [items],
  );

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  const handleRemove = (cartItemId: string) => {
    const next = removeQuoteCartItem(cartItemId);
    setItems(next);
  };

  const handleClear = () => {
    clearQuoteCartItems();
    setItems([]);
  };

  const toggleExpanded = (cartItemId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [cartItemId]: !prev[cartItemId],
    }));
  };

  const handleSubmit = async () => {
    if (items.length === 0 || isSubmitting) return;
    if (!user) {
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    setResultMessage("");

    const successIds: string[] = [];
    const failedNames: string[] = [];

    for (const item of items) {
      try {
        const isAvailable = await checkAvailability(
          item.product_id,
          item.start_date,
          item.end_date,
        );

        if (!isAvailable) {
          failedNames.push(item.product_name);
          continue;
        }

        const booking = await createBooking({
          product_id: item.product_id,
          user_id: user.uid,
          user_email: user.email || undefined,
          start_date: item.start_date,
          end_date: item.end_date,
          total_price: item.total_price,
          status: "pending",
          selected_options: item.selected_options,
          basic_components: item.basic_components,
        });

        if (booking.id) {
          try {
            await sendQuoteRequestNotificationEmail(booking.id);
          } catch (emailError) {
            console.error("Failed to send quote request admin email", emailError);
          }
        }

        successIds.push(item.cart_item_id);
      } catch (error) {
        console.error("Failed to submit quote cart item", error);
        failedNames.push(item.product_name);
      }
    }

    if (successIds.length > 0) {
      await createNotification(
        user.uid,
        "견적 요청",
        `${successIds.length}건의 견적 요청이 접수되었습니다. 담당자가 확인 후 순차적으로 안내드립니다.`,
        "info",
        "/mypage",
      );
    }

    const remainingItems = items.filter((item) => !successIds.includes(item.cart_item_id));
    setItems(remainingItems);
    setQuoteCartItems(remainingItems);

    if (failedNames.length === 0) {
      setResultMessage(
        `${successIds.length}건의 견적 요청이 정상 접수되었습니다. 마이페이지에서 상태를 확인할 수 있습니다.`,
      );
    } else {
      setResultMessage(
        `${successIds.length}건 접수 완료, ${failedNames.length}건 실패했습니다. 실패 항목은 바구니에 남겨두었습니다.`,
      );
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-12 pb-10">
      <Helmet>
        <title>장바구니 | 렌탈어때</title>
        <meta
          name="description"
          content="여러 품목을 장바구니에 담아 한 번에 견적 요청하세요. 온라인에서는 결제 없이 견적 접수만 진행됩니다."
        />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://rentalpartner.kr/quote-cart" />
      </Helmet>
      <Container>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/4">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
              <div className="w-20 h-20 bg-[#B3C1D4] rounded-full mx-auto mb-4 flex items-center justify-center">
                <User size={32} className="text-[#001E45]" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{userProfile?.name || "고객"} 님</h2>
              <p className="text-sm text-gray-500 mb-6">{userProfile?.email || user?.email || "-"}</p>
              <div className="text-left space-y-1 border-t border-gray-100 pt-4">
                <Link to="/mypage" className="text-sm text-gray-500 block w-full text-left py-2 px-2 rounded hover:bg-gray-50 hover:text-black">
                  대여 신청 내역
                </Link>
                <Link to="/quote-cart" className="text-sm font-bold text-[#001E45] block w-full text-left py-2 px-2 rounded hover:bg-[#001E45]/5">
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
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Clock size={24} /> 장바구니
              </h1>
            </div>

            {items.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <FileText className="mx-auto text-slate-300 mb-3" size={34} />
                <p className="text-slate-500 mb-4">장바구니에 담긴 항목이 없습니다.</p>
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#001E45] text-white text-sm font-bold hover:bg-[#03295b] transition-colors"
                >
                  상품 보러가기
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => {
                  const isExpanded = expandedItems[item.cart_item_id] ?? false;

                  return (
                    <div
                      key={item.cart_item_id}
                      className="bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-shadow overflow-hidden"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={() => toggleExpanded(item.cart_item_id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleExpanded(item.cart_item_id);
                          }
                        }}
                        className="cursor-pointer p-6 md:p-8"
                      >
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200">
                            {item.product_image_url ? (
                              <img
                                src={item.product_image_url}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <svg
                                  className="w-10 h-10"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                  ></path>
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 pr-8 md:pr-0 flex flex-col justify-center">
                            <h2 className="text-xl md:text-2xl font-bold text-slate-900 truncate mb-2">
                              {item.product_name}
                            </h2>
                            <div className="flex items-center gap-2 text-base text-slate-500 mb-2">
                              <Calendar size={16} />
                              <span>
                                {formatDate(item.start_date)} ~ {formatDate(item.end_date)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500">
                              예상 수량 {item.expected_people.toLocaleString()}대 | 옵션 {item.selected_options.length}건
                            </p>
                            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#001E45]">
                              <span>{isExpanded ? "옵션 접기" : "옵션 보기"}</span>
                              <ChevronDown
                                size={18}
                                className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                              />
                            </div>
                          </div>

                          <div className="md:w-48 pt-4 md:pt-0 mt-2 md:mt-0 border-t md:border-t-0 border-slate-100 flex flex-col justify-between shrink-0 gap-4 md:gap-2">
                            <div className="flex justify-between md:flex-col md:items-end w-full">
                              <p className="text-sm text-slate-400 md:mb-1">예상 견적 금액</p>
                              <p
                                className={getPublicPriceClassName({
                                  mode: priceDisplayMode,
                                  loading: priceDisplayLoading,
                                  visibleClass: "text-2xl font-black text-[#001E45]",
                                  hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                                })}
                              >
                                {getPublicPriceText({
                                  amount: item.total_price,
                                  mode: priceDisplayMode,
                                  loading: priceDisplayLoading,
                                })}
                              </p>
                            </div>
                            <div className="flex justify-end w-full md:mt-auto">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemove(item.cart_item_id);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 text-sm px-4 py-2 rounded-lg text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all shrink-0 w-full md:w-auto mt-2 md:mt-0"
                              >
                                <X size={16} />
                                취소
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-100 px-6 pb-6 md:px-8 md:pb-8">
                        <div className="pt-6">
                          <div className="rounded-2xl border border-[#001E45]/10 bg-[#001E45]/[0.03] p-5">
                            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                              <h3 className="text-sm font-bold text-slate-800">추가 선택 옵션</h3>
                              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 border border-slate-200">
                                  {item.selected_options.length}건
                                </span>
                              </div>
                              {item.selected_options.length > 0 ? (
                                <div className="space-y-3">
                                  {item.selected_options.map((option, index) => (
                                    <div
                                      key={`${item.cart_item_id}-option-${index}`}
                                      className="rounded-xl bg-white px-4 py-3 border border-slate-200"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-semibold text-slate-800">
                                            {option.name}
                                          </p>
                                          <p className="mt-1 text-xs text-slate-400">
                                            {getPublicPriceText({
                                              amount: option.price,
                                              mode: priceDisplayMode,
                                              loading: priceDisplayLoading,
                                            })}{" "}
                                            x {option.quantity}개
                                          </p>
                                        </div>
                                        <p
                                          className={getPublicPriceClassName({
                                            mode: priceDisplayMode,
                                            loading: priceDisplayLoading,
                                            visibleClass: "shrink-0 text-sm font-black text-[#001E45]",
                                            hiddenClass: "shrink-0 text-sm font-semibold text-rose-600",
                                          })}
                                        >
                                          {getPublicPriceText({
                                            amount: option.price * option.quantity,
                                            mode: priceDisplayMode,
                                            loading: priceDisplayLoading,
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="rounded-xl bg-white px-4 py-4 text-sm text-slate-400 border border-slate-200">
                                  선택한 추가 옵션이 없습니다.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-slate-500">총 {items.length}건 예상 합계</p>
                    <p
                      className={getPublicPriceClassName({
                        mode: priceDisplayMode,
                        loading: priceDisplayLoading,
                        visibleClass: "text-xl font-black text-[#001E45]",
                        hiddenClass: INQUIRY_PRICE_TEXT_CLASS,
                      })}
                    >
                      {getPublicPriceText({
                        amount: totalPrice,
                        mode: priceDisplayMode,
                        loading: priceDisplayLoading,
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#001E45] text-white font-bold hover:bg-[#03295b] disabled:bg-slate-400 transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          접수 중...
                        </>
                      ) : (
                        "견적 한 번에 요청하기"
                      )}
                    </button>
                    <button
                      onClick={handleClear}
                      disabled={isSubmitting}
                      className="sm:w-[150px] px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
                    >
                      비우기
                    </button>
                  </div>
                  {resultMessage && (
                    <p className="text-sm text-slate-600 mt-4">{resultMessage}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};
