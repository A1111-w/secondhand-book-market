// pages/homepage/homepage.js
import { host } from '../../config.js';
const app = getApp();
Page({
  data: {
    swiperList: [],
    products: [],
    isLoading: false,
    hasMore: true,

    params: {
      keyword: '',
      category: '',
      skip: 0,
      take: 10,
      address: '',
      distanceSort: 0,
      priceSort: 0,
    },

    categories: ["全部", "家具", "电子产品", "电器", "食物", "二手书", "其他"],
    categoryIndex: 0,

    sortOptions: ["默认排序", "价格升序", "价格降序", "距离优先", "均衡排序"],
    sortIndex: 0,

    // 均衡排序比例
    balancePrice: 50,
    balanceDistance: 50,

    announcementList: [],
  },

  /**
   * 页面每次显示时都会触发，是处理数据刷新的最佳位置
   */
  onShow() {
    this.checkLogin(); // 每次显示页面时，都检查登录状态并更新地址
    if (this.data.products.length === 0) { // 如果是首次进入页面，则加载数据
      this.getSwiperList();
      this.loadProducts(true);
    }
    app.updateUnreadCount();
    this.getTabBar().onChange(0);
    this.fetchAnnouncements();

  },
  fetchAnnouncements() {
    wx.request({
      url: `${host}/api/announcements`,
      method: 'GET',
      success: (res) => {

        if (res.statusCode === 200 && res.data && res.data.data) {
          this.setData({
            announcementList: res.data.data
          });
        }
      },
      fail: (err) => {
        console.error('获取公告失败', err);

         this.setData({ announcementList: [{ title: "暂无最新公告" }] });
      }
    });
  },

  goToAnnouncement() {
    wx.navigateTo({
      url: '/pages/announcement/list/list'
    });
  },

  getSwiperList() {
    wx.request({
      url: `${host}/api/carousel`,
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          this.setData({ swiperList: res.data.data });
        }
      }
    });
    app.updateUnreadCount();
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
            } catch (e) {
              // 解析失败说明是旧数据(普通字符串)，保持原样即可
            }
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

  checkLogin() {
    const token = wx.getStorageSync('token');
    if (!token) {
      // 仅在需要时提示，避免干扰
      // wx.showToast({ title: '登录后可体验完整功能', icon: 'none' });
      return false;
    }
    const userInfo = wx.getStorageSync('userInfo');
    // 关键：更新地址到 params
    this.setData({ 'params.address': userInfo.address || '' });
    return true;
  },



  onScanCode() {
    const token = wx.getStorageSync('token');
    if (!token) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
    }

    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['barCode'],
      success(res) {
        const isbn = res.result;
        wx.showToast({ title: `已识别: ${isbn}`, icon: 'none' });
        wx.navigateTo({
          url: `/pages/goods/goods?keyword=${isbn}`
        });
      },
      fail(err) {
        console.error('扫码失败', err);
      }
    });
  },
  // onSearchInput(e) {
  //   this.setData({
  //     'params.keyword': e.detail.value
  //   });
  // },废弃
  // onSearch(e) {
  //   if (e && e.detail && typeof e.detail.value !== 'undefined') {
  //      this.setData({
  //       'params.keyword': e.detail.value
  //     });
  //   }
  //   // 重置分页并加载数据
  //   this.setData({
  //     'params.skip': 0
  //   });
  //   this.loadProducts(true);
  // },

  onCategoryChange(e) {
    const index = e.detail.value;
    const category = index > 0 ? this.data.categories[index] : '';
    this.setData({
      categoryIndex: index,
      'params.category': category,
      'params.skip': 0
    });
    this.loadProducts(true);
  },

  onSortChange(e) {
    const index = parseInt(e.detail.value);

    // 所有需要地址的排序，都前置检查登录
    if (index >= 3) { // 距离优先和均衡排序都需要地址
      if (!this.checkLogin()) {
        wx.showToast({ title: '请先登录以使用距离排序', icon: 'none' });
        // 恢复 picker 为默认选项
        this.setData({ sortIndex: 0 });
        return;
      }
    }

    this.setData({ sortIndex: index });

    let priceSort = 0, distanceSort = 0;
    switch(index) {
      case 1: priceSort = 1; break; // 价格升序
      case 2: priceSort = 2; break; // 价格降序
      case 3: distanceSort = 1; break; // 距离优先（升序）
      case 4: // 均衡排序
        priceSort = this.data.balancePrice;
        distanceSort = this.data.balanceDistance;
        break;
    }

    if (this.data.params.priceSort !== priceSort || this.data.params.distanceSort !== distanceSort) {
      this.setData({
        'params.priceSort': priceSort,
        'params.distanceSort': distanceSort,
        'params.skip': 0
      });
      this.loadProducts(true);
    }
  },

  onBalanceChange(e) {
    const priceWeight = e.detail.value;
    const distanceWeight = 100 - priceWeight;
    this.setData({
      balancePrice: priceWeight,
      balanceDistance: distanceWeight,
      'params.priceSort': priceWeight,
      'params.distanceSort': distanceWeight,
      'params.skip': 0
    });
    this.loadProducts(true);
  },

  onPullDownRefresh() {
    // 修正：先从缓存获取最新地址
    this.checkLogin();
    this.loadProducts(true);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadProducts();
    }
  },

  goToSearchPage() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  },
  goToProductDetail(e) {
    const productId = e.currentTarget.dataset.id;
    console.log('点击商品，ID:', productId);
    if (!productId) {
      wx.showToast({ title: '无法获取商品ID', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/product/product?id=${productId}`
    });
  },
});