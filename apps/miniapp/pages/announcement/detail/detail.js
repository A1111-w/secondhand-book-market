// pages/announcement/detail/detail.js
import { host } from '../../../config.js';

Page({
  data: {
    info: null,
    isLoading: true
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      this.fetchDetail(id);
    }
  },

  fetchDetail(id) {
    wx.request({
      url: `${host}/api/announcements/${id}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data.data) {
          const data = res.data.data;
          // 格式化时间
          const date = new Date(data.createdAt);
          data.timeStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`;
          this.setData({ info: data });
        } else {
          wx.showToast({ title: '公告不存在', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  }
});