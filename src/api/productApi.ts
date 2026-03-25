import { supabase } from '../lib/supabase';

export type ProductCatalogType = 'general' | 'package';

export interface Product {
    id?: string;
    name: string;
    category?: string; // 카테고리 (중분류)
    _parent_category?: string; // VIEW 등에서 조인으로 가져올 대분류
    price: number;
    description?: string;
    short_description?: string;
    image_url?: string;
    stock: number;
    discount_rate?: number;
    created_at?: string;
    catalog_type?: ProductCatalogType;
    
    // 패키지 및 상품옵션 타입
    product_type?: 'basic' | 'essential' | 'additional' | 'cooperative' | 'place' | 'food'; // New: basic(package), essential(basic component), additional, cooperative, place, food
    
    // 관계형 데이터 (JSON 형태로 저장)
    basic_components?: { name: string; model_name?: string; quantity: number }[];
    additional_components?: { name: string; model_name?: string; price: number; _category?: string }[];
    cooperative_components?: { name: string; model_name?: string; price: number; _category?: string }[];
    place_components?: { name: string; price: number }[];
    food_components?: { name: string; price: number }[];
}

interface ProductQueryOptions {
    catalogType?: ProductCatalogType | 'all';
}

const isMissingCatalogTypeError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('catalog_type');
};

const applyCatalogFilter = <T>(query: T & {
    eq: (column: string, value: string) => T;
    or: (filters: string) => T;
}, catalogType?: ProductCatalogType | 'all') => {
    if (!catalogType || catalogType === 'all') {
        return query;
    }

    if (catalogType === 'package') {
        return query.eq('catalog_type', 'package');
    }

    return query.or('catalog_type.eq.general,catalog_type.is.null');
};

// 모든 상품 조회
export const getProducts = async (options: ProductQueryOptions = {}): Promise<Product[]> => {
    try {
        const query = applyCatalogFilter(
            supabase
            .from('products')
            .select('*'),
            options.catalogType
        );

        const { data, error } = await query
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        if (!isMissingCatalogTypeError(error)) throw error;

        const { data, error: fallbackError } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;
        return options.catalogType === 'package' ? [] : (data || []);
    }
};

// 카테고리별 상품 조회
export const getProductsByCategory = async (category: string, options: ProductQueryOptions = {}): Promise<Product[]> => {
    try {
        const query = applyCatalogFilter(supabase.from('products').select('*'), options.catalogType);

        if (category && category !== 'all') {
            query.eq('category', category);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (error) {
        if (!isMissingCatalogTypeError(error)) throw error;

        const fallbackQuery = supabase.from('products').select('*');
        if (category && category !== 'all') {
            fallbackQuery.eq('category', category);
        }

        const { data, error: fallbackError } = await fallbackQuery.order('created_at', { ascending: false });
        if (fallbackError) throw fallbackError;
        return options.catalogType === 'package' ? [] : (data || []);
    }
};

// 타입별 상품 조회 (basic, essential, additional, cooperative, place, food)
export const getProductsByType = async (type: string, options: ProductQueryOptions = {}): Promise<Product[]> => {
    try {
        let query = applyCatalogFilter(supabase.from('products').select('*'), options.catalogType);
        
        if (type === 'additional' || type === 'essential') {
            // 'essential'와 'additional'은 '물품'으로 통합 관리
            query = query.in('product_type', ['essential', 'additional']);
        } else {
            query = query.eq('product_type', type);
        }

        const { data, error } = await query.order('name', { ascending: true }); // Alphabetical order for options
        if (error) throw error;
        return data || [];
    } catch (error) {
        if (!isMissingCatalogTypeError(error)) throw error;

        let fallbackQuery = supabase.from('products').select('*');
        if (type === 'additional' || type === 'essential') {
            fallbackQuery = fallbackQuery.in('product_type', ['essential', 'additional']);
        } else {
            fallbackQuery = fallbackQuery.eq('product_type', type);
        }

        const { data, error: fallbackError } = await fallbackQuery.order('name', { ascending: true });
        if (fallbackError) throw fallbackError;
        return options.catalogType === 'package' ? [] : (data || []);
    }
};

// 상품 검색 API
export const searchProducts = async (keyword: string): Promise<Product[]> => {
    if (!keyword) return [];

    try {
        const query = applyCatalogFilter(
            supabase
            .from('products')
            .select('*'),
            'all'
        );

        const { data, error } = await query
            .or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%,short_description.ilike.%${keyword}%`)
            .eq('product_type', 'basic')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        if (!isMissingCatalogTypeError(error)) throw error;

        const { data, error: fallbackError } = await supabase
            .from('products')
            .select('*')
            .or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%,short_description.ilike.%${keyword}%`)
            .eq('product_type', 'basic')
            .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;
        return data || [];
    }
};

// 단일 상품 조회
export const getProductById = async (id: string): Promise<Product | null> => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

// 상품 추가
// 상품 추가
export const addProduct = async (product: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const userData = { ...product };

    // 상품 번호 자동 생성 로직 제거
    // if (!userData.product_code) ...


    try {
        const { data, error } = await supabase
            .from('products')
            .insert([userData])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        if (!isMissingCatalogTypeError(error)) throw error;
        if (userData.catalog_type === 'package') {
            throw new Error('패키지 상품 기능을 사용하려면 add_product_catalog_type.sql 을 먼저 실행해주세요.');
        }

        const { catalog_type, ...legacyProduct } = userData;
        const { data, error: fallbackError } = await supabase
            .from('products')
            .insert([legacyProduct])
            .select()
            .single();

        if (fallbackError) throw fallbackError;
        return data;
    }
};

// 상품 수정
export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
    try {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        if (!isMissingCatalogTypeError(error)) throw error;
        if (updates.catalog_type === 'package') {
            throw new Error('패키지 상품 기능을 사용하려면 add_product_catalog_type.sql 을 먼저 실행해주세요.');
        }

        const { catalog_type, ...legacyUpdates } = updates;
        const { data, error: fallbackError } = await supabase
            .from('products')
            .update(legacyUpdates)
            .eq('id', id)
            .select()
            .single();

        if (fallbackError) throw fallbackError;
        return data;
    }
};

// 상품 삭제
export const deleteProduct = async (id: string): Promise<void> => {
    // 상품-섹션 연결 관계 먼저 삭제
    await supabase.from('product_sections').delete().eq('product_id', id);
    // 예약 내역 삭제 (FK 제약조건 해결)
    await supabase.from('bookings').delete().eq('product_id', id);

    // 이후 상품 삭제
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// 상품 번호로 조회
export const getProductByCode = async (code: string): Promise<Product | null> => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_code', code)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
    }
    return data;
};
