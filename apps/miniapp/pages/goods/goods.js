// pages/goods/goods.js
import { host } from '../../config.js';

Page({
  data: {
    products: [],
    isLoading: false,
    hasMore: true,

    // 搜索参数
    params: {
      keyword: '',
      category: '',
      skip: 0,
      take: 10,
      address: '',
      distanceSort: 0,
      priceSort: 0,
    },

    // 顶部排序栏状态
    activeTab: 'general', // general, price, distance, balance
    priceOrder: 0,

    // 均衡排序数据
    balancePrice: 50,
    balanceDistance: 50,

    categories: ["全部", "二手书", "家具", "电子产品", "电器", "食物", "其他"],
    categoryIndex: 0,
  },

  onLoad(options) {
    // 1. 解码 URL 参数
    const rawKeyword = options.keyword || '';
    const decodedKeyword = decodeURIComponent(rawKeyword);

    const category = options.category || '';

    this.setData({
      'params.keyword': decodedKeyword,
      'params.category': category
    });

    this.checkLogin();
    this.loadProducts(true);
  },

  checkLogin() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.address) {
      this.setData({ 'params.address': userInfo.address });
    }
  },

  loadProducts(isRefresh = false) {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    let params = { ...this.data.params };
    if (isRefresh) {
      params.skip = 0;
      this.setData({ products: [], hasMore: true });
    }

    const token = wx.getStorageSync('token');
    wx.request({
      url: `${host}/api/getProducts`,
      method: 'POST',
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      data: params,
      success: (res) => {
        if (res.statusCode === 200 && Array.isArray(res.data)) {


          const newProducts = res.data.map(p => {
            try {
              const imgs = JSON.parse(p.images);
              if (Array.isArray(imgs) && imgs.length > 0) {
                p.images = imgs[0];
              }
            } catch (e) {}
            p.viewCount = p.viewCount || 0;
            return p;
          });

          this.setData({
            products: isRefresh ? newProducts : this.data.products.concat(newProducts),
            'params.skip': params.skip + newProducts.length,
            hasMore: newProducts.length === params.take,
          });
        } else {
          this.setData({ hasMore: false });
        }
      },
      fail: () => wx.showToast({ title: '加载失败', icon: 'none' }),
      complete: () => {
        this.setData({ isLoading: false });
        if (isRefresh) wx.stopPullDownRefresh();
      }
    });
  },

  // --- Tab 切换逻辑 ---

  onTapGeneral() {
    this.setData({
      activeTab: 'general',
      priceOrder: 0,
      'params.priceSort': 0,
      'params.distanceSort': 0
    });
    this.loadProducts(true);
  },

  onTapPrice() {
    let nextOrder = this.data.priceOrder === 1 ? 2 : 1;
    this.setData({
      activeTab: 'price',
      priceOrder: nextOrder,
      'params.priceSort': nextOrder,
      'params.distanceSort': 0
    });
    this.loadProducts(true);
  },

  onTapDistance() {
    const token = wx.getStorageSync('token');
    if (!token) return wx.showToast({ title: '登录后可看距离', icon: 'none' });

    this.setData({
      activeTab: 'distance',
      priceOrder: 0,
      'params.priceSort': 0,
      'params.distanceSort': 1
    });
    this.loadProducts(true);
  },

  // 点击均衡排序
  onTapBalance() {
    const token = wx.getStorageSync('token');
    if (!token) return wx.showToast({ title: '需要登录', icon: 'none' });

    this.setData({
      activeTab: 'balance',
      priceOrder: 0,
      // 应用当前的滑块值
      'params.priceSort': this.data.balancePrice,
      'params.distanceSort': this.data.balanceDistance
    });
    this.loadProducts(true);
  },

  // 滑块拖动事件
  onBalanceChange(e) {
    const priceWeight = e.detail.value;
    const distanceWeight = 100 - priceWeight;
    this.setData({
      balancePrice: priceWeight,
      balanceDistance: distanceWeight,
      'params.priceSort': priceWeight,
      'params.distanceSort': distanceWeight,
      'params.skip': 0 // 重置分页
    });
    this.loadProducts(true); // 重新加载
  },

  onTapFilter(e) {
    const index = e.detail.value;
    const selectedCat = index == 0 ? '' : this.data.categories[index];
    this.setData({
      categoryIndex: index,
      'params.category': selectedCat
    });
    this.loadProducts(true);
  },

  onSearchInput(e) {
    this.setData({ 'params.keyword': e.detail.value });
  },

  onSearchConfirm() {
    this.loadProducts(true);
  },

  goToProductDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/product/product?id=${id}` });
  },

  onPullDownRefresh() {
    this.checkLogin();
    this.loadProducts(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadProducts();
    }
  }
});