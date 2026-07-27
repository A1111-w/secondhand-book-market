// components/product-picker/index.js
import { host } from '../../config.js';

Component({
  properties: {
    show: { type: Boolean, value: false },
    sellerId: { type: Number, value: 0 },
    targetProduct: { type: Object, value: null }
  },

  data: {
    products: []
  },

  // 监听属性变化，当弹窗打开时加载数据
  observers: {
    'show, sellerId': function(show, sellerId) {
      if (show && sellerId) {
        this.fetchSellerProducts(sellerId);
      }
    }
  },

  methods: {
    onClose() {
      this.triggerEvent('close');
    },

    fetchSellerProducts(sellerId) {
      const token = wx.getStorageSync('token');
      wx.request({
        url: `${host}/api/user/${sellerId}/products`,
        method: 'GET',
        header: { 'Authorization': `Bearer ${token}` },
        success: (res) => {
          if (res.statusCode === 200) {
            let list = res.data || [];
            const target = this.data.targetProduct;
            const finalList = [];

            // 1. 置顶当前商品
            if (target) {
              // 在列表中查找并移除重复项
              const index = list.findIndex(p => p.id === target.id);
              if (index > -1) list.splice(index, 1);
              let displayImage = target.image || target.images;

              // 做一个容错处理
              if (typeof displayImage === 'string' && displayImage.startsWith('[')) {
                 try {
                   const arr = JSON.parse(displayImage);
                   if (arr.length > 0) displayImage = arr[0];
                 } catch(e) {}
              }

              // 构建带标记的 target 对象
              const targetItem = {
                ...target,
                images: displayImage,
                isTarget: true
              };
              // 如果 target 里 image 是单数字符串，这里不需要处理，显示时用 item.images
              // 注意：确保数据结构字段名一致
              finalList.push(targetItem);
            }

            // 2. 追加其他商品
            finalList.push(...list);

            this.setData({ products: finalList });
          }
        }
      });
    },

    onSend(e) {
      const item = e.currentTarget.dataset.item;
      // 触发父组件的 send 事件
      this.triggerEvent('send', { product: item });
      this.onClose(); // 发送后关闭弹窗
    }
  }
});