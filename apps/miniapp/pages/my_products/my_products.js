import { host } from '../../config.js';
const app = getApp();
Page({
  data: {
    products: []
  },

  onToggleStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    // 如果当前是 1(已售)，就改成 0(在售)；反之亦然
    const newStatus = status === 1 ? 0 : 1;
    const actionName = newStatus === 1 ? '标记为已售出' : '重新上架';

    wx.showModal({
      title: '提示',
      content: `确定要将此商品${actionName}吗？`,
      success: (res) => {
        if (res.confirm) {
          const token = wx.getStorageSync('token');
          wx.showLoading({ title: '处理中' });

          wx.request({
            url: `${host}/api/products/${id}`,
            method: 'PUT',
            header: { 'Authorization': `Bearer ${token}` },
            data: { status: newStatus }, // 只发 status 字段
            success: (resp) => {
              wx.hideLoading();
              if (resp.statusCode === 200) {
                wx.showToast({ title: '操作成功', icon: 'success' });

                // 直接修改本地数据，不用重新拉取列表，体验更好
                const updatedProducts = this.data.products.map(p => {
                  if (p.id === id) {
                    p.status = newStatus;
                  }
                  return p;
                });
                this.setData({ products: updatedProducts });

              } else {
                wx.showToast({ title: '操作失败', icon: 'none' });
              }
            },
            fail: () => {
               wx.hideLoading();
               wx.showToast({ title: '网络请求失败', icon: 'none' });
            }
          });
        }
      }
    });
  },
  onShow() {
    this.getTabBar().onChange(1);
    this.fetchMyProducts();
    app.updateUnreadCount();
  },

  fetchMyProducts(callback) {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      if (callback) callback(); // 即使没登录也要停止刷新
      return;
    }

    wx.request({
      url: `${host}/api/user/products`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200) {
          const formattedProducts = res.data.map(p => {
            const date = new Date(p.createdAt);
            p.createdAtFormatted = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

            try {
              const imgs = JSON.parse(p.images);
              if (Array.isArray(imgs) && imgs.length > 0) {
                p.images = imgs[0];
              }
            } catch (e) {}
            return p;
          });
          formattedProducts.reverse();
          this.setData({ products: formattedProducts });
        } else {
          wx.showToast({ title: '加载失败', icon: 'none' });
        }
      },
      fail: () => {
         wx.showToast({ title: '网络请求失败', icon: 'none' });
      },
      complete: () => {

        if (callback) callback();
      }
    });
  },

  onPullDownRefresh() {
    this.fetchMyProducts(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: '列表已更新', icon: 'none' });
    });
  },

  onEdit(e) {
    const productId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/edit_product/edit_product?id=${productId}`
    });
  },

  onDelete(e) {
    const productId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后商品和图片将无法恢复，确定要删除吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteProduct(productId);
        }
      }
    });
  },

  goToPost() {
    wx.navigateTo({
      url: '/pages/add_product/add_product'
    });
  },

  deleteProduct(productId) {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${host}/api/products/${productId}`,
      method: 'DELETE',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({ title: '删除成功', icon: 'success' });
          // 从列表中移除已删除的商品，实现UI无刷新更新
          const newProducts = this.data.products.filter(p => p.id !== productId);
          this.setData({ products: newProducts });
        } else {
          wx.showToast({ title: res.data.error || '删除失败', icon: 'none' });
        }
      }
    });
  }
});
