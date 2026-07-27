// pages/gr/gr.js
import { host } from '../../config.js';
const app = getApp();

Page({
  data: {
    // userInfo 为 null 表示未登录
    userInfo: null,
    // 默认头像
    defaultAvatar: `${host}/uploads/avatar_3_1761580059654.jpg`,
    isLoggingIn: false
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');

    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().onChange(3);
    }

    if (userInfo && token) {
      this.setData({ userInfo: userInfo });
    } else {
      this.setData({ userInfo: null });
    }

    app.updateUnreadCount();
  },

  /**
   * 【新增】跳转到订单列表
   * WXML 中通过 data-type 传递参数 (0=全部, 1=待付款...)
   */
  goToOrders(e) {
    const type = e.currentTarget.dataset.type || '0';

    // 检查登录
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/order_list/order_list?type=${type}`
    });
  },

  handleLogin() {
    if (this.data.isLoggingIn) return;
    this.setData({ isLoggingIn: true });
    wx.showLoading({ title: '登录中...' });

    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          this.handleLoginFail('未获取到凭证');
          return;
        }

        wx.request({
          url: `${host}/api/user/wechatlogin`,
          method: 'POST',
          data: { code: loginRes.code },
          success: (apiRes) => {
            wx.hideLoading();
            if (apiRes.statusCode === 200 && apiRes.data.user && apiRes.data.token) {
              this.handleLoginSuccess(apiRes.data.user, apiRes.data.token);
            } else {
              this.handleLoginFail(apiRes.data.error || '登录失败');
            }
          },
          fail: (err) => {
            console.error('后端请求失败', err);
            this.handleLoginFail('网络请求失败');
          }
        });
      },
      fail: (err) => {
        console.error('wx.login 失败', err);
        this.handleLoginFail('微信连接失败');
      }
    });
  },

  handleLoginSuccess(user, token) {
    wx.setStorageSync('userInfo', user);
    wx.setStorageSync('token', token);

    this.setData({
      userInfo: user,
      isLoggingIn: false
    });

    wx.showToast({ title: '登录成功', icon: 'success' });

    // 登录后立即刷新红点
    app.updateUnreadCount();

    if (!user.username || user.username.startsWith('wx_') || user.username.startsWith('同学_')) {
      wx.showModal({
        title: '欢迎新同学',
        content: '去完善一下头像和昵称吧，方便大家认识你~',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            this.navigateTo({ currentTarget: { dataset: { url: '/pages/my/my' } } });
          }
        }
      });
    }
  },

  handleLoginFail(msg) {
    wx.hideLoading();
    this.setData({ isLoggingIn: false });
    wx.showToast({ title: msg, icon: 'none' });
  },

  navigateTo(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;

    // 定义所有的 Tab 页面路径
    const tabPages = [
      '/pages/homepage/homepage',
      '/pages/my_products/my_products',
      '/pages/message/message',
      '/pages/gr/gr'
    ];

    // 如果是 Tab 页面，用 switchTab
    if (tabPages.includes(url)) {
      wx.switchTab({
        url: url
      });
    } else {
      wx.navigateTo({
        url: url,
        fail: (err) => {
          console.error(`跳转失败: ${url}`, err);
          wx.showToast({ title: '功能开发中', icon: 'none' });
        }
      });
    }
  },

  gotoProfile() {
    wx.navigateTo({
      url: '/pages/my/my'
    });
  },

  refreshUserInfo() {
    // 1. 获取微信 code
    wx.login({
      success: (res) => {
        if (!res.code) {
          wx.stopPullDownRefresh();
          return;
        }

        // 2. 请求后端 wechatlogin 接口 (这个接口现在会返回最新的 role)
        wx.request({
          url: `${host}/api/user/wechatlogin`,
          method: 'POST',
          data: { code: res.code },
          success: (resp) => {
            if (resp.statusCode === 200 && resp.data.user) {
              const newUserInfo = resp.data.user;
              const newToken = resp.data.token;

              console.log('用户信息已更新:', newUserInfo);

              // 3. 更新本地缓存
              wx.setStorageSync('userInfo', newUserInfo);
              wx.setStorageSync('token', newToken);

              // 4. 更新页面数据
              this.setData({
                userInfo: newUserInfo
              });

              // 顺便更新一下 TabBar 选中状态
              if (typeof this.getTabBar === 'function' && this.getTabBar()) {
                this.getTabBar().onChange(3);
              }

              // 顺便刷新红点
              app.updateUnreadCount();

              wx.showToast({ title: '状态已更新', icon: 'none' });
            }
          },
          fail: () => {
            wx.showToast({ title: '网络错误', icon: 'none' });
          },
          complete: () => {
            // 5. 无论成功失败，都要停止下拉动画
            wx.stopPullDownRefresh();
          }
        });
      },
      fail: () => {
        wx.stopPullDownRefresh();
        wx.showToast({ title: '微信服务异常', icon: 'none' });
      }
    });
  },

  onPullDownRefresh() {
    this.refreshUserInfo();
  },
  checkLogin() {
    if (!this.data.userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return false;
    }
    return true;
  },

  goToPointDetail() {
    if (!this.checkLogin()) return;
    wx.navigateTo({ url: '/pages/points/detail/detail' });
  },

  goToEarnPoints() {
    if (!this.checkLogin()) return;
    wx.navigateTo({ url: '/pages/points/earn/earn' });
  },

  goToUnlockedList() {
    const token = wx.getStorageSync('token');
    if (!token) return wx.showToast({ title: '请先登录', icon: 'none' });
    wx.navigateTo({ url: '/pages/order_list/order_list?mode=unlocked' });
  },
  goToAuth() {
    if (!this.data.userInfo) {
      this.handleLogin();
      return;
    }
    wx.navigateTo({
      url: '/pages/auth/auth'
    });
  },
  goToPaperSite() {
    wx.navigateTo({ url: '/pages/paper-site/index' });
  },
  onReachBottom() {},
  onShareAppMessage() {}
});
