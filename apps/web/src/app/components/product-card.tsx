/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { BookOpen, Eye, MapPin, PackageCheck, Truck } from "lucide-react";
import { normalizeImages, Product } from "./api-client";

export function ProductCard({ product }: { product: Product }) {
  const images = normalizeImages(product.images);
  const location = product.position || product.user?.address || "校内面交";
  const sold = product.status === 1;

  return (
    <article className="product-card">
      <Link href={`/products/${product.id}`} className="product-image-link" aria-label={`查看 ${product.name}`}>
        {images[0] ? <img className="product-image" src={images[0]} alt={product.name} loading="lazy" /> : (
          <span className="product-image-fallback"><BookOpen size={34} /><small>暂无商品图</small></span>
        )}
        {sold ? <span className="sold-mask">已售出</span> : null}
      </Link>
      <div className="product-card-body">
        <div className="product-card-heading">
          <Link href={`/products/${product.id}`}>{product.name}</Link>
          <strong>¥{Number(product.price || 0).toFixed(2)}</strong>
        </div>
        <p>{product.description || "卖家暂未填写商品说明"}</p>
        <div className="product-meta">
          <span><MapPin size={14} />{location}</span>
          <span>{product.way === "送上门" ? <Truck size={14} /> : <PackageCheck size={14} />}{product.way || "自提"}</span>
          {typeof product.viewCount === "number" ? <span><Eye size={14} />{product.viewCount}</span> : null}
        </div>
        <div className="product-foot">
          <span>{product.category}</span>
          {product.distance ? <span>约 {product.distance >= 1000 ? `${(product.distance / 1000).toFixed(1)} km` : `${product.distance} m`}</span> : <span>校内交易</span>}
        </div>
      </div>
    </article>
  );
}
