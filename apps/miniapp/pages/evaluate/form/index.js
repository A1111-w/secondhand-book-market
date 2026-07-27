// pages/evaluate/form/index.js
import { host } from '../../../config.js';

Page({
  data: {
    productId: null,
    productName: '',
    productImage: '',
    rating: 5,
    content: '',
    ratingText: { 1: '非常差', 2: '差', 3: '一般', 4: '满意', 5: '非常满意' }
  },

  onLoad(options) {
    // 从上个页面传参数过来
    if (options.id) {
      this.setData({
        productId: options.id,
        productName: decodeURIComponent(options.name || ''),
        productImage: decodeURIComponent(options.img || '')
      });
    }
  },

  onRate(e) {
    this.setData({ rating: e.currentTarget.dataset.score });
  },

  onInput(e) {
    this.setData({ content: e.detail.value });
  },

  submitEvaluate() {
    wx.showLoading({ title: '提交中' });
    const token = wx.getStorageSync('token');

    wx.request({
      url: `${host}/api/user/evaluate`,
      method: 'POST',
      header: { 'Authorization': `Bearer ${token}` },
      data: {
        productId: this.data.productId,
        rating: this.data.rating,
        content: this.data.content
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.success) {
          wx.showToast({ title: '评价成功 +15', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack(); // 返回上一页
          }, 1500);
        } else {
          wx.showToast({ title: res.data.error || '失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  }
});