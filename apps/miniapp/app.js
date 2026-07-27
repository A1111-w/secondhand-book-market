// app.js
import { host } from './config.js';
App({

  onShow() {
    // 每次切回来也刷新一次红点
    this.updateUnreadCount();
  },
  globalData: {
    userInfo: null,
    token: null,
  },
  updateUnreadCount() {
    const token = wx.getStorageSync('token');
    if (!token) return;

    wx.request({
      // 确认这里用的是轻量级接口 unread-count
      url: `${host}/api/messages/unread-count`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        // 打印一下结果，看看是不是通的
        //console.log('📡 红点接口返回:', res.data);

        if (res.statusCode === 200 && res.data) {
          const totalUnread = res.data.count || 0;

          const pages = getCurrentPages();
          const curPage = pages[pages.length - 1];
          if (curPage && typeof curPage.getTabBar === 'function') {
            const tabBar = curPage.getTabBar();
            if (tabBar) {
              const currentBadge = tabBar.data.tabList[2].badge;
              if (currentBadge !== totalUnread) {
                // console.log(`🔔 更新红点: ${currentBadge} -> ${totalUnread}`);
                 tabBar.setData({
                   'tabList[2].badge': totalUnread > 0 ? totalUnread : 0
                 });
              } else {
                 //console.log('🔕 红点数未变，不更新UI');
              }
            }
          }
        }
      },
      fail: (err) => {
        console.error('❌ 请求失败:', err);
      }
    });
  },

  onLaunch() {


    // 尝试读取本地缓存
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');

    if (userInfo && token) {
      // 已登录过，直接赋值
      this.globalData.userInfo = userInfo;
      this.globalData.token = token;
      console.log('App.js onLaunch: 检测到缓存, 自动登录。', userInfo);
    } else {
      console.log('App.js onLaunch: 未检测到缓存, 等待用户登录。');
    }
  },
  // 下面为测试功能函数记得删了
  onShow() {
    //console.log(' App onShow: 应用启动/切前台');
    // 1. 立即查一次
    this.updateUnreadCount();
    // 2. 启动轮询
    this.startGlobalPolling();
  },

  onHide() {
    //console.log('⚪ App onHide: 应用切后台，停止轮询');
    this.stopGlobalPolling();
  },

  startGlobalPolling() {
    this.stopGlobalPolling(); // 防止重复启动

    //console.log(' 轮询定时器已启动 (每10秒一次)...');

    this.globalPollingTimer = setInterval(() => {
     // console.log('10秒到了，准备检查新消息...');
      const token = wx.getStorageSync('token');

      if (token) {
        //console.log('有Token，发起请求...');
        this.updateUnreadCount();
      } else {
        //console.log(' 无Token，跳过请求');
      }
    }, 10000);
  },

  stopGlobalPolling() {
    if (this.globalPollingTimer) {
      clearInterval(this.globalPollingTimer);
      this.globalPollingTimer = null;
      //console.log(' 轮询定时器已停止');
    }
  }

});
