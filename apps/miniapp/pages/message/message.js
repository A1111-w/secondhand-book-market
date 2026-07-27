// pages/message/message.js
import { host } from '../../config.js'; // 按照你的要求引入 host

Page({
  data: {
    isLoading: true,
    conversations: [] // 所有的会话列表
  },

  /**
   * 页面显示时触发
   * 使用 onShow 可以保证每次切换回消息页面时都刷新
   */
  onShow() {
    this.checkLoginAndFetch();
    this.getTabBar().onChange(2);
    this.startPolling();
  },
  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
  },
  startPolling() {
    // 每 5 秒静默刷新一次列表和红点
    this.pollingTimer = setInterval(() => {
      const token = wx.getStorageSync('token');
      if (token) {
        this.getConversations(token, true); // true 表示静默模式
      }
    }, 5000);
  },
  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.checkLoginAndFetch();
  },

  /**
   * 检查登录状态并获取数据
   */
  checkLoginAndFetch() {
    const token = wx.getStorageSync('token');
    if (token) {
      console.log('MessagePage: 检测到 token, 开始获取会话...');
      this.getConversations(token);
    } else {
      console.log('MessagePage: 未检测到 token, 开始自动登录...');
      this.autoLogin();
    }
  },

  /**
   * 自动登录函数
   * (逻辑与 my/my.js 保持一致)
   */
  autoLogin() {
    // 确保显示加载中
    this.setData({ isLoading: true });

    wx.login({
      success: (res) => {
        if (!res.code) {
          console.error('wx.login 获取 code 失败:', res);
          wx.showToast({ title: '登录失败', icon: 'none' });
          this.setData({ isLoading: false });
          wx.stopPullDownRefresh();
          return;
        }

        // 请求后端的微信登录接口
        wx.request({
          url: `${host}/api/user/wechatlogin`,
          method: 'POST',
          data: { code: res.code },
          success: (resp) => {
            console.log('微信登录接口返回:', resp);
            if (resp.statusCode === 200 && resp.data?.user && resp.data?.token) {
              const { user, token } = resp.data;
              // 存储新的登录态
              wx.setStorageSync('userInfo', user);
              wx.setStorageSync('token', token);

              console.log('MessagePage: 自动登录成功, 用新 token 获取会话...');
              // 自动登录成功后，立即获取会话
              this.getConversations(token);
            } else {
              console.warn('自动登录接口返回异常:', resp.data);
              wx.showToast({ title: '自动登录失败', icon: 'none' });
              this.setData({ isLoading: false, conversations: [] });
              wx.stopPullDownRefresh();
            }
          },
          fail: (err) => {
            console.error('请求后端登录接口失败:', err);
            wx.showToast({ title: '登录请求失败', icon: 'none' });
            this.setData({ isLoading: false, conversations: [] });
            wx.stopPullDownRefresh();
          },
        });
      },
      fail: (err) => {
        console.error('wx.login 调用失败:', err);
        wx.showToast({ title: '微信登录调用失败', icon: 'none' });
        this.setData({ isLoading: false, conversations: [] });
        wx.stopPullDownRefresh();
      },
    });
  },

  /**
   * 获取会话列表
   */
  getConversations(token, isSilent = false) {
    // 如果是静默加载，绝不要把 isLoading 设为 true，否则会闪烁！
    if (!isSilent) {
      this.setData({ isLoading: true });
    }

    wx.request({
      url: `${host}/api/messages/conversations`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.conversations)) {
          const convos = res.data.conversations;

          // 1. 计算红点 (逻辑不变)
          let totalUnread = 0;
          convos.forEach(c => { totalUnread += (c.unreadCount || 0); });

          // 2. 更新 TabBar (逻辑不变)
          const tabBar = this.getTabBar();
          if (tabBar) {
            tabBar.setData({
              'tabList[2].badge': totalUnread > 0 ? totalUnread : 0
            });
          }

          // 3. 格式化列表 (逻辑不变)
          const formattedConvos = convos.map(convo => {
            return {
              ...convo,
              lastMessageTime: this.formatDisplayTime(convo.lastMessageTime)
            };
          });

          // 更新数据
          this.setData({
            conversations: formattedConvos,
            ...(isSilent ? {} : { isLoading: false })
          });
        }
      },
      fail: (err) => {
        // 静默模式下出错，不要弹窗，不要影响用户
        if (!isSilent) {
             console.error(err);
             this.setData({ isLoading: false });
        }
      },
      complete: () => {
        // 只有手动下拉刷新才停止动画
        if (!isSilent) wx.stopPullDownRefresh();
      }
    });
  },

  /**
   * 格式化显示时间
   * @param {string} dateString - 后端返回的 ISO 8601 时间字符串
   */
  formatDisplayTime(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();

      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      //确保比较的是时间戳
      const dateTimestamp = date.getTime();
      const todayTimestamp = today.getTime();
      const yesterdayTimestamp = yesterday.getTime();

      if (dateTimestamp >= todayTimestamp) {
        // 今天: "14:30"
        return date.toTimeString().substring(0, 5);
      } else if (dateTimestamp >= yesterdayTimestamp) {
        // 昨天
        return '昨天';
      } else {
        // 昨天之前: "10/26"
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    } catch (e) {
      console.error('时间格式化错误', e);
      return '...';
    }
  },

  /**
   * 点击会话，跳转到聊天详情页
   */
  goToChat(e) {
    const { userId, username, avatar } = e.currentTarget.dataset;
    if (!userId) {
      console.error('goToChat 缺少 userId', e.currentTarget.dataset);
      return;
    }

    // 假设你的聊天窗口页面路径为 /pages/chat/chat
    wx.navigateTo({
      url: `/pages/chat/chat?toUserId=${userId}&username=${username}&avatar=${encodeURIComponent(avatar || '')}`
    });
  },
})