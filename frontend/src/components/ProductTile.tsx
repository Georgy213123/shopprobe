import { Link } from 'react-router-dom';
import type { ProductCard } from '../lib/api';
import { formatPrice, formatWeight } from '../lib/format';

export function ProductTile({ product, eager = false }: { product: ProductCard; eager?: boolean }) {
  return (
    <article className="tile" data-testid="product-tile">
      <Link to={`/product/${product.slug}`} className="tile-link">
        <img
          src={product.image_url}
          alt={product.name}
          width={480}
          height={360}
          loading={eager ? 'eager' : 'lazy'}
        />
        <h3 className="tile-name">{product.name}</h3>
      </Link>
      <p className="tile-meta">
        {product.category_title} · {product.origin_title} · {formatWeight(product.weight_g)}
      </p>
      <p className="tile-price">
        {formatPrice(product.price)}
        {!product.in_stock && <span className="out">нет в наличии</span>}
      </p>
    </article>
  );
}
