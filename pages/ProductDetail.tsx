import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Container } from "../components/ui/Container";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Loader2,
  AlertCircle,
  Minus,
  Plus,
  ChevronRight,
  Package,
  Users,
  MapPin,
  UtensilsCrossed,
  ShoppingBag,
  ShoppingCart,
  Check,
  RotateCcw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { getProductById, getProductsByType, Product } from "../src/api/productApi";
import { createBooking, checkAvailability } from "../src/api/bookingApi";
import { getAllNavMenuItems, NavMenuItem } from "../src/api/cmsApi";
import { createNotification } from "../src/api/notificationApi";
import { useAuth } from "../src/context/AuthContext";
import { addQuoteCartItem, getQuoteCartCount } from "../src/utils/quoteCart";
import { registerLocale } from "react-datepicker";
import { ko } from "date-fns/locale/ko";

registerLocale("ko", ko);

import "../src/styles/calendar.css";
import { Helmet } from "react-helmet-async";

// Helper to get image for basic components
const getComponentComponentImage = (name: string) => {
  if (name.includes("노트북")) return "/comp-notebook.png"; // User needs to upload this
  if (name.includes("테이블")) return "/comp-table.png";
  if (name.includes("의자")) return "/comp-chair.png";
  if (name.includes("복합기") || name.includes("프린터")) return "/comp-printer.png";
  if (name.includes("냉장고")) return "/comp-fridge.png";
  if (name.includes("커피")) return "/comp-coffee.png";
  return null;
};

interface SelectedOptionSummary {
  name: string;
  qty: number;
  subtotal: number;
}

interface SummaryRow {
  label: string;
  value: React.ReactNode;
}

const SummaryRows = ({ rows }: { rows: SummaryRow[] }) => (
  <div className="space-y-3 text-sm">
    {rows.map((row) => (
      <div key={row.label} className="flex justify-between gap-4">
        <span className="text-gray-500">{row.label}</span>
        <span className="font-medium text-gray-900 text-right">{row.value}</span>
      </div>
    ))}
  </div>
);

const SelectedOptionsSection = ({
  items,
  scrollable = false,
}: {
  items: SelectedOptionSummary[];
  scrollable?: boolean;
}) => (
  <div className="mt-4 pt-4 border-t border-gray-100">
    <p className="text-xs font-semibold text-gray-500 mb-2">선택한 옵션</p>
    <div className={`${scrollable ? "max-h-40 overflow-y-auto " : ""}space-y-2 text-sm`}>
      {items.map((opt, idx) => (
        <div key={`${opt.name}-${idx}`} className="flex justify-between text-gray-700">
          <span className="truncate flex-1">
            {opt.name} x{opt.qty}
          </span>
          <span className="font-medium ml-2">{opt.subtotal.toLocaleString()}원</span>
        </div>
      ))}
    </div>
  </div>
);

