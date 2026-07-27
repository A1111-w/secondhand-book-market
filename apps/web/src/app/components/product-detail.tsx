"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CircleAlert,
  Clipboard,
  Heart,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Star,
  Truck,
  UserRound,
} from "lucide-react";
import { apiFetch, formatDate, normalizeImages, Product } from "./api-client";
import { useSession } from "./session-provider";

export function ProductDetail({ productId }: { productId: string }) {
  const { user, openLogin } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const address = user?.address ? `?address=${encodeURIComponent(user.address)}` : "";
      setProduct(await apiFetch<Product>(`/api/products/${productId}${address}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "商品详情加载失败");
    } finally {
      setLoading(false);
    }
  }, [productId, user?.address]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  async function unlockContact() {
    if (!user) {
      openLogin();
      return;
    }
    setWorking(true);
    setNotice("");
    try {
      const result = await apiFetch<{ success: boolean; contact: string }>("/api/products/unlock", {
        method: "POST",
        body: JSON.stringify({ productId: Number(productId) }),
      });
      setProduct((current) => current ? { ...current, isUnlocked: true, contact: result.contact } : current);
      setNotice("联系方式已解锁");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "解锁失败");
    } finally {
      setWorking(false);
    }
  }

  async function toggleFavorite() {
    if (!user) {
      openLogin();
      return;
    }
    setWorking(true);
    try {
      const result = await apiFetch<{ isFavorited: boolean }>("/api/favorites/toggle", {
        method: "POST",
        body: JSON.stringify({ productId: Number(productId) }),
      });
      setProduct((current) => current ? { ...current, isFavorited: result.isFavorited } : current);
      setNotice(result.isFavorited ? "已加入收藏" : "已取消收藏");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "收藏操作失败");
    } finally {
      setWorking(false);
    }
  }

  async function copyContact() {
    if (!product?.contact) return;
    await navigator.clipboard.writeText(product.contact);
    setNotice("联系方式已复制");
  }

  if (loading) return <div className="page-loading"><LoaderCircle className="spin" size={28} /> 正在读取商品详情</div>;
  if (error || !product) return (
    <div className="detail-error"><CircleAlert size={34} /><h1>商品暂时无法查看</h1><p>{error || "商品可能已下架"}</p><Link className="button secondary" href="/"><ArrowLeft size={17} /> 返回市集</Link></div>
  );

  const images = normalizeImages(product.images);
  const isOwn = user?.id === product.userId;
  const isSold = product.status === 1;
  const contactReady = product.isUnlocked || isOwn;
  const sellerName = product.user?.username || "校园卖家";

  return (
    <div className="detail-page">
      <Link className="back-link" href="/"><ArrowLeft size={16} /> 返回商品列表</Link>
      <div className="detail-layout">
        <section className="gallery" aria-label="商品图片">
          <div className="gallery-main">
            {images[activeImage] ? <img src={images[activeImage]} alt={`${product.name} 图片 ${activeImage + 1}`} /> : <span className="product-image-fallback large"><BookOpen size={52} /><small>卖家暂未上传图片</small></span>}
            {isSold ? <span className="sold-mask large">商品已售出</span> : null}
          </div>
          {images.length > 1 ? (
            <div className="gallery-thumbs">
              {images.map((image, index) => (
                <button key={`${image}-${index}`} type="button" className={activeImage === index ? "active" : ""} onClick={() => setActiveImage(index)} aria-label={`查看第 ${index + 1} 张图片`}>
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="detail-summary">
          <div className="detail-title-row"><span>{product.category}</span><span>{formatDate(product.createdAt)} 发布</span></div>
          <h1>{product.name}</h1>
          <div className="detail-price">¥<strong>{Number(product.price || 0).toFixed(2)}</strong></div>
          <p className="detail-description">{product.description || "卖家暂未填写商品说明，联系前可以先确认成色与配件情况。"}</p>

          <dl className="detail-facts">
            <div><dt><MapPin size={16} />交易地点</dt><dd>{product.position || product.user?.address || "校内协商"}</dd></div>
            <div><dt>{product.way === "送上门" ? <Truck size={16} /> : <PackageCheck size={16} />}交易方式</dt><dd>{product.way || "自提"}</dd></div>
            {product.isbn ? <div><dt><BookOpen size={16} />ISBN</dt><dd>{product.isbn}</dd></div> : null}
            <div><dt><ShieldCheck size={16} />商品状态</dt><dd>{isSold ? "已售出" : "正在出售"}</dd></div>
          </dl>

          <div className="seller-row">
            {product.user?.avatar ? <img src={product.user.avatar} alt={`${sellerName}头像`} /> : <span className="seller-avatar"><UserRound size={20} /></span>}
            <div><strong>{sellerName}</strong><span>信用分 {product.user?.creditScore ?? 300}</span></div>
            <span className="seller-rating"><Star size={15} /> {product.user?.avgRating?.toFixed(1) || "暂无评价"}</span>
          </div>

          <div className={`contact-state ${contactReady ? "unlocked" : "locked"}`}>
            <div>{contactReady ? <MessageCircle size={19} /> : <LockKeyhole size={19} />}<span><strong>{contactReady ? "卖家联系方式" : "联系方式已保护"}</strong><small>{contactReady ? product.contact || "请通过站内消息联系" : "登录后可免费解锁，并记录本次交易联系"}</small></span></div>
            {contactReady && product.contact ? <button className="icon-button" type="button" onClick={copyContact} aria-label="复制联系方式" title="复制联系方式"><Clipboard size={17} /></button> : null}
          </div>

          {notice ? <p className="action-notice" role="status"><Check size={15} />{notice}</p> : null}
          <div className="detail-actions">
            <button className="button primary" type="button" onClick={unlockContact} disabled={working || isSold || isOwn || contactReady}>
              {working ? <LoaderCircle className="spin" size={17} /> : contactReady ? <MessageCircle size={17} /> : <LockKeyhole size={17} />}
              {isOwn ? "这是我发布的商品" : isSold ? "商品已售出" : contactReady ? "联系方式已解锁" : user ? "免费解锁联系方式" : "登录后联系卖家"}
            </button>
            {!isOwn ? <button className={`button secondary favorite-button ${product.isFavorited ? "active" : ""}`} type="button" onClick={toggleFavorite} disabled={working}><Heart size={17} fill={product.isFavorited ? "currentColor" : "none"} />{product.isFavorited ? "已收藏" : "收藏"}</button> : null}
          </div>
        </section>
      </div>

      <section className="transaction-note">
        <ShieldCheck size={21} />
        <div><h2>交易前请核对</h2><p>确认实物成色、配件和价格后再付款；不要离开校内公共区域进行高额交易。</p></div>
      </section>
    </div>
  );
}
