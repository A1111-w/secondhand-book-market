// pages/announcement/list/list.js
import { host } from '../../../config.js';

Page({
  data: {
    list: [],
    isLoading: true
  },

  onLoad() {
    this.fetchList();
  },

  fetchList() {
    this.setData({ isLoading: true });
    wx.request({
      url: `${host}/api/announcements`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data.data) {
          // 格式化时间
          const formattedList = res.data.data.map(item => {
            const date = new Date(item.createdAt);
            item.dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            return item;
          });
          this.setData({ list: formattedList });
        }
      },
      complete: () => {
        this.setData({ isLoading: false });
        wx.stopPullDownRefresh();
      }
    });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/announcement/detail/detail?id=${id}`
    });
  },

  onPullDownRefresh() {
    this.fetchList();
  }
});