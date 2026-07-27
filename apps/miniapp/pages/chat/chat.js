// pages/chat/chat.js
import { host } from '../../config.js';
const app = getApp(); // 引入 app 实例

Page({
  data: {
    messageList: [],
    inputValue: '',
    token: null,
    myUserId: null,
    myAvatar: '',
    otherUserId: null,
    otherUserAvatar: '',
    isLoading: true,
    scrollTop: 999999,
    showMorePanel: false,
    showProductPicker: false, // 控制商品弹窗
    targetProduct: null,      // 猜你想发的数据
  },

  onLoad(options) {
    const otherUserId = parseInt(options.toUserId, 10);
    const otherUsername = options.username || '聊天';

    // 1. 处理对方头像
    let otherAvatar = `${host}/uploads/avatar_3_1761580059654.jpg`;
    if (options.avatar && options.avatar !== 'undefined' && options.avatar !== 'null') {
      otherAvatar = decodeURIComponent(options.avatar);
    }

    wx.setNavigationBarTitle({ title: otherUsername });

    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({
      token: token,
      myUserId: userInfo.id,
      myAvatar: userInfo.avatar || `${host}/uploads/avatar_3_1761580059654.jpg`,
      otherUserId: otherUserId,
      otherUserAvatar: otherAvatar
    });

    // 2. 处理“猜你想发”
    if (options.product) {
      // console.log('接收到商品参数:', options.product);
      try {
        const productInfo = JSON.parse(decodeURIComponent(options.product));
        this.setData({ targetProduct: productInfo });
        this.autoHideTimer = setTimeout(() => {
          if (this.data.targetProduct) {
            this.setData({ targetProduct: null });
          }
        }, 5000);
      } catch (e) {
        console.error('解析商品信息失败', e);
      }
    }

    this.loadMessages();
  },

  // --- 核心功能函数 ---

  // 点击悬浮条发送商品
  onSendTargetProduct() {
    if (!this.data.targetProduct) return;
    this.sendMessage(JSON.stringify(this.data.targetProduct), 2);
    this.setData({ targetProduct: null });
  },

  // 打开底部更多面板
  onToggleMore() {
    this.setData({
      showMorePanel: !this.data.showMorePanel
    });
    if (!this.data.showMorePanel) {
      this.scrollToBottom();
    }
  },

  onInputFocus() {
    this.setData({ showMorePanel: false });
  },

  // 发送文本
  onSend() {
    const content = this.data.inputValue.trim();
    if (!content) return;
    this.sendMessage(content, 0);
  },

  // 统一发送逻辑
  sendMessage(content, type = 0) {
    // 1. 乐观 UI (先显示在界面上)
    const tempMessage = {
      id: `temp_${Date.now()}`,
      fromUserId: this.data.myUserId,
      toUserId: this.data.otherUserId,
      content: content,
      type: type,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    // 如果是商品类型，前端展示需要是对象
    if (type === 2 && typeof content === 'string') {
        try { tempMessage.content = JSON.parse(content); } catch(e){}
    }

    const updatedList = this.data.messageList.concat(tempMessage);
    this.setData({
      messageList: updatedList,
      inputValue: '',
      showMorePanel: false
    });
    this.scrollToBottom();

    // 2. 获取最新 Token
    const latestToken = wx.getStorageSync('token');

    // 3. 处理发送给后端的数据
    // 这里的 content 必须是字符串。如果是商品(type=2)，传入时应该是 JSON 字符串，如果不是，强制转
    let contentToSend = content;
    if (type === 2 && typeof content !== 'string') {
        contentToSend = JSON.stringify(content);
    }

    // 4. 后端请求
    wx.request({
      url: `${host}/api/messages/${this.data.otherUserId}`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${latestToken}`, // 使用最新 Token
      },
      data: {
        content: contentToSend,
        type: type
      },
      success: (res) => {
        if (res.statusCode !== 201) { // 后端返回 201 Created
          console.error('发送失败:', res);
          wx.showToast({ title: '发送失败', icon: 'none' });
        } else {
            // 发送成功，静默刷新一下列表以获取正确的 ID 和时间
             this.loadMessages(true);
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  // 选择图片并发送
  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        this.uploadAndSendImage(tempPath);
      }
    });
  },

  uploadAndSendImage(filePath) {
    wx.showLoading({ title: '发送中...' });
    wx.uploadFile({
      url: `${host}/api/addProduct/uploadimage`,
      filePath: filePath,
      name: 'file',
      formData: { 'user': String(this.data.myUserId) },
      success: (uploadRes) => {
        wx.hideLoading();
        if (uploadRes.statusCode === 200) {
          const data = JSON.parse(uploadRes.data);
          if (data.url) {
            this.sendMessage(data.url, 1); // Type 1 = 图片
          }
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },

  // --- 弹窗相关逻辑 (修复报错的核心) ---

  // 点击 + 号里的 "对方商品" -> 打开弹窗
  onSelectProduct() {
    this.setData({
      showMorePanel: false,
      showProductPicker: true // 打开组件
    });
  },

  // 组件触发：关闭
  onClosePicker() {
    this.setData({ showProductPicker: false });
  },

  // 组件触发：发送
  onPickerSend(e) {
    const product = e.detail.product;
    // 构建发送对象
    const productCard = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images
    };
    // 发送消息
    this.sendMessage(JSON.stringify(productCard), 2);
  },
  // -------------------------------

  // 预览图片
  previewChatImage(e) {
    const src = e.currentTarget.dataset.src;
    wx.previewImage({ current: src, urls: [src] });
  },

  // 轮询相关
  onShow() { this.startPolling(); },
  onHide() { this.stopPolling(); },
  onUnload() {
    this.stopPolling();
    if (this.autoHideTimer) clearTimeout(this.autoHideTimer);
   },

  startPolling() {
    this.pollingTimer = setInterval(() => {
      this.loadMessages(true);
    }, 3000);
  },
  stopPolling() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  },

  loadMessages(isSilent = false) {
    if (!isSilent) this.setData({ isLoading: true });

    wx.request({
      url: `${host}/api/messages/${this.data.otherUserId}`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${this.data.token}` },
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.messages)) {
          const newMessages = res.data.messages;
          // 解析 JSON 消息
          const parsedMessages = newMessages.map(msg => {
            if (msg.type === 2 && typeof msg.content === 'string') {
              try { msg.content = JSON.parse(msg.content); } catch (e) {}
            }
            return msg;
          });

          const oldLength = this.data.messageList.length;
          this.setData({
            messageList: parsedMessages,
            isLoading: false
          });

          if (!isSilent || newMessages.length > oldLength) {
            this.scrollToBottom();
          }
        }
      },
      fail: () => { if(!isSilent) this.setData({ isLoading: false }); },
      complete: () => { if (!isSilent) wx.stopPullDownRefresh(); }
    });
  },

  onPullDownRefresh() { this.loadMessages(); },

  scrollToBottom() {
    setTimeout(() => { this.setData({ scrollTop: 999999 }); }, 100);
  }
});
