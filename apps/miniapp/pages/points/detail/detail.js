// pages/points/detail/detail.js
import { host } from '../../../config.js';

Page({
  data: {
    logs: [],
    currentPoints: 0
  },

  onShow() {
    // 同步更新一下当前的积分余额
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({ currentPoints: userInfo.points || 0 });
    this.fetchLogs();
  },

  fetchLogs() {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${host}/api/user/points/log`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ logs: res.data.data });
        }
      }
    });
  }
});