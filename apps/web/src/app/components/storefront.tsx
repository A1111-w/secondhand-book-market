"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp,
  BookOpenText,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  MapPin,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { apiFetch, Product } from "./api-client";
import { ProductCard } from "./product-card";
import { useSession } from "./session-provider";

const CATEGORIES = ["全部", "二手书", "电子产品", "电器", "家具", "食物", "其他"];
const PAGE_SIZE = 12;

type SortKey = "latest" | "priceAsc" | "priceDesc" | "distance";

export function Storefront() {
  const { user } = useSession();
  const [searchDraft, setSearchDraft] = useState("");
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("全部");
  const [sort, setSort] = useState<SortKey>("latest");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const requestParams = useMemo(() => {
    const sortParams = {
      priceSort: sort === "priceAsc" ? 1 : sort === "priceDesc" ? 2 : 0,
      distanceSort: sort === "distance" ? 1 : 0,
    };
    return {
      keyword,
      category: category === "全部" ? "" : category,
      address: user?.address || "",
      ...sortParams,
    };
  }, [category, keyword, sort, user?.address]);

  const loadProducts = useCallback(async (offset: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const result = await apiFetch<Product[]>("/api/getProducts", {
        method: "POST",
        body: JSON.stringify({ ...requestParams, skip: offset, take: PAGE_SIZE }),
      });
      setProducts((current) => append ? [...current, ...result] : result);
      setHasMore(result.length === PAGE_SIZE);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "商品加载失败，请稍后重试");
      if (!append) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [requestParams]);

  useEffect(() => {
    loadProducts(0);
  }, [loadProducts, refreshKey]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKeyword(searchDraft.trim());
  }

  function changeSort(nextSort: SortKey) {
    if (nextSort === "distance" && !user?.address) {
      setError("距离排序需要先登录并在个人资料中设置校内地址");
      return;
    }
    setSort(nextSort);
  }

  return (
    <div className="market-page">
      <section className="market-intro" aria-labelledby="market-title">
        <div className="market-intro-copy">
          <h1 id="market-title">校内闲置，一处找全</h1>
          <p>按位置、品类和价格快速筛选，直接联系同校卖家。</p>
        </div>
        <form className="market-search" onSubmit={submitSearch} role="search">
          <Search size={19} aria-hidden />
          <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="搜索书名、ISBN 或闲置物品" aria-label="搜索商品" />
          <button className="button primary" type="submit">搜索</button>
        </form>
        <Link className="button dark publish-shortcut" href="/sell"><Plus size={17} /> 发布闲置</Link>
      </section>

      <section className="campus-safety" aria-label="校园交易提示">
        <img src="/images/4.png" alt="广州华立学院校门" />
        <div>
          <span><ShieldCheck size={18} /> 校园交易提醒</span>
          <strong>优先选择校内公共区域，当面确认商品状态。</strong>
        </div>
        <div className="campus-rule"><MapPin size={17} /><span>地址仅用于估算校内距离</span></div>
      </section>

      <section className="browse-section" aria-labelledby="browse-title">
        <div className="browse-heading">
          <div>
            <h2 id="browse-title">正在出售</h2>
            <p>{keyword ? `“${keyword}” 的搜索结果` : "最近发布的校内闲置"}</p>
          </div>
          <button className="icon-button" type="button" onClick={() => setRefreshKey((key) => key + 1)} aria-label="刷新商品" title="刷新商品"><RefreshCw size={17} /></button>
        </div>

        <div className="browse-controls">
          <div className="category-tabs" role="tablist" aria-label="商品分类">
            {CATEGORIES.map((item) => (
              <button key={item} role="tab" aria-selected={category === item} className={category === item ? "active" : ""} type="button" onClick={() => setCategory(item)}>
                {item === "二手书" ? <BookOpenText size={15} /> : null}{item}
              </button>
            ))}
          </div>
          <label className="sort-select">
            <ArrowDownUp size={15} />
            <select value={sort} onChange={(event) => changeSort(event.target.value as SortKey)} aria-label="商品排序">
              <option value="latest">最新发布</option>
              <option value="priceAsc">价格从低到高</option>
              <option value="priceDesc">价格从高到低</option>
              <option value="distance">距离优先</option>
            </select>
            <ChevronDown size={14} aria-hidden />
          </label>
        </div>

        {error ? (
          <div className="inline-alert" role="alert"><CircleAlert size={17} /><span>{error}</span><button type="button" onClick={() => setRefreshKey((key) => key + 1)}>重试</button></div>
        ) : null}

        {loading ? (
          <div className="loading-state"><LoaderCircle className="spin" size={25} /><span>正在加载商品</span></div>
        ) : products.length > 0 ? (
          <>
            <div className="product-grid">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
            {hasMore ? (
              <div className="load-more"><button className="button secondary" type="button" onClick={() => loadProducts(products.length, true)} disabled={loadingMore}>
                {loadingMore ? <LoaderCircle className="spin" size={17} /> : <PackageOpen size={17} />}{loadingMore ? "加载中" : "加载更多"}
              </button></div>
            ) : <p className="list-end">已经看到全部商品</p>}
          </>
        ) : (
          <div className="empty-state">
            <PackageOpen size={36} />
            <h3>暂时没有符合条件的商品</h3>
            <p>换个关键词或分类试试，也可以发布第一件闲置。</p>
            <Link className="button primary" href="/sell"><Plus size={17} /> 发布闲置</Link>
          </div>
        )}
      </section>
    </div>
  );
}