// Sub-component for individual option items to handle local state and focus
const OptionItem = ({
  item,
  initialQty,
  imageUrl,
  onUpdate,
  selectionMode = 'quantity',
}: {
  item: Product;
  initialQty: number;
  imageUrl?: string;
  onUpdate: (qty: number) => void;
  selectionMode?: 'quantity' | 'checkbox';
}) => {
  const [localQty, setLocalQty] = useState(initialQty);

  // Sync local state if external state changes (e.g. when selectedAdditional/Places/Foods changes)
  useEffect(() => {
    setLocalQty(initialQty);
  }, [initialQty]);

  const handleCreate = () => {
    // If user hasn't set a quantity (0), and clicks Add, default to 1.
    // If user has set a quantity (>0), use that.
    const qtyToAdd = localQty > 0 ? localQty : 1;
    onUpdate(qtyToAdd);
    // Update local state to reflect what we just added
    setLocalQty(qtyToAdd);
  };

  const handleUpdate = () => {
    onUpdate(localQty);
  };

  const isInCart = initialQty > 0;
  const isChanged = localQty !== initialQty;

  return (
    <div className="flex items-center gap-3 sm:gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0 relative">
      {/* Image */}
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-100">
        {imageUrl ? (
          <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <Package size={20} className="text-gray-300" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 pr-24 sm:pr-0">
        <h5 className="font-bold text-gray-900 text-sm sm:text-[15px] leading-snug line-clamp-1">
          {item.name}
        </h5>
        <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 line-clamp-2 sm:line-clamp-1">
          {item.short_description || item.description || item.model_name || "상세 설명 없음"}
        </p>
        <p className="text-sm font-bold text-[#001E45] mt-0.5">
          {item.price ? `${item.price.toLocaleString()}원` : "가격문의"}
        </p>
      </div>

      {/* Desktop (PC) UI: Original Framed Style */}
      <div className="hidden sm:flex items-center gap-2">
        {selectionMode === 'checkbox' ? (
          <button
            onClick={() => onUpdate(isInCart ? 0 : 1)}
            className={`flex items-center gap-2 px-4 h-9 rounded-lg text-sm font-bold transition-all border
              ${isInCart ? "bg-[#001E45] text-white border-[#001E45] shadow-md" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
          >
            <Check size={16} /> {isInCart ? "추가완료" : "추가"}
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm h-9">
              <button
                className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded transition-colors"
                onClick={() => onUpdate(Math.max(0, initialQty - 1))}
              >
                <Minus size={14} />
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={localQty}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) {
                    setLocalQty(val === "" ? 0 : parseInt(val));
                  }
                }}
                onBlur={handleUpdate}
                className="w-10 text-center font-bold text-gray-900 text-sm border-none focus:outline-none focus:ring-0 p-0"
              />
              <button
                className="w-7 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded transition-colors"
                onClick={() => onUpdate(initialQty + 1)}
              >
                <Plus size={14} />
              </button>
            </div>

            {isInCart ? (
              <button
                onClick={handleUpdate}
                disabled={!isChanged}
                className={`px-4 h-9 rounded-lg text-sm font-bold transition-all
                  ${isChanged ? "bg-[#001E45] text-white shadow-md" : "bg-gray-900 text-white"}`}
              >
                {isChanged ? "수정" : <Check size={18} />}
              </button>
            ) : (
              <button
                onClick={handleCreate}
                className="px-4 h-9 rounded-lg text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
              >
                담기
              </button>
            )}
          </>
        )}
      </div>

      {/* Mobile UI: Minimal Frameless Style */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:hidden">
        {selectionMode === 'checkbox' ? (
          <button
            onClick={() => onUpdate(isInCart ? 0 : 1)}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all border
              ${isInCart ? "bg-[#001E45] text-white border-[#001E45]" : "bg-gray-50 text-gray-400 border-gray-200"}`}
          >
            <Check size={16} />
          </button>
        ) : (
          <>
            <button
              onClick={() => onUpdate(Math.max(0, initialQty - 1))}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors
                ${initialQty > 0 ? "text-gray-900 bg-gray-50" : "text-gray-300 pointer-events-none"}`}
            >
              <Minus size={14} />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={localQty}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) {
                  setLocalQty(val === "" ? 0 : parseInt(val));
                }
              }}
              onBlur={handleUpdate}
              className={`w-8 text-center font-bold text-sm border-none focus:outline-none focus:ring-0 p-0 bg-transparent
                ${initialQty > 0 ? "text-gray-900" : "text-gray-400"}`}
            />
            <button
              onClick={() => onUpdate(initialQty + 1)}
              className="w-7 h-7 flex items-center justify-center text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Plus size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const getCategorizedGroups = (items: Product[], menuItems: NavMenuItem[], tabType?: string): { name: string, display_order: number }[] => {
  const groups = new Map<string, number>();

  items.forEach(item => {
    const cat = item.category || '기타';
    let groupName = cat;
    let order = 999;

    if (tabType === 'additional') {
      const childMenu = menuItems.find(m => m.name === cat && m.category);
      if (childMenu && childMenu.category) {
        groupName = childMenu.category;
        const parentMenu = menuItems.find(m => m.name === groupName && !m.category);
        if (parentMenu) order = parentMenu.display_order;
      } else {
        const menu = menuItems.find(m => m.name === cat && !m.category);
        if (menu) order = menu.display_order;
      }
    } else {
      const menu = menuItems.find(m => m.name === cat);
      order = menu ? menu.display_order : 999;
    }

    if (!groups.has(groupName)) {
      groups.set(groupName, order);
    } else {
      groups.set(groupName, Math.min(groups.get(groupName)!, order));
    }
  });

  return Array.from(groups.entries())
    .map(([name, display_order]) => ({ name, display_order }))
    .sort((a, b) => {
      if (a.display_order !== b.display_order) return a.display_order - b.display_order;
      // When display_order is the same (e.g. both 999), sort alphabetically by name (가나다 오름차순)
      return a.name.localeCompare(b.name, 'ko-KR');
    });
};

const OptionListTypeA = ({
  items,
  selectedQty,
  setQty,
  componentProducts,
  menuItems,
  tabType,
  selectionMode = 'quantity',
}: {
  items: Product[];
  selectedQty: { [key: string]: number };
  setQty: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>;
  componentProducts: Product[];
  menuItems: NavMenuItem[];
  tabType?: string;
  selectionMode?: 'quantity' | 'checkbox';
}) => {
  // Use useMemo here to prevent recalculation
  const optionGroups = React.useMemo(() => getCategorizedGroups(items, menuItems, tabType), [items, menuItems, tabType]);
  const [localActiveCategory, setLocalActiveCategory] = useState<string>('');

  // Update local state if optionGroups changes
  useEffect(() => {
    if (optionGroups.length > 0) {
      setLocalActiveCategory(prev => {
        // IF previous category is still valid, keep it. Else set to first.
        if (prev && optionGroups.find(p => p.name === prev)) return prev;
        return optionGroups[0].name;
      });
    }
  }, [optionGroups]);

  if (optionGroups.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        <p>해당 카테고리에 등록된 상품이 없습니다.</p>
      </div>
    );
  }

  // Calculating display items based on active category
  let displayItems: Product[] = [];

  if (localActiveCategory) {
    if (tabType === 'additional') {
      const childMenus = menuItems.filter((m) => m.category === localActiveCategory);
      const childMenuNames = new Set(childMenus.map(m => m.name));
      displayItems = items.filter(p => {
        const cat = p.category || '기타';
        return cat === localActiveCategory || childMenuNames.has(cat);
      });

      // Sort display items by the display_order of their category (child menu)
      displayItems.sort((a, b) => {
        const catA = a.category || '기타';
        const catB = b.category || '기타';
        const menuA = childMenus.find(m => m.name === catA);
        const menuB = childMenus.find(m => m.name === catB);
        const orderA = menuA ? menuA.display_order : 999;
        const orderB = menuB ? menuB.display_order : 999;

        if (orderA !== orderB) return orderA - orderB;

        // Final fallback: creation date (newest first)
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    } else {
      displayItems = items.filter(p => (p.category || '기타') === localActiveCategory);
      displayItems.sort((a, b) => {
        // Sort by creation date (newest first)
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    }
  }

  return (
    <div>
      {/* Horizontal Scrollable Chips */}
      <div className="flex overflow-x-auto pb-4 gap-2 px-6 pt-6 border-b border-gray-50 no-scrollbar">
        {optionGroups.map((group) => (
          <button
            key={group.name}
            onClick={() => setLocalActiveCategory(group.name)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border
                     ${localActiveCategory === group.name
                ? "bg-[#001E45] text-white border-[#001E45]"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
          >
            {group.name}
          </button>
        ))}
      </div>

      {/* List Content */}
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
        {displayItems.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {displayItems.map((item) => {
              const qty = selectedQty[item.id!] || 0;
              // Use existing image logic
              const imageUrl = item.image_url || getComponentComponentImage(item.name) || componentProducts.find(p => p.name === item.name)?.image_url;

              return (
                <OptionItem
                  key={item.id}
                  item={item}
                  initialQty={qty}
                  imageUrl={imageUrl}
                  onUpdate={(newQty) => setQty(prev => ({ ...prev, [item.id!]: newQty }))}
                  selectionMode={selectionMode}
                />
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-400">
            <p>선택된 카테고리에 상품이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [isBooking, setIsBooking] = useState(false);
  const [activeTab, setActiveTab] = useState("detail");
  const [expectedPeople, setExpectedPeople] = useState<number | string>(1);



  // Option Tab State (for the new tab UI)
  const [activeOptionTab, setActiveOptionTab] = useState<
    "cooperative" | "additional" | "place" | "food"
  >("cooperative");

  // Booking Result Modal State
  const [bookingModal, setBookingModal] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
    onClose?: () => void;
  }>({ show: false, message: '', type: 'info' });
  const [actionConfirmModal, setActionConfirmModal] = useState<{
    show: boolean;
    action: 'booking' | 'cart' | null;
  }>({ show: false, action: null });
  const [mobileBarExpanded, setMobileBarExpanded] = useState(false);
  const [quoteCartCount, setQuoteCartCount] = useState(0);

  // Basic Components Expand State
  const [basicComponentsExpanded, setBasicComponentsExpanded] = useState(true);

  // Global Options State
  const [globalCooperative, setGlobalCooperative] = useState<Product[]>([]);
  const [globalAdditional, setGlobalAdditional] = useState<Product[]>([]);
  const [globalPlaces, setGlobalPlaces] = useState<Product[]>([]);
  const [globalFoods, setGlobalFoods] = useState<Product[]>([]);

  // Component Products Lookup (for images)
  const [componentProducts, setComponentProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Fetch products that might be used as components (essential/additional) to get their images
    const fetchComponentProducts = async () => {
      try {
        const products = await getProductsByType('essential');
        setComponentProducts(products);
      } catch (err) {
        console.error("Failed to fetch component products", err);
      }
    };
    fetchComponentProducts();
  }, []);

  useEffect(() => {
    setQuoteCartCount(getQuoteCartCount());
  }, []);

  // Menu Items for hierarchical selection
  const [menuItems, setMenuItems] = useState<NavMenuItem[]>([]);

  // Selected Quantities (Key: Product ID)
  const [selectedCooperative, setSelectedCooperative] = useState<{
    [key: string]: number;
  }>({});
  const [selectedAdditional, setSelectedAdditional] = useState<{
    [key: string]: number;
  }>({});
  const [selectedPlaces, setSelectedPlaces] = useState<{
    [key: string]: number;
  }>({});
  const [selectedFoods, setSelectedFoods] = useState<{ [key: string]: number }>(
    {},
  );






  const onChange = (dates: [Date | null, Date | null]) => {
    let [start, end] = dates;

    // 최소 2일 대여 강제 (시작일과 종료일이 같을 경우 종료일을 다음날로 설정)
    if (start && end && start.getTime() === end.getTime()) {
      const nextDay = new Date(start);
      nextDay.setDate(nextDay.getDate() + 1);
      end = nextDay;
    }

    setStartDate(start);
    setEndDate(end);
  };

  useEffect(() => {
    const fetchProductAndOptions = async () => {
      if (!id) return;
      try {
        const [
          productData,
          cooperativeData,
          additionalData,
          placeData,
          foodData,
          menuItemsData,
        ] = await Promise.all([
          getProductById(id),
          getProductsByType("cooperative"),
          getProductsByType("additional"),
          getProductsByType("place"),
          getProductsByType("food"),
          getAllNavMenuItems(),
        ]);
        setProduct(productData);
        setGlobalCooperative(cooperativeData);
        setGlobalAdditional(additionalData);
        setGlobalPlaces(placeData);
        setGlobalFoods(foodData);
        setMenuItems(menuItemsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductAndOptions();
  }, [id]);

  // 화면 진입 시 스크롤 최상단 이동 (From Colleague's Code)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const days = React.useMemo(() => {
    if (!startDate || !endDate) {
      return 1;
    }

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(2, diffDays);
  }, [startDate, endDate]);

  const selectedSummary = React.useMemo<SelectedOptionSummary[]>(() => {
    const summary: SelectedOptionSummary[] = [];

    Object.entries(selectedCooperative).forEach(([key, qty]) => {
      const quantity = qty as number;
      const item = globalCooperative.find((p) => p.id === key);
      if (item && quantity > 0) {
        summary.push({ name: item.name, qty: quantity, subtotal: item.price * quantity });
      }
    });

    Object.entries(selectedAdditional).forEach(([key, qty]) => {
      const quantity = qty as number;
      const item = globalAdditional.find((p) => p.id === key);
      if (item && quantity > 0) {
        summary.push({ name: item.name, qty: quantity, subtotal: item.price * quantity });
      }
    });

    Object.entries(selectedPlaces).forEach(([key, qty]) => {
      const quantity = qty as number;
      const item = globalPlaces.find((p) => p.id === key);
      if (item && quantity > 0) {
        summary.push({ name: item.name, qty: quantity, subtotal: item.price * quantity });
      }
    });

    Object.entries(selectedFoods).forEach(([key, qty]) => {
      const quantity = qty as number;
      const item = globalFoods.find((p) => p.id === key);
      if (item && quantity > 0) {
        summary.push({ name: item.name, qty: quantity, subtotal: item.price * quantity });
      }
    });

    return summary;
  }, [
    selectedCooperative,
    globalCooperative,
    selectedAdditional,
    globalAdditional,
    selectedPlaces,
    globalPlaces,
    selectedFoods,
    globalFoods,
  ]);

  const totalPrice = React.useMemo(() => {
    const basePrice = product?.price || 0;
    return selectedSummary.reduce((total, item) => total + item.subtotal, basePrice);
  }, [product, selectedSummary]);

  const summaryRows: SummaryRow[] = [
    { label: "희망 사용 기간", value: `${days}일` },
    { label: "예상 수량", value: `${expectedPeople || 0}대` },
    { label: product?.name || "상품", value: `${(product?.price || 0).toLocaleString()}원` },
  ];

  const buildSelectedOptions = () => {
    const selectedOptions: {
      name: string;
      quantity: number;
      price: number;
    }[] = [];

    Object.keys(selectedCooperative).forEach((key) => {
      const qty = selectedCooperative[key];
      const item = globalCooperative.find((p) => p.id === key);
      if (item && qty > 0) {
        selectedOptions.push({
          name: item.name,
          quantity: qty,
          price: item.price || 0,
        });
      }
    });

    Object.keys(selectedAdditional).forEach((key) => {
      const qty = selectedAdditional[key];
      const item = globalAdditional.find((p) => p.id === key);
      if (item && qty > 0) {
        selectedOptions.push({
          name: item.name,
          quantity: qty,
          price: item.price || 0,
        });
      }
    });

    Object.keys(selectedPlaces).forEach((key) => {
      const qty = selectedPlaces[key];
      const item = globalPlaces.find((p) => p.id === key);
      if (item && qty > 0) {
        selectedOptions.push({
          name: item.name,
          quantity: qty,
          price: item.price || 0,
        });
      }
    });

    Object.keys(selectedFoods).forEach((key) => {
      const qty = selectedFoods[key];
      const item = globalFoods.find((p) => p.id === key);
      if (item && qty > 0) {
        selectedOptions.push({
          name: item.name,
          quantity: qty,
          price: item.price || 0,
        });
      }
    });

    return selectedOptions;
  };

  const buildBasicComponents = () =>
    product?.basic_components?.map((comp) => ({
      name: comp.name,
      quantity: comp.quantity,
      model_name: comp.model_name,
    })) || [];

  const openActionConfirm = (action: 'booking' | 'cart') => {
    if (!product || !startDate || !endDate || !id || product.stock === 0) return;
    setActionConfirmModal({ show: true, action });
  };

  const closeActionConfirm = () => {
    setActionConfirmModal({ show: false, action: null });
  };

  const handleAddToQuoteCart = () => {
    if (!product || !startDate || !endDate || !id) return;

    addQuoteCartItem({
      product_id: id,
      product_name: product.name,
      product_image_url: product.image_url,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      expected_people:
        typeof expectedPeople === "string"
          ? parseInt(expectedPeople || "0", 10) || 0
          : expectedPeople,
      total_price: totalPrice,
      selected_options: buildSelectedOptions(),
      basic_components: buildBasicComponents(),
    });

    setQuoteCartCount(getQuoteCartCount());
    setBookingModal({
      show: true,
      message:
        "장바구니에 담았습니다.\n여러 품목을 모아서 한 번에 견적 요청할 수 있습니다.",
      type: "success",
    });
  };

  const handleBooking = async () => {
    if (!product || !startDate || !endDate || !id) return;
    if (!user) {
      setBookingModal({
        show: true,
        message: '로그인이 필요합니다.',
        type: 'info',
        onClose: () => navigate('/login'),
      });
      return;
    }
    setIsBooking(true);
    try {
      const isAvailable = await checkAvailability(
        id,
        startDate.toISOString().split("T")[0],
        endDate.toISOString().split("T")[0],
      );
      if (!isAvailable) {
        setBookingModal({
          show: true,
          message: "선택한 일정에 이미 확정된 대여 건이 있습니다.\n다른 날짜를 선택해주세요.",
          type: 'error',
        });
        setIsBooking(false);
        return;
      }

      const selectedOptions = buildSelectedOptions();
      const basicComponents = buildBasicComponents();

      await createBooking({
        product_id: id,
        user_id: user.uid,
        user_email: user.email || undefined,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        total_price: totalPrice,
        status: "pending",
        selected_options: selectedOptions,
        basic_components: basicComponents,
      });

      // Send Notification
      await createNotification(
        user.uid,
        "견적 요청 접수",
        `${product.name} 견적 요청이 접수되었습니다. 담당자가 확인 후 견적서를 발송해드립니다.`,
        "info",
        "/mypage" // Link to mypage
      );

      setBookingModal({
        show: true,
        message: "견적 요청이 접수되었습니다.\n마이페이지에서 진행 상태를 확인하세요.",
        type: 'success',
        onClose: () => navigate('/mypage'),
      });
    } catch (error) {
      console.error("Booking failed", error);
      setBookingModal({
        show: true,
        message: "견적 요청 처리에 실패했습니다.\n잠시 후 다시 시도해주세요.",
        type: 'error',
      });
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#001E45]" size={40} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-20 text-center text-gray-500">
        상품을 찾을 수 없습니다.
      </div>
    );
  }

  const optionTabs = [
    {
      id: "cooperative" as const,
      label: "부가 서비스",
      icon: Users,
      show:
        product?.cooperative_components &&
        product.cooperative_components.length > 0 &&
        globalCooperative.length > 0,
      count: Object.values(selectedCooperative).filter(qty => (qty as number) > 0).length,
    },
    {
      id: "additional" as const,
      label: "추가 구성",
      icon: Package,
      show: true, // Always show
      count: Object.values(selectedAdditional).filter(qty => (qty as number) > 0).length,
    },
    {
      id: "place" as const,
      label: "장소 상품",
      icon: MapPin,
      show: false, // Hidden
      count: Object.values(selectedPlaces).filter(qty => (qty as number) > 0).length,
    },
    {
      id: "food" as const,
      label: "음식 상품",
      icon: UtensilsCrossed,
      show: false, // Hidden
      count: Object.values(selectedFoods).filter(qty => (qty as number) > 0).length,
    },
  ].filter((tab) => tab.show);
  const hasAnyOptions = optionTabs.length > 0;

  return (
    <>
      <Helmet>
        <title>{product.name} - 렌탈파트너 렌탈</title>
        <meta
          name="description"
          content={
            product.description ||
            `${product.name} 렌탈 서비스. 렌탈파트너에서 합리적인 가격으로 만나보세요.`
          }
        />
        <meta property="og:title" content={`${product.name} - 렌탈파트너`} />
        <meta
          property="og:description"
          content={product.description || "최고의 파트너 렌탈파트너"}
        />
        <meta
          property="og:image"
          content={
            product.image_url || "/logo.png"
          }
        />
      </Helmet>
      <div className="pt-8 pb-8 bg-gray-50 min-h-screen lg:pb-8">
        <Container>
          {/* Breadcrumbs */}
          {(() => {
            // 현재 카테고리의 상위 카테고리 찾기
            const currentCategoryItem = menuItems.find(
              (m) => m.name === product.category,
            );
            const parentCategoryName = currentCategoryItem?.category || null;

            return (
              <nav className="mb-6">
                <ol className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                  <li>
                    <a
                      href="/"
                      className="hover:text-[#001E45] transition-colors"
                    >
                      홈
                    </a>
                  </li>
                  {parentCategoryName && (
                    <>
                      <li>
                        <ChevronRight size={14} className="text-gray-300" />
                      </li>
                      <li>
                        <a
                          href={`/products?category=${encodeURIComponent(parentCategoryName)}`}
                          className="hover:text-[#001E45] transition-colors"
                        >
                          {parentCategoryName}
                        </a>
                      </li>
                    </>
                  )}
                  {product.category && (
                    <>
                      <li>
                        <ChevronRight size={14} className="text-gray-300" />
                      </li>
                      <li>
                        <a
                          href={`/products?category=${encodeURIComponent(product.category)}`}
                          className="hover:text-[#001E45] transition-colors"
                        >
                          {product.category}
                        </a>
                      </li>
                    </>
                  )}
                </ol>


              </nav>
            );
          })()}

          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Image */}
              <div className="aspect-square bg-gray-200 rounded-2xl overflow-hidden shadow-lg">
                <img
                  src={
                    product.image_url ||
                    "https://picsum.photos/seed/product/800/600"
                  }
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <span className="text-[#001E45] font-bold text-sm mb-2 block">
                  {product.category}
                </span>
                <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 mb-2">
                  {product.name}
                </h1>
                {product.short_description && (
                  <p className="text-gray-500 text-base">
                    {product.short_description}
                  </p>
                )}
                <div className="mt-4 flex items-baseline gap-2">
                  {product.discount_rate && product.discount_rate > 0 && (
                    <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">
                      {product.discount_rate}% OFF
                    </span>
                  )}
                  <span className="text-2xl font-semibold text-gray-900">
                    {product.price?.toLocaleString()}원
                  </span>
                  <span className="text-sm text-gray-400">/ 1일</span>
                </div>
              </div>

              {/* Calendar & Date Selection */}
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-lg">
                    날짜 선택
                  </h3>
                  <button
                    onClick={() => {
                      const sd = new Date();
                      const ed = new Date();
                      ed.setDate(ed.getDate() + 1);
                      setStartDate(sd);
                      setEndDate(ed);
                    }}
                    className="text-sm text-gray-400 hover:text-[#001E45] transition-colors flex items-center gap-1"
                  >
                    <RotateCcw size={14} />
                    일정 초기화
                  </button>
                </div>
                <div className="custom-calendar-wrapper">
                  <DatePicker
                    selected={startDate}
                    onChange={onChange}
                    startDate={startDate}
                    endDate={endDate}
                    selectsRange
                    inline
                    minDate={new Date()}
                    monthsShown={1}
                    dateFormat="yyyy.MM.dd"
                    locale="ko"
                  />
                </div>
                <div className="flex justify-between items-start pt-8 pb-4 border-t border-gray-100">
                  <span className="font-medium text-gray-700 py-1">
                    총 대여 기간
                  </span>
                  <div className="text-right flex flex-col items-end">
                    <span className="font-medium text-gray-900 text-base leading-tight">
                      {startDate ? startDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}
                      <br className="sm:hidden" />
                      <span className="hidden sm:inline"> ~ </span>
                      <span className="sm:hidden"> ~ </span>
                      {endDate ? endDate.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}
                    </span>
                    <span className="text-gray-500 text-sm mt-1">({days}일)</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-8 pb-4 border-t border-gray-100">
                  <span className="font-medium text-gray-700">예상 수량</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const current = typeof expectedPeople === 'string' ? parseInt(expectedPeople) || 0 : expectedPeople;
                        if (current > 1) setExpectedPeople(current - 1);
                      }}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={expectedPeople}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || /^\d+$/.test(val)) {
                            setExpectedPeople(val === "" ? "" : parseInt(val));
                          }
                        }}
                        onBlur={() => {
                          if (expectedPeople === "" || expectedPeople === 0) setExpectedPeople(1);
                        }}
                        className="w-12 text-center font-bold text-gray-900 text-lg border-b border-transparent focus:border-[#001E45] focus:outline-none bg-transparent p-0"
                        placeholder="0"
                      />
                      <span className="font-medium text-gray-700">대</span>
                    </div>
                    <button
                      onClick={() => {
                        const current = typeof expectedPeople === 'string' ? parseInt(expectedPeople) || 0 : expectedPeople;
                        setExpectedPeople(current + 1);
                      }}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Basic Configuration (Restored Box/Frame Style) */}
              {product.basic_components &&
                product.basic_components.length > 0 && (
                  <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
                    <button
                      onClick={() =>
                        setBasicComponentsExpanded(!basicComponentsExpanded)
                      }
                      className="w-full flex items-center justify-between pb-2 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-[#001E45] text-white px-2 py-0.5 rounded text-xs font-bold">
                          기본
                        </span>
                        <h3 className="font-bold text-gray-900 text-lg">
                          기본 구성 상품
                        </h3>
                        <span className="text-sm text-gray-500">
                          ({product.basic_components.length}개)
                        </span>
                      </div>
                      <ChevronRight
                        size={20}
                        className={`text-gray-400 transition-transform duration-200 ${basicComponentsExpanded ? "rotate-90" : ""}`}
                      />
                    </button>
                    {basicComponentsExpanded && (
                      <div className="space-y-0 mt-2">
                        {product.basic_components.map((item, idx) => {
                          const matchedProduct = componentProducts.find(
                            (p) => p.name === item.name,
                          );
                          const imageUrl =
                            item.image_url ||
                            matchedProduct?.image_url ||
                            getComponentComponentImage(item.name);

                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-4 py-4 border-b border-dashed border-gray-200 last:border-0"
                            >
                              <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-white flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden relative">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      e.currentTarget.parentElement?.classList.add(
                                        "fallback-icon",
                                      );
                                    }}
                                  />
                                ) : (
                                  <Package
                                    size={24}
                                    className="text-slate-400"
                                  />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 -z-10">
                                  <Package
                                    size={24}
                                    className="text-slate-400"
                                  />
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-[15px]">
                                  {item.name}
                                </p>
                                {(item.model_name ||
                                  matchedProduct?.product_code) && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {item.model_name ||
                                        matchedProduct?.product_code ||
                                        "P0000"}
                                    </p>
                                  )}
                              </div>
                              <span className="font-bold text-slate-700 bg-white border border-gray-100 px-3 py-1 rounded text-sm shadow-sm">
                                {item.quantity}개
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              {/* Option Selection Area (Type A: Chip & List) */}
              {hasAnyOptions && (
                <div className="mb-10">
                  {/* Tab Buttons (Underline Style for Type A) */}
                  <div className="flex bg-white rounded-t-xl border-b border-gray-200">
                    {optionTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveOptionTab(tab.id)}
                        className={`flex-1 py-4 font-bold text-sm transition-all relative
                                 ${activeOptionTab === tab.id
                            ? "text-[#001E45]"
                            : "text-gray-400 hover:text-[#001E45]"}`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <tab.icon size={18} />
                          {tab.label}
                          {tab.count > 0 && <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">{tab.count}</span>}
                        </div>
                        {activeOptionTab === tab.id && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#001E45]" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Chip Filter & List Content */}
                  <div className="bg-white rounded-b-xl border border-gray-100 shadow-sm overflow-hidden">
                    {activeOptionTab === "cooperative" &&
                      <OptionListTypeA items={globalCooperative} selectedQty={selectedCooperative} setQty={setSelectedCooperative} componentProducts={componentProducts} menuItems={menuItems} tabType="cooperative" selectionMode="checkbox" />}
                    {activeOptionTab === "additional" &&
                      <OptionListTypeA items={globalAdditional} selectedQty={selectedAdditional} setQty={setSelectedAdditional} componentProducts={componentProducts} menuItems={menuItems} tabType="additional" />}
                    {activeOptionTab === "place" &&
                      <OptionListTypeA items={globalPlaces} selectedQty={selectedPlaces} setQty={setSelectedPlaces} componentProducts={componentProducts} menuItems={menuItems} tabType="place" />}
                    {activeOptionTab === "food" &&
                      <OptionListTypeA items={globalFoods} selectedQty={selectedFoods} setQty={setSelectedFoods} componentProducts={componentProducts} menuItems={menuItems} tabType="food" />}
                  </div>
                </div>
              )}

              {/* Product Details Tabs */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-10 border border-gray-100">
                <div className="flex border-b border-gray-200">
                  {[
                    { id: "detail", label: "상세정보" },
                    { id: "guide", label: "대여안내" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-4 font-semibold text-sm transition-colors relative
                        ${activeTab === tab.id ? "text-[#001E45]" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#001E45]" />
                      )}
                    </button>
                  ))}
                </div>
                <div className={`min-h-[200px] ${activeTab === 'detail' ? '' : 'p-6'}`}>
                  {activeTab === "detail" &&
                    (product.description ? (
                      <div
                        className="prose prose-slate max-w-none w-full [&>p]:m-0 [&>img]:w-full [&>img]:m-0"
                        dangerouslySetInnerHTML={{
                          __html: product.description.replace(/\n/g, "<br/>"),
                        }}
                      />
                    ) : (
                      <p className="text-center text-gray-400 py-8">
                        상세 설명이 없습니다.
                      </p>
                    ))}
                  {activeTab === "guide" && (
                    <div className="space-y-8 text-gray-600">
                      <div className="rounded-2xl border border-[#001E45]/10 bg-[#001E45]/[0.03] p-5 md:p-6">
                        <p className="text-xs font-semibold tracking-[0.12em] text-[#001E45] uppercase mb-2">
                          대여 안내
                        </p>
                        <h4 className="text-lg font-bold text-slate-900 mb-2">
                          온라인에서는 견적 요청만 접수합니다.
                        </h4>
                        <p className="text-sm md:text-base leading-7">
                          사이트에서는 상품 구성과 예상 금액을 확인한 뒤 견적을 요청하실 수 있습니다.
                          최종 금액과 진행 조건은 담당자 검토 후 별도로 안내드립니다.
                        </p>
                      </div>

                      <div>
                        <h5 className="text-sm font-bold text-slate-900 mb-4">진행 절차</h5>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          {[
                            { step: "01", title: "견적 요청 접수", desc: "상품과 일정, 옵션을 선택해 요청을 남깁니다." },
                            { step: "02", title: "담당자 검토", desc: "재고, 일정, 설치 조건을 확인합니다." },
                            { step: "03", title: "견적 안내", desc: "최종 금액과 진행 조건을 회신드립니다." },
                            { step: "04", title: "확정 및 설치", desc: "일정 확정 후 납품, 설치, 회수를 진행합니다." },
                          ].map((item) => (
                            <div key={item.step} className="rounded-xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-bold text-[#001E45] mb-2">{item.step}</p>
                              <p className="font-semibold text-slate-900 mb-2">{item.title}</p>
                              <p className="text-sm leading-6 text-slate-600">{item.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                          <p className="text-xs text-slate-500">납품 가능 지역</p>
                          <p className="font-bold text-slate-900 mt-1">수도권 당일 대응, 전국 협력망 운영</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                          <p className="text-xs text-slate-500">평균 응답 시간</p>
                          <p className="font-bold text-slate-900 mt-1">영업일 기준 1일 이내 1차 회신</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                          <p className="text-xs text-slate-500">운영 기준</p>
                          <p className="font-bold text-slate-900 mt-1">설치 일정 확정 후 납품 및 회수 진행</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                          <p className="text-xs text-slate-500">안내 항목</p>
                          <p className="font-bold text-slate-900 mt-1">견적서, 계약 조건, 세금계산서 등 별도 안내</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-5">
                        <p className="text-sm font-bold text-slate-900 mb-3">견적 요청 전 확인하면 좋은 정보</p>
                        <ul className="space-y-2 text-sm text-slate-600 leading-6">
                          <li>설치 지역, 희망 일정, 사용 기간</li>
                          <li>수량, 추가 옵션, 현장 반입 조건</li>
                          <li>엘리베이터, 주차, 설치 가능 시간 여부</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Sticky Sidebar (Desktop Only) */}
            <div className="hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                  <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center gap-2">
                    <ShoppingBag size={20} className="text-[#001E45]" />
                    견적 요청 요약
                  </h3>
                  <p className="text-[14px] text-gray-500 leading-[1.4] mb-6">
                    상기 금액은 기본 운영 기준 구성에 대한 최소 금액이며,<br />
                    수량 및 대여 일정에 따라 조정될 수 있습니다.
                  </p>

                  {/* Selected Dates */}
                  <SummaryRows rows={summaryRows} />

                  {/* Selected Options Summary */}
                  {selectedSummary.length > 0 && <SelectedOptionsSection items={selectedSummary} scrollable />}

                  {/* Total Price */}
                  <div className="mt-6 pt-4 border-t-2 border-gray-900">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">
                        예상 견적 비용
                      </span>
                      <span className="text-2xl font-bold text-[#001E45]">
                        {totalPrice.toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  {/* Booking Button */}
                  <button
                    onClick={() => openActionConfirm('booking')}
                    disabled={isBooking || product.stock === 0}
                    className="w-full mt-6 bg-[#001E45] text-white py-4 rounded-xl font-bold hover:bg-[#001E45]/90 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400 shadow-lg"
                  >
                    {isBooking ? (
                      <>
                        <Loader2 className="animate-spin" size={20} /> 처리중...
                      </>
                    ) : product.stock === 0 ? (
                      "품절"
                    ) : (
                      "견적 요청 접수"
                    )}
                  </button>
                  <button
                    onClick={() => openActionConfirm('cart')}
                    className="w-full mt-3 bg-white text-[#001E45] py-3 rounded-xl font-bold border-2 border-[#001E45] hover:bg-sky-50 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={18} />
                    장바구니 담기
                  </button>
                  <div className="mt-3">
                    <p className="text-[13px] font-medium text-gray-500 text-left px-1">
                      접수 후 1영업일 내 담당자가 연락드립니다.
                    </p>
                  </div>

                  {/* Additional Info & Certification Badges */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="space-y-4">
                      {/* Quote Notice */}
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-100 border border-gray-100">
                          <span className="text-xl">💳</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            온라인 결제 없이 견적 접수 후 계약 진행
                          </p>
                          <p className="text-xs text-gray-500">
                            법인카드, 세금계산서 등 기업 행정 서류를 지원합니다.
                          </p>
                        </div>
                      </div>

                      {/* Certified Company 1 */}
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-100 border border-gray-100">
                          <img
                            src="/cert-disabled.jpg"
                            alt="장애인등록기업"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            장애인등록기업
                          </p>
                          <p className="text-xs text-gray-500">
                            공공기관 우선구매 대상
                          </p>
                        </div>
                      </div>

                      {/* Certified Company 2 */}
                      <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-gray-100 border border-gray-100">
                          <img
                            src="/cert-mice.jpg"
                            alt="사무장비 렌탈 전문기업"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            사무장비 렌탈 전문기업
                          </p>
                          <p className="text-xs text-gray-500">
                            복합기·노트북·데스크탑 렌탈 전문성 보유
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <div
        className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 lg:hidden transition-all duration-300 ${mobileBarExpanded ? "max-h-[80vh]" : "max-h-[140px]"}`}
      >
        <button
          onClick={() => setMobileBarExpanded(!mobileBarExpanded)}
          className="w-full flex items-center justify-center py-2 bg-gray-50 border-b border-gray-100"
        >
          <ChevronRight
            size={20}
            className={`text-gray-400 transition-transform duration-300 ${mobileBarExpanded ? "rotate-90" : "rotate-[-90deg]"}`}
          />
          <span className="text-xs text-gray-500 ml-1">
            {mobileBarExpanded ? "접기" : "상세보기"}
          </span>
        </button>

        {mobileBarExpanded && (
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center gap-2">
              <ShoppingBag size={20} className="text-[#001E45]" />
              견적 요청 요약
            </h3>
            <p className="text-[14px] text-gray-500 leading-[1.4] mb-6">
              상기 금액은 기본 운영 기준 구성에 대한 최소 금액이며,<br />
              수량 및 대여 일정에 따라 조정될 수 있습니다.
            </p>

            <SummaryRows rows={summaryRows} />

            {selectedSummary.length > 0 && <SelectedOptionsSection items={selectedSummary} />}

            <button
              onClick={() => openActionConfirm('cart')}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#001E45] text-[#001E45] font-semibold hover:bg-sky-50 transition-all"
            >
              <ShoppingCart size={18} />
              장바구니 담기 ({quoteCartCount})
            </button>
          </div>
        )}

        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">예상 견적 비용</p>
              <p className="text-xl font-bold text-[#001E45]">
                {totalPrice.toLocaleString()}원
              </p>
            </div>
            <button
              onClick={() => openActionConfirm('booking')}
              disabled={isBooking || product.stock === 0}
              className="flex-1 max-w-[200px] bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400"
            >
              {isBooking ? (
                <Loader2 className="animate-spin" size={18} />
              ) : null}
              {isBooking
                ? "처리중..."
                : product.stock === 0
                  ? "품절"
                  : "견적 요청 접수"}
            </button>
          </div>
        </div>
      </div>

      {actionConfirmModal.show && (
        <div
          className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
          onClick={closeActionConfirm}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {actionConfirmModal.action === 'booking' ? '견적 요청 확인' : '장바구니 확인'}
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900 mb-3">
                  아래 내용으로 {actionConfirmModal.action === 'booking' ? '견적 요청을 접수' : '장바구니에 저장'}합니다.
                </p>
                <SummaryRows rows={summaryRows} />
                {selectedSummary.length > 0 && (
                  <SelectedOptionsSection items={selectedSummary} />
                )}
                <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">예상 견적 비용</span>
                  <span className="text-xl font-bold text-[#001E45]">{totalPrice.toLocaleString()}원</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {actionConfirmModal.action === 'booking'
                  ? '확인 후 견적 요청이 바로 접수되며, 담당자가 검토 후 마이페이지로 진행 상태를 안내합니다.'
                  : '확인 후 현재 구성으로 장바구니에 저장되며, 여러 품목을 모아서 한 번에 접수할 수 있습니다.'}
              </p>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeActionConfirm}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-all"
              >
                다시 검토
              </button>
              <button
                onClick={() => {
                  const action = actionConfirmModal.action;
                  closeActionConfirm();
                  if (action === 'booking') {
                    void handleBooking();
                    return;
                  }
                  handleAddToQuoteCart();
                }}
                className="flex-1 py-3 rounded-xl bg-[#001E45] text-white font-semibold hover:bg-[#002D66] transition-all"
              >
                {actionConfirmModal.action === 'booking' ? '이대로 요청하기' : '이대로 담기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Result Modal */}
      {bookingModal.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={() => {
          setBookingModal(prev => ({ ...prev, show: false }));
          bookingModal.onClose?.();
        }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[360px] p-8 text-center animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5">
              {bookingModal.type === 'success' && (
                <div className="w-16 h-16 bg-[#001E45]/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={32} className="text-[#001E45]" />
                </div>
              )}
              {bookingModal.type === 'error' && (
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <XCircle size={32} className="text-red-500" />
                </div>
              )}
              {bookingModal.type === 'info' && (
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle size={32} className="text-blue-500" />
                </div>
              )}
            </div>
            <p className="text-gray-800 font-semibold text-base leading-relaxed whitespace-pre-line mb-8">
              {bookingModal.message}
            </p>
            <button
              onClick={() => {
                setBookingModal(prev => ({ ...prev, show: false }));
                bookingModal.onClose?.();
              }}
              className="w-full py-3 bg-[#001E45] text-white font-bold rounded-xl hover:bg-[#002D66] transition-colors shadow-sm"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
};

