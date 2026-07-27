// pages/order_list/order_list.js
import { host } from '../../config.js';

Page({
  data: {
    activeTab: 0, // 0: 全部, 1: 待评价
    fullList: [], // 保存所有数据
    displayList: [], // 当前展示的数据
    isLoading: false
  },

  onLoad(options) {
    // 接受参数 filter='pending' 直接跳到待评价 Tab
    if (options.filter === 'pending') {
      this.setData({ activeTab: 1 });
    }
  },

  onShow() {
    this.fetchList();
  },

  // 切换 Tab
  switchTab(e) {
    const idx = e.currentTarget.dataset.idx;
    this.setData({ activeTab: idx });
    this.filterList();
  },

  // 获取数据
  fetchList() {
    this.setData({ isLoading: true });
    const token = wx.getStorageSync('token');

    wx.request({
      url: `${host}/api/user/unlocked`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200) {
          const rawList = res.data.data || [];

          // 处理图片 JSON
          const processed = rawList.map(item => {
            let cover = item.product.images;
            try {
              const arr = JSON.parse(cover);
              if (Array.isArray(arr) && arr.length > 0) cover = arr[0];
            } catch(e) {}
            item.product.images = cover;
            return item;
          });

          this.setData({ fullList: processed });
          this.filterList(); // 数据回来后立即筛选
        }
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  },

  // 本地筛选数据 (避免频繁请求后端)
  filterList() {
    const { activeTab, fullList } = this.data;
    let list = [];

    if (activeTab === 0) {
      list = fullList; // 全部
    } else {
      list = fullList.filter(item => item.status === 0); // 待评价
    }

    this.setData({ displayList: list });
  },

  // 复制
  copyContact(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.contact });
  },

  // 跳详情
  goToDetail(e) {
    wx.navigateTo({ url: `/pages/product/product?id=${e.currentTarget.dataset.id}` });
  },

  // 跳评价
  goToEvaluate(e) {
    const { id, name, img, seller } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/evaluate/form/index?id=${id}&name=${encodeURIComponent(name)}&img=${encodeURIComponent(img)}&seller=${encodeURIComponent(seller)}`
    });
  }
});