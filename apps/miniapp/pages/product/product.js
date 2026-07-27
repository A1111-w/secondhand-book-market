// pages/product/product.js
import { host } from '../../config.js';

const ADDRESS_LIST = [
  "本科综合楼","行政楼","专L17","专L18","专G1","专G2","专G3",
  "专G4","专A1","专A2","专A3","专A4","本C1","本C2","本C3","本C4",
  "专L16","专L13","专L12","专L11","专L10","专L9","专L8","专L7","专L4","专L3",
  "专L2","专L1","本B9","本B4","本B3","本B2","本B1","本D1","本C8","本C7",
  "本C6","本C5","专L5","专L6","专L15","专D2","专D6","专D5"
];

Page({
  data: {
    product: null,
    isLoading: true,
    fullRangeCount: ADDRESS_LIST.length,
    isRangeExpanded: false,

    // --- 新增数据 ---
    isUserLoggedIn: false, // 是否登录
    hasUserAddress: false, // (保留)
    myUserId: null,        // 当前登录者的ID
    isMyProduct: false,    // 是否是自己的商品
    isFavorited: false,
  },

  // 折叠/展开送货范围
  toggleRange() {
    this.setData({
      isRangeExpanded: !this.data.isRangeExpanded
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 1. 获取 URL 传来的 id
    const productId = options.id;

    // 如果没有 ID，提示错误并返回
    if (!productId) {
      wx.showToast({ title: '参数错误', icon: 'error' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    // 2. 获取本地缓存的用户信息
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo') || {};

    // 3. 更新页面的基础状态
    this.setData({
      isUserLoggedIn: !!token,
      hasUserAddress: !!userInfo.address,
      myUserId: userInfo.id || null
    });

    this.fetchProductDetail(productId);
  },

  fetchProductDetail(id) {
    this.setData({ isLoading: true });
    const userInfo = wx.getStorageSync('userInfo') || {};
    const myAddress = userInfo.address || '';

    wx.request({
      url: `${host}/api/products/${id}?address=${encodeURIComponent(myAddress)}`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const productData = res.data;

          // 判断是否是自己的商品
          let isSelf = false;
          if (this.data.myUserId && productData.user && productData.user.id) {
            isSelf = (Number(this.data.myUserId) === Number(productData.user.id));
          }

          // 格式化数据
          const formattedProduct = this.formatProduct(productData);

          this.setData({
            product: formattedProduct,
            isLoading: false,
            isMyProduct: isSelf,
            isFavorited: res.data.isFavorited || false
          });

          // 如果已登录，记录浏览历史
          if (this.data.isUserLoggedIn) {
            wx.request({
              url: `${host}/api/history/record`,
              method: 'POST',
              header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
              data: { productId: id }
            });
          }
        } else {
          wx.showToast({ title: '商品不存在或已被删除', icon: 'none' });
          this.setData({ isLoading: false });
        }
      },
      fail: (err) => {
        console.error('获取详情失败', err);
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.setData({ isLoading: false });
      }
    });
  },

  /**
   * 联系卖家 (点击按钮触发)
   */
  contactSeller() {
    // 1. 基础检查
    if (!this.data.product || !this.data.product.user || !this.data.product.user.id) {
      wx.showToast({ title: '卖家信息错误', icon: 'none' });
      return;
    }

    // 2. 登录检查
    if (!this.data.isUserLoggedIn || !this.data.myUserId) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 3. 自己不能联系自己
    if (this.data.isMyProduct) {
      wx.showToast({ title: '这是您自己的商品', icon: 'none' });
      return;
    }

    const seller = this.data.product.user;

    // --- 打包商品信息 (用于在聊天界面顶部显示当前聊的是哪个商品) ---
    const productInfo = {
      id: this.data.product.id,
      name: this.data.product.name,
      price: this.data.product.price,
      // 确保图片是个字符串 (取第一张)
      image: (this.data.product.imagesList && this.data.product.imagesList.length > 0)
             ? this.data.product.imagesList[0]
             : ''
    };

    const productStr = encodeURIComponent(JSON.stringify(productInfo));
    const avatarStr = encodeURIComponent(seller.avatar || '');
    const usernameStr = encodeURIComponent(seller.username || '卖家');
    const url = `/pages/chat/chat?toUserId=${seller.id}&username=${usernameStr}&avatar=${avatarStr}&product=${productStr}`;

    wx.navigateTo({ url });
  },

  /**
   * 格式化商品数据以便于显示
   */
  formatProduct(p) {
    if (!p) return p;
    const prod = { ...p };

    // 处理图片数组
    let imgList = [];
    try {
      const parsed = JSON.parse(prod.images);
      if (Array.isArray(parsed)) {
        imgList = parsed;
      } else {
        imgList = [prod.images];
      }
    } catch (e) {
      imgList = [prod.images];
    }
    prod.imagesList = imgList;

    // 处理时间
    if (prod.createdAt) {
      const date = new Date(prod.createdAt);
      prod.createdAtFormatted = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    } else {
      prod.createdAtFormatted = '';
    }

    // 处理送货范围
    if (prod.range) {
      if (!Array.isArray(prod.range)) {
        try {
          const parsed = typeof prod.range === 'string' ? JSON.parse(prod.range) : prod.range;
          prod.range = Array.isArray(parsed) ? parsed : [String(parsed)];
        } catch (e) {
          prod.range = [String(prod.range)];
        }
      }
    } else {
      prod.range = [];
    }

    prod.rangePreview = prod.range.slice(0, 5);

    // 处理距离
    if (typeof prod.distance === 'number' && prod.distance > 0) {
      prod.distanceFormatted = prod.distance > 1000
        ? `${(prod.distance / 1000).toFixed(1)} km`
        : `${prod.distance} m`;
    } else {
      prod.distanceFormatted = '';
    }

    return prod;
  },

  // 图片预览
  previewImage(e) {
    const currentUrl = e.currentTarget.dataset.url;
    wx.previewImage({
      current: currentUrl,
      urls: this.data.product.imagesList
    });
  },

  onShareAppMessage() {
    const product = this.data.product;
    if (!product) return;
    return {
      title: `【闲置】￥${product.price} | ${product.name}`,
      path: `/pages/product/product?id=${product.id}`,
      imageUrl: product.images
    };
  },

  onShareTimeline() {
    const product = this.data.product;
    if (!product) return;
    return {
      title: `【转卖】${product.name} 只要￥${product.price}`,
      query: `id=${product.id}`,
      imageUrl: product.images
    };
  },

  // 收藏/取消收藏
  onToggleFavorite() {
    if (!this.data.isUserLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 乐观UI：先变色，再请求
    const oldStatus = this.data.isFavorited;
    this.setData({ isFavorited: !oldStatus });

    wx.request({
      url: `${host}/api/favorites/toggle`,
      method: 'POST',
      header: { 'Authorization': `Bearer ${wx.getStorageSync('token')}` },
      data: { productId: this.data.product.id },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({
            title: res.data.isFavorited ? '收藏成功' : '已取消',
            icon: 'none'
          });
          this.setData({ isFavorited: res.data.isFavorited });
        } else {
          wx.showToast({ title: res.data.error || '操作失败', icon: 'none' });
          this.setData({ isFavorited: oldStatus });
        }
      },
      fail: () => {
        this.setData({ isFavorited: oldStatus });
      }
    });
  },

  // 点击“解锁”
  handleUnlock() {
    if (!this.data.isUserLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认解锁',
      content: '确认解锁查看卖家联系方式吗？(当前活动免费)',
      confirmText: '立即查看', // 配合免费策略修改文案
      success: (res) => {
        if (res.confirm) {
          this.doUnlock();
        }
      }
    });
  },

  // 执行解锁请求
  doUnlock() {
    wx.showLoading({ title: '处理中...' });
    const token = wx.getStorageSync('token');

    wx.request({
      url: `${host}/api/products/unlock`,
      method: 'POST',
      header: { 'Authorization': `Bearer ${token}` },
      data: { productId: this.data.product.id },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200 && res.data.success) {
          wx.showToast({ title: '解锁成功', icon: 'success' });

          // 更新本地数据
          const realContact = res.data.contact;
          this.setData({
            'product.isUnlocked': true,
            'product.contact': realContact
          });

          // 解锁成功后，直接跳转去联系卖家，而不是弹窗显示号码
          setTimeout(() => {
            this.contactSeller();
          }, 500); // 延迟一点点，让用户看到“解锁成功”的提示

        } else if (res.statusCode === 402) {
          // 积分不足逻辑保持不变
          wx.showModal({
            title: '积分不足',
            content: '您的积分不够啦，快去发布闲置或做任务赚积分吧！',
            confirmText: '去赚积分',
            success: (m) => {
               if(m.confirm) wx.switchTab({ url: '/pages/points/earn/earn' }); // 修正这里的路径，确保指向赚积分页面
            }
          });
        } else {
          wx.showToast({ title: res.data.error || '解锁失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    });
  },

  // 显示联系方式弹窗（复制功能）
  showContactModal() {
    const contact = this.data.product.contact;
    wx.showModal({
      title: '卖家联系方式',
      content: contact,
      confirmText: '复制',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({ data: contact });
        }
      }
    });
  },

});