// pages/points/earn/earn.js
import { host } from '../../../config.js';

Page({
  data: {
    isIOS: false,
    isLoading: false,
    currentPoints: 0, // 【新增】当前积分，用于顶部展示

    rechargeOptions: [
      { price: 1, points: 100 },
      { price: 5, points: 600, tag: '热销' }, // 加个 tag 字段演示
      { price: 10, points: 1500, tag: '超值' }
    ]
  },

  onLoad() {
    let platform = '';

    try {
      // 1. 优先使用新标准接口
      if (wx.getDeviceInfo) {
        const info = wx.getDeviceInfo();
        platform = info.platform;
      }
      // 2. 如果不支持新接口，回退到旧接口
      else {
        const info = wx.getSystemInfoSync();
        platform = info.platform;
      }
    } catch (e) {
      console.error('获取设备信息失败', e);
    }

    // 3. 执行业务逻辑
    // 注意：在开发者工具中 platform 通常返回 'devtools'，真机 iPhone 返回 'ios'
    if (platform === 'ios') {
      this.setData({ isIOS: true });
    }
  },

  onShow() {
    const cacheUser = wx.getStorageSync('userInfo') || {};
    this.setData({ currentPoints: cacheUser.points || 0 });
    this.fetchLatestPoints();
  },

  fetchLatestPoints() {
    const token = wx.getStorageSync('token');
    if (!token) return;

    wx.request({

      url: `${host}/api/user/me`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const remoteUser = res.data; // 假设返回的是 user 对象

          // 3. 更新页面显示
          this.setData({ currentPoints: remoteUser.points });


          const localUser = wx.getStorageSync('userInfo') || {};
          localUser.points = remoteUser.points;
          wx.setStorageSync('userInfo', localUser);
        }
      }
    });
  },

  // --- 充值逻辑 ---
  handleRecharge(e) {
    const { price, points } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认充值',
      content: `支付 ¥${price} 购买 ${points} 积分？`,
      success: (res) => {
        if (res.confirm) {
          this.doRechargeRequest(price, points);
        }
      }
    });
  },

  doRechargeRequest(price, points) {
    wx.showLoading({ title: '支付中...' });
    const token = wx.getStorageSync('token');

    wx.request({
      url: `${host}/api/user/recharge`,
      method: 'POST',
      header: { 'Authorization': `Bearer ${token}` },
      data: { amount: price, points: points },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data.success) {
          wx.showToast({ title: '充值成功', icon: 'success' });
          this.updateLocalPoints(points);
        } else {
          wx.showToast({ title: '充值失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  // --- 观看视频 ---
  handleWatchVideo() {
    wx.showLoading({ title: '加载广告...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '恭喜',
        content: '广告观看完成，获得 50 积分！',
        showCancel: false,
        success: () => {
          this.sendAdReward();
        }
      });
    }, 1500);
  },

  sendAdReward() {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${host}/api/user/ad-reward`,
      method: 'POST',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        // 假设后端返回 success: true
        this.updateLocalPoints(50);
        this.onShow(); // 刷新界面显示
      }
    });
  },

  // --- 去评价 ---
  goToEvaluate() {
    wx.navigateTo({
      url: '/pages/order_list/order_list?type=4'
    });
  },

  updateLocalPoints(addPoints) {
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.points = (userInfo.points || 0) + addPoints;
    wx.setStorageSync('userInfo', userInfo);
    this.setData({ currentPoints: userInfo.points });
  }
});