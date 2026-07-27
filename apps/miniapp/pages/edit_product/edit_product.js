// pages/edit_product/edit_product.js
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
    productId: null,
    formData: {
      name: '',
      description: '',
      images: [], // 图片数组
      category: '其他',
      contact: '',
      isbn: '',
      price: null,
      position: '',
      way: '自提',
      range: [],
      categoryIndex: 0,
      wayIndex: 0,
    },
    addressList: ADDRESS_LIST,
    showRangePopup: false,
    tempRange: [],
    isSelectAll: false,

    categories: ["二手书", "家具", "电子产品", "电器", "食物", "其他"],
    ways: ["自提", "送上门"],
    isSubmitting: false,
    currentUser: null,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ productId: options.id });
      this.checkLoginAndFetchData(options.id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'error' });
    }
  },

  checkLoginAndFetchData(productId) {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');

    if (!token || !userInfo.id) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ currentUser: userInfo });
    this.fetchProductData(productId);
  },

  fetchProductData(productId) {
    wx.request({
      url: `${host}/api/products/${productId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const data = res.data;

          let imgList = [];
          try {
            const parsed = JSON.parse(data.images);
            imgList = Array.isArray(parsed) ? parsed : [data.images];
          } catch (e) {
            // 旧数据兼容
            imgList = [data.images];
          }
          const catIdx = this.data.categories.indexOf(data.category);
          const wayIdx = this.data.ways.indexOf(data.way);

          this.setData({
            formData: {
              ...this.data.formData,
              ...data,
              images: imgList // 赋值为数组
            },
            categoryIndex: catIdx >= 0 ? catIdx : 0,
            wayIndex: wayIdx >= 0 ? wayIdx : 0
          });

        }
      }
    });
  },

  chooseImage() {
    const currentImages = this.data.formData.images || [];
    const maxCount = 9;
    const remainCount = maxCount - currentImages.length;

    if (remainCount <= 0) {
      wx.showToast({ title: '最多9张', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFiles = res.tempFiles;
        wx.showLoading({title: '上传中...'});

        const uploadPromises = tempFiles.map(file => {
          return new Promise((resolve, reject) => {
            wx.uploadFile({
              url: `${host}/api/addProduct/uploadimage`,
              filePath: file.tempFilePath,
              name: 'file',
              formData: {
                'user': String(this.data.currentUser.id)
              },
              success: (uploadRes) => {
                if (uploadRes.statusCode === 200) {
                   const resData = JSON.parse(uploadRes.data);
                   if (resData.url) resolve(resData.url);
                   else reject('无URL');
                } else reject('error');
              },
              fail: reject
            });
          });
        });

        try {
          const newUrls = await Promise.all(uploadPromises);
          this.setData({
            'formData.images': currentImages.concat(newUrls)
          });
          wx.hideLoading();
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      },
    });
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = this.data.formData.images;
    images.splice(index, 1);
    this.setData({ 'formData.images': images });
  },

  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`formData.${field}`]: e.detail.value });
  },

  handlePickerChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    const index = Number(value);
    let newValue;
    if (field === 'category') {
      newValue = this.data.categories[index];
      this.setData({ categoryIndex: index });
    } else if (field === 'way') {
      newValue = this.data.ways[index];
      this.setData({ wayIndex: index });
      if (newValue === '自提') this.setData({'formData.range': []});
    }
    this.setData({ [`formData.${field}`]: newValue });
  },

  // 扫码功能 (保持不变)
  onScanCode() {
     const that = this;
     wx.scanCode({
       success(res) {
         that.setData({ 'formData.isbn': res.result });
         wx.showToast({ title: '已扫描', icon: 'success' });
       }
     });
  },

  handleSubmit() {
    if (this.data.isSubmitting) return;
    const data = this.data.formData;

    if (!data.name || data.images.length === 0 || !data.contact || !data.price) {
      wx.showToast({ title: '必填项不完整', icon: 'none' });
      return;
    }

    this.setData({ isSubmitting: true });

    // 【核心修改】转 JSON 字符串
    const imagesJson = JSON.stringify(data.images);

    const postData = {
      ...data,
      userId: this.data.currentUser.id,
      images: imagesJson, // 传字符串
      price: parseFloat(data.price),
    };

    const token = wx.getStorageSync('token');

    wx.request({
      url: `${host}/api/products/${this.data.productId}`,
      method: 'PUT',
      header: { 'Authorization': `Bearer ${token}` },
      data: postData,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({ title: '修改成功', icon: 'success' });
          setTimeout(() => {
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            if (prevPage && prevPage.onShow) prevPage.onShow(); // 刷新上一页
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({ title: '修改失败', icon: 'none' });
        }
      },
      complete: () => this.setData({ isSubmitting: false }),
    });
  },


  openRangePopup() { this.setData({ showRangePopup: true, tempRange: [...(this.data.formData.range||[])] }); },
  onRangeCancel() { this.setData({ showRangePopup: false }); },
  onRangeConfirm() { this.setData({ 'formData.range': this.data.tempRange, showRangePopup: false }); },
  onRangeCheckboxChange(e) { this.setData({ tempRange: e.detail.value }); },
  onRangeSelectAll() { /* ... */ },
  preventScroll() {}
});