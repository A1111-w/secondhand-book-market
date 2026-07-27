// pages/favorites/favorites.js
import { host } from '../../config.js';

Page({
  data: {
    groupedList: [], // 处理后的嵌套数据
    rawData: [],     // 原始数据备份
    isEditMode: false, // 是否处于编辑模式（用于删除）
    totalPrice: 0,     // 总金额
    selectedCount: 0,  // 选中数量
    allSelected: false, // 全选状态

    // 用户自定义排序配置 (可以存本地缓存实现持久化)
    // 数组顺序决定显示顺序
    wayOrder: ['自提', '送上门'],
    categoryOrder: ['二手书', '电子产品', '家具', '电器', '食物', '其他']
  },

  onShow() {
    this.fetchFavorites();
  },

  onPullDownRefresh() {
    this.fetchFavorites();
  },

  // 1. 获取数据并分组
  fetchFavorites() {
    const token = wx.getStorageSync('token');
    if (!token) return;

    wx.request({
      url: `${host}/api/favorites`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200) {
          const list = res.data.data || [];
          list.forEach(item => {
            item.checked = false; // 初始化选中状态
            if (item.product && item.product.images) {
              try {
                const imgs = JSON.parse(item.product.images);
                if (Array.isArray(imgs) && imgs.length > 0) {
                  item.product.images = imgs[0]; // 取第一张作为封面
                }
              } catch (e) {
                // 解析失败说明是旧数据
              }
            }
          });
          this.processData(list);
          wx.stopPullDownRefresh();
        }
      }
    });
  },

  // 2. 核心数据处理：分组 + 排序
  processData(list) {
    const { wayOrder, categoryOrder } = this.data;
    const groups = [];

    // --- 第一层：按交易方式分组 ---
    wayOrder.forEach(way => {
      const wayItems = list.filter(item => item.product.way === way);
      // 如果该方式下没有商品，且还有剩余商品（处理未知方式的情况），这里简化逻辑只处理配置内的
      if (wayItems.length === 0) return;

      const wayGroup = {
        name: way,
        subGroups: []
      };

      // --- 第二层：按分类分组 ---
      // 1. 先处理预定义的分类
      categoryOrder.forEach(cat => {
        const catItems = wayItems.filter(item => item.product.category === cat);
        if (catItems.length > 0) {
          wayGroup.subGroups.push({
            name: cat,
            items: catItems // items 已经是按时间倒序的（后端排过）
          });
        }
      });

      // 2. 处理不在预定义分类里的“其他”
      const otherItems = wayItems.filter(item => !categoryOrder.includes(item.product.category));
      if (otherItems.length > 0) {
        wayGroup.subGroups.push({ name: '其他', items: otherItems });
      }

      if (wayGroup.subGroups.length > 0) {
        groups.push(wayGroup);
      }
    });

    // 处理不在 wayOrder 里的（如未知方式）
    const unknownWayItems = list.filter(item => !wayOrder.includes(item.product.way));
    if (unknownWayItems.length > 0) {
      groups.push({
        name: '其他方式',
        subGroups: [{ name: '其他', items: unknownWayItems }]
      });
    }

    this.setData({ groupedList: groups, rawData: list });
    this.calculateTotal(); // 重新计算价格
  },

  // --- 交互逻辑 ---

  // 切换编辑模式
  toggleEdit() {
    this.setData({ isEditMode: !this.data.isEditMode });
  },

  // 单个商品选中/取消
  onCheckItem(e) {
    const { wayIdx, subIdx, itemIdx } = e.currentTarget.dataset;
    const key = `groupedList[${wayIdx}].subGroups[${subIdx}].items[${itemIdx}].checked`;
    const currentVal = this.data.groupedList[wayIdx].subGroups[subIdx].items[itemIdx].checked;

    this.setData({ [key]: !currentVal });
    this.calculateTotal();
  },

  // 全选/全不选
  toggleSelectAll() {
    const newStatus = !this.data.allSelected;
    const newList = this.data.groupedList;

    newList.forEach(way => {
      way.subGroups.forEach(sub => {
        sub.items.forEach(item => {
          item.checked = newStatus;
        });
      });
    });

    this.setData({ groupedList: newList, allSelected: newStatus });
    this.calculateTotal();
  },

  // 计算总价和选中状态
  calculateTotal() {
    let total = 0;
    let count = 0;
    let allItemsCount = 0;

    this.data.groupedList.forEach(way => {
      way.subGroups.forEach(sub => {
        sub.items.forEach(item => {
          allItemsCount++;
          if (item.checked) {
            total += item.product.price;
            count++;
          }
        });
      });
    });

    this.setData({
      totalPrice: total.toFixed(2),
      selectedCount: count,
      allSelected: allItemsCount > 0 && count === allItemsCount
    });
  },

  // 批量删除
  handleBatchDelete() {
    if (this.data.selectedCount === 0) {
      return wx.showToast({ title: '请先选择商品', icon: 'none' });
    }

    wx.showModal({
      title: '提示',
      content: `确定移除这 ${this.data.selectedCount} 个商品吗？`,
      success: (res) => {
        if (res.confirm) {
          // 收集所有选中的 favorite ID
          const ids = [];
          this.data.groupedList.forEach(way => {
            way.subGroups.forEach(sub => {
              sub.items.forEach(item => {
                if (item.checked) ids.push(item.id);
              });
            });
          });

          this.deleteAPI(ids);
        }
      }
    });
  },

  deleteAPI(ids) {
    wx.showLoading({ title: '删除中' });
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${host}/api/favorites`,
      method: 'DELETE',
      header: { 'Authorization': `Bearer ${token}` },
      data: { ids },
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.showToast({ title: '已移除', icon: 'success' });
          this.fetchFavorites(); // 刷新列表
          this.setData({ isEditMode: false }); // 退出编辑模式
        } else {
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    });
  },

  // 结账（模拟）
  handleCheckout() {
    if (this.data.selectedCount === 0) return;
    wx.showToast({ title: '正在开发个体户支付...', icon: 'none' });
  },

  // 调整顺序的示例（可以绑定到按钮上）
  swapWayOrder() {
    const newOrder = this.data.wayOrder[0] === '自提' ? ['送上门', '自提'] : ['自提', '送上门'];
    this.setData({ wayOrder: newOrder });
    this.processData(this.data.rawData); // 重新分组
    wx.showToast({ title: '顺序已切换', icon: 'none' });
  }
});