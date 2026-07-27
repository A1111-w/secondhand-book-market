// pages/history/history.js
import { host } from '../../config.js';

Page({
  data: {
    keyword: '',
    groupedHistory: [], // 分组后的数据
    isLoading: false,
    isEmpty: false
  },

  onShow() {
    this.fetchHistory();
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  // 搜索确认
  onSearch() {
    this.fetchHistory();
  },

  // 清空搜索
  onClear() {
    this.setData({ keyword: '' }, () => {
      this.fetchHistory();
    });
  },

  fetchHistory() {
    this.setData({ isLoading: true });
    const token = wx.getStorageSync('token');
    if (!token) return;

    wx.request({
      url: `${host}/api/history?keyword=${encodeURIComponent(this.data.keyword)}`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200) {
          let list = res.data.data || [];
          list = list.map(item => {
            if (item.product && item.product.images) {
              try {
                const imgs = JSON.parse(item.product.images);
                if (Array.isArray(imgs) && imgs.length > 0) {
                  item.product.images = imgs[0];
                }
              } catch (e) {}
            }
            return item;
          });

          this.groupDataByDate(list);
        }
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  },

  // 按日期分组
  groupDataByDate(list) {
    if (list.length === 0) {
      this.setData({ groupedHistory: [], isEmpty: true });
      return;
    }

    const groups = [];
    let currentDate = '';
    let currentGroup = null;

    list.forEach(item => {
      // 格式化时间： "2025-11-18T..." -> "11月18日"
      const dateObj = new Date(item.viewedAt);
      const dateStr = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

      if (dateStr !== currentDate) {
        // 遇到新日期，开启新组
        currentDate = dateStr;
        currentGroup = {
          date: dateStr,
          items: []
        };
        groups.push(currentGroup);
      }

      // 把商品塞进当前组
      currentGroup.items.push(item.product);
    });

    this.setData({ groupedHistory: groups, isEmpty: false });
  },

  // 点击跳转详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/product/product?id=${id}` });
  }
});