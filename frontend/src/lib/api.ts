export interface ProductCard {
  slug: string;
  name: string;
  category: string;
  category_title: string;
  origin: string;
  origin_title: string;
  form: string;
  form_title: string;
  price: number;
  weight_g: number;
  in_stock: boolean;
  image_url: string;
}

export interface ProductDetail extends ProductCard {
  description: string;
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  selected: boolean;
}

export interface FacetGroup {
  key: 'category' | 'origin' | 'form';
  title: string;
  values: FacetValue[];
}

export interface CatalogPage {
  items: ProductCard[];
  total: number;
  page: number;
  per_page: number;
  facets: FacetGroup[];
  price_range: { min: number | null; max: number | null };
}

export interface Category {
  slug: string;
  title: string;
  product_count: number;
}

export interface Meta {
  name: string;
  seeded_bugs: boolean;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new ApiError(res.status, `${path}: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  meta: (signal?: AbortSignal) => get<Meta>('/api/meta', signal),
  categories: (signal?: AbortSignal) => get<Category[]>('/api/categories', signal),
  catalog: (query: string, signal?: AbortSignal) =>
    get<CatalogPage>(`/api/catalog${query ? `?${query}` : ''}`, signal),
  product: (slug: string, signal?: AbortSignal) =>
    get<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`, signal),
  recommendations: (signal?: AbortSignal) => get<ProductCard[]>('/api/recommendations', signal),
};
