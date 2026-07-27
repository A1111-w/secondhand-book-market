// pages/search/search.js
import { host } from '../../config.js';

Page({
  data: {
    keyword: '',
    historyList: [],
    inputFocus: false,
    hotKeywords: [], // 热搜词
    hotProducts: []  // 热搜商品榜
  },

  onShow() {
    // 1. 加载历史记录
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ historyList: history });

    // 2. 加载热搜词 (3天数据)
    this.fetchHotKeywords();

    // 3. 加载热搜榜 (1个月数据)
    this.fetchHotProducts();

    // 自动聚焦
    setTimeout(() => {
      this.setData({ inputFocus: true });
    }, 100);
  },

  onHide() {
    this.setData({ inputFocus: false });
  },

  // --- 接口请求 ---

  fetchHotKeywords() {
    wx.request({
      url: `${host}/api/search/hot`,
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ hotKeywords: res.data.data || [] });
        }
      }
    });
  },

  fetchHotProducts() {
    wx.request({
      url: `${host}/api/products/hot`,
      success: (res) => {
        if (res.statusCode === 200 && Array.isArray(res.data.data)) {

          const hotList = res.data.data.map(p => {
            try {

              const imgs = JSON.parse(p.images);

              if (Array.isArray(imgs) && imgs.length > 0) {
                p.images = imgs[0];
              }
            } catch (e) {
            }
            return p;
          });

          this.setData({ hotProducts: hotList });
        }
      }
    });
  },

  // --- 交互逻辑 ---

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onClearInput() {
    this.setData({ keyword: '' });
  },

  // 执行搜索
  onSearch() {
    const key = this.data.keyword.trim();
    if (!key) return;

    this.saveHistory(key);
    this.doSearch(key);
    this.recordSearchKeyword(key); // 记录到后台
  },

  // 点击标签（历史记录 或 热搜词）
  onTagClick(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ keyword: key });

    this.saveHistory(key);
    this.doSearch(key);
    this.recordSearchKeyword(key); // 记录到后台
  },

  // 点击热榜商品 -> 跳转详情
  goToProductDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/product/product?id=${id}` });
  },

  // 跳转到结果页
  doSearch(key) {
    wx.navigateTo({
      url: `/pages/goods/goods?keyword=${encodeURIComponent(key)}`
    });
  },

  // 记录搜索词到后台
  recordSearchKeyword(key) {
    wx.request({
      url: `${host}/api/search/record`,
      method: 'POST',
      data: { keyword: key }
    });
  },

  // 本地历史记录逻辑
  saveHistory(key) {
    let list = this.data.historyList;
    const index = list.indexOf(key);
    if (index > -1) list.splice(index, 1);
    list.unshift(key);
    if (list.length > 10) list = list.slice(0, 10);

    this.setData({ historyList: list });
    wx.setStorageSync('searchHistory', list);
  },

  onClearHistory() {
    wx.showModal({
      title: '提示',
      content: '确认清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ historyList: [] });
          wx.removeStorageSync('searchHistory');
        }
      }
    });
  }
});