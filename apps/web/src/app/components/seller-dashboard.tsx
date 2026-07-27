"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
/* eslint-disable @next/next/no-img-element */

import {
  BookOpen,
  CircleAlert,
  FileImage,
  LoaderCircle,
  LockKeyhole,
  PackageCheck,
  Plus,
  RefreshCw,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { apiFetch, formatDate, normalizeImages, Product } from "./api-client";
import { useSession } from "./session-provider";

const CATEGORIES = ["二手书", "电子产品", "电器", "家具", "食物", "其他"];

export function SellerDashboard() {
  const { user, isLoading, openLogin } = useSession();
  const [tab, setTab] = useState<"publish" | "manage">("publish");
  const [products, setProducts] = useState<Product[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  const loadMine = useCallback(async () => {
    if (!user) return;
    setListLoading(true);
    setListError("");
    try {
      setProducts(await apiFetch<Product[]>("/api/user/products"));
    } catch (caught) {
      setListError(caught instanceof Error ? caught.message : "发布记录加载失败");
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (tab === "manage") loadMine();
  }, [loadMine, tab]);

  async function toggleStatus(product: Product) {
    try {
      const updated = await apiFetch<Product>(`/api/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: product.status === 1 ? 0 : 1 }),
      });
      setProducts((current) => current.map((item) => item.id === product.id ? { ...item, status: updated.status } : item));
    } catch (caught) {
      setListError(caught instanceof Error ? caught.message : "状态更新失败");
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`确定删除“${product.name}”吗？删除后无法恢复。`)) return;
    try {
      await apiFetch(`/api/products/${product.id}`, { method: "DELETE" });
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (caught) {
      setListError(caught instanceof Error ? caught.message : "删除失败");
    }
  }

  if (isLoading) return <div className="page-loading"><LoaderCircle className="spin" size={28} /> 正在同步账号</div>;

  if (!user) return (
    <div className="auth-required">
      <LockKeyhole size={36} />
      <h1>登录后管理你的闲置</h1>
      <p>发布商品、切换在售状态和查看历史发布都需要登录。</p>
      <button className="button primary" type="button" onClick={openLogin}>登录校园账号</button>
      <Link className="text-link" href="/">先逛逛市集</Link>
    </div>
  );

  return (
    <div className="seller-page">
      <header className="page-title-row">
        <div><span className="page-icon"><Store size={21} /></span><div><h1>发布管理</h1><p>发布新的校园闲置，或维护现有商品状态。</p></div></div>
        <div className="seller-summary"><span><strong>{products.length}</strong> 件发布</span><span><strong>{user.points ?? 0}</strong> 积分</span></div>
      </header>

      <div className="segmented seller-tabs" aria-label="发布管理视图">
        <button type="button" className={tab === "publish" ? "active" : ""} onClick={() => setTab("publish")}><Plus size={16} /> 发布商品</button>
        <button type="button" className={tab === "manage" ? "active" : ""} onClick={() => setTab("manage")}><PackageCheck size={16} /> 我的商品</button>
      </div>

      {tab === "publish" ? <PublishForm userId={user.id} defaultContact={user.contact || user.phone || ""} defaultPosition={user.address || ""} verified={user.isStudent === 2} onPublished={() => { setTab("manage"); loadMine(); }} /> : (
        <section className="manage-products" aria-labelledby="my-products-title">
          <div className="section-toolbar"><div><h2 id="my-products-title">我的商品</h2><p>及时标记已售出商品，减少无效联系。</p></div><button className="icon-button" type="button" onClick={loadMine} aria-label="刷新我的商品" title="刷新"><RefreshCw size={17} /></button></div>
          {listError ? <div className="inline-alert" role="alert"><CircleAlert size={17} />{listError}</div> : null}
          {listLoading ? <div className="loading-state"><LoaderCircle className="spin" size={24} /> 加载发布记录</div> : products.length ? (
            <div className="manage-list">
              {products.map((product) => {
                const image = normalizeImages(product.images)[0];
                return (
                  <article className="manage-row" key={product.id}>
                    <Link href={`/products/${product.id}`} className="manage-thumb">
                      {image ? <img src={image} alt={product.name} /> : <BookOpen size={28} />}
                    </Link>
                    <div className="manage-main"><Link href={`/products/${product.id}`}>{product.name}</Link><span>{product.category} · {formatDate(product.createdAt)}</span></div>
                    <strong className="manage-price">¥{Number(product.price || 0).toFixed(2)}</strong>
                    <span className={`status-text ${product.status === 1 ? "sold" : "active"}`}>{product.status === 1 ? "已售出" : "在售"}</span>
                    <div className="manage-actions">
                      <button className="button secondary compact" type="button" onClick={() => toggleStatus(product)}>{product.status === 1 ? "重新上架" : "标记售出"}</button>
                      <button className="icon-button danger" type="button" onClick={() => deleteProduct(product)} aria-label={`删除 ${product.name}`} title="删除"><Trash2 size={16} /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state compact"><Store size={34} /><h3>还没有发布商品</h3><p>整理一件闲置，从清晰图片和真实描述开始。</p><button className="button primary" type="button" onClick={() => setTab("publish")}><Plus size={17} /> 发布第一件商品</button></div>
          )}
        </section>
      )}
    </div>
  );
}

function PublishForm({ userId, defaultContact, defaultPosition, verified, onPublished }: { userId: number; defaultContact: string; defaultPosition: string; verified: boolean; onPublished: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("二手书");
  const [price, setPrice] = useState("");
  const [contact, setContact] = useState(defaultContact);
  const [position, setPosition] = useState(defaultPosition);
  const [way, setWay] = useState("自提");
  const [isbn, setIsbn] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const next = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/") && file.size <= 8 * 1024 * 1024);
    setFiles((current) => [...current, ...next].slice(0, 6));
    event.target.value = "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verified) {
      setError("发布商品前需要完成学生身份认证");
      return;
    }
    if (!files.length) {
      setError("请至少上传一张商品实拍图");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const imageUrls = await Promise.all(files.map(async (file) => {
        const body = new FormData();
        body.append("file", file);
        body.append("user", String(userId));
        const result = await apiFetch<{ url: string }>("/api/addProduct/uploadimage", { method: "POST", body });
        return result.url;
      }));
      await apiFetch<Product>("/api/addProduct", {
        method: "POST",
        body: JSON.stringify({
          userId,
          name,
          description,
          images: JSON.stringify(imageUrls),
          category,
          contact,
          isbn: category === "二手书" ? isbn : "",
          price: Number(price),
          position,
          way,
          range: [],
        }),
      });
      onPublished();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "发布失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="publish-workspace" aria-labelledby="publish-title">
      {!verified ? <div className="verification-warning"><ShieldCheck size={19} /><div><strong>发布前需要完成学生认证</strong><span>请先在微信小程序提交学生证资料，审核通过后刷新登录状态。</span></div></div> : null}
      <form className="publish-form" onSubmit={submit}>
        <div className="form-section-heading"><div><h2 id="publish-title">商品信息</h2><p>清楚描述成色、缺陷和配件，能减少来回确认。</p></div><span>必填项标记 *</span></div>
        <div className="form-grid two-columns">
          <label>商品名称 *<input required maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：高等数学同济第七版" /></label>
          <label>分类 *<select value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>价格 *<span className="money-field"><span>¥</span><input required min="0" step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" /></span></label>
          {category === "二手书" ? <label>ISBN<input value={isbn} onChange={(event) => setIsbn(event.target.value)} placeholder="建议填写，便于搜索" /></label> : <label>交易方式 *<select value={way} onChange={(event) => setWay(event.target.value)}><option>自提</option><option>送上门</option></select></label>}
          <label>交易地点 *<input required value={position} onChange={(event) => setPosition(event.target.value)} placeholder="例如：图书馆东门" /></label>
          <label>联系方式 *<input required value={contact} onChange={(event) => setContact(event.target.value)} placeholder="微信号、QQ 或手机号" /></label>
          {category === "二手书" ? <label>交易方式 *<select value={way} onChange={(event) => setWay(event.target.value)}><option>自提</option><option>送上门</option></select></label> : null}
        </div>
        <label className="description-field">商品描述<textarea required maxLength={800} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="说明使用时长、成色、缺陷、配件和议价空间。" /><span>{description.length}/800</span></label>

        <div className="upload-section">
          <div><h3>商品图片 *</h3><p>最多 6 张，每张不超过 8MB，建议上传实拍细节。</p></div>
          <div className="upload-grid">
            {previews.map(({ file, url }, index) => <figure key={`${file.name}-${file.lastModified}`}><img src={url} alt={`待上传图片 ${index + 1}`} /><button className="icon-button" type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label="移除图片" title="移除"><X size={15} /></button></figure>)}
            {files.length < 6 ? <label className="upload-tile"><FileImage size={24} /><span>添加实拍图</span><small>{files.length}/6</small><input type="file" accept="image/*" multiple onChange={chooseFiles} /></label> : null}
          </div>
        </div>

        {error ? <p className="form-error" role="alert"><CircleAlert size={16} />{error}</p> : null}
        <div className="form-submit-row"><span><ShieldCheck size={16} />发布即表示商品信息真实，交易由双方当面确认。</span><button className="button primary" type="submit" disabled={submitting || !verified}>{submitting ? <LoaderCircle className="spin" size={17} /> : <Upload size={17} />}{submitting ? "上传并发布中" : "确认发布"}</button></div>
      </form>
    </section>
  );
}
