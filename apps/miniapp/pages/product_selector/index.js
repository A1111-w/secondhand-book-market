// pages/product_selector/index.js
import { host } from '../../config.js';

Page({
  data: {
    products: [],
    targetId: null // 当前正在咨询的商品ID
  },

  onLoad(options) {
    // 接收上个页面传来的 targetId
    if (options.targetId) {
      this.setData({ targetId: Number(options.targetId) });
    }
    this.fetchMyProducts();
  },

  fetchMyProducts() {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${host}/api/user/products`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200) {
          let list = res.data;

          // 排序：把 targetId 的商品排到第一个
          if (this.data.targetId) {
            const targetIndex = list.findIndex(p => p.id === this.data.targetId);
            if (targetIndex > -1) {
              const targetItem = list.splice(targetIndex, 1)[0]; // 取出来
              targetItem.isTarget = true; // 标记一下，方便前端加个“当前”标签
              list.unshift(targetItem); // 放到头部
            }
          }

          this.setData({ products: list });
        }
      }
    });
  },

  // 点击商品，返回上一页并发送
  onSelect(e) {
    const product = e.currentTarget.dataset.item;

    // 构建发送用的精简对象
    const productCard = {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images // images 在数据库是字符串，直接用
    };

    // 获取上一页 (Chat页面) 实例
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];

    if (prevPage) {
      // 直接调用上一页的发送方法
      prevPage.sendMessage(JSON.stringify(productCard), 2); // type 2 = 商品
    }

    wx.navigateBack();
  }
});