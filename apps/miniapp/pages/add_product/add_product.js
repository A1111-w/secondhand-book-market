// pages/add_product/add_product.js
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
    // 【默认值】表单数据
    formData: {
      name: '',
      description: '',
      images: [], // 图片数组
      category: '其他',
      contact: '',
      isbn: '',
      price: null,
      position: '',
      way: '自提', // 默认自提
      range: [],
    },

    addressList: ADDRESS_LIST,
    showRangePopup: false,
    tempRange: [],            // 弹窗中临时勾选的值
    isSelectAll: false,        // 是否全选

    // 基础配置
    categories: ["二手书", "家具", "电子产品", "电器", "食物", "其他"],
    ways: ["自提", "送上门"],

    // 状态
    isSubmitting: false,


    currentUser: null,
  },

  onShow() {
    this.checkLoginAndLoadDefaults();
  },

  /**
   * 检查登录状态并加载用户的默认联系方式和地址
   */
  checkLoginAndLoadDefaults() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');

    if (!token || !userInfo.id) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      // 登录后返回，或者引导登录
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }
    if (userInfo.isStudent !== 2) {
      wx.showModal({
          title: '需身份认证',
          content: '为了构建安全的校园交易环境，发布商品前请先完成学生身份认证。',
          confirmText: '去认证',
          cancelText: '取消',
          success: (res) => {
              if (res.confirm) {
                  // 跳转去认证页，认证完回来可以顺便发布
                  wx.redirectTo({ url: '/pages/auth/auth' });
              } else {
                  wx.navigateBack(); // 不认证就退出去
              }
          }
      });
      return; // 阻止后续逻辑
  }

    // 设置用户默认值
    let defaultContact = userInfo.phone || '';
    let defaultPosition = userInfo.address || '';
    console.log(userInfo)
    this.setData({
      currentUser: userInfo,
      'formData.contact': defaultContact,
      'formData.position': defaultPosition
    });
  },

  handleInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  onScanCode() {
    // 保存 Page 实例的 this 上下文
    const that = this;
    const token = wx.getStorageSync('token');
    if (!token) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
    }

    wx.scanCode({
      onlyFromCamera: true,
      scanType: ['barCode'],
      success(res) {
        console.log('扫码结果', res);
        const isbn = res.result;
        wx.showLoading({ title: '查询书籍信息...' });

        // 调用后端接口获取书籍信息
        wx.request({
          url: `${host}/api/isbn?isbn=${isbn}`, // 您的后端接口
          method: 'GET',
          success(resp) {
            wx.hideLoading();
            if (resp.data && resp.data.result) {
              const book = resp.data.result;
              console.log('书名:', book.title);
              console.log('ISBN:', book.isbn);

              // 使用 setData 自动填充表单
              that.setData({
                'formData.name': book.title || '',
                'formData.isbn': book.isbn || isbn // 优先用接口返回的，否则用扫码的
              });

              wx.showToast({ title: '信息已自动填充', icon: 'success' });

            } else {
              console.log('未获取到书籍信息', resp.data);
              wx.showToast({ title: resp.data.error || '未查到书籍信息', icon: 'none' });
              // 即使没查到，也把扫码的ISBN填上
              that.setData({ 'formData.isbn': isbn });
            }
          },
          fail(err) {
            wx.hideLoading();
            console.error('请求书籍信息失败', err);
            wx.showToast({ title: '查询失败，请检查网络', icon: 'none' });
          }
        });
      },
      fail(err) {
        console.error('扫码失败', err);
      }
    });
  },

  handlePickerChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;

    let newValue;
    if (field === 'category') {
      newValue = this.data.categories[value];
    } else if (field === 'way') {
      newValue = this.data.ways[value];
      // 如果切换到自提，清空 range
      if (newValue === '自提') {
          this.setData({'formData.range': []});
      }
    }

    this.setData({ [`formData.${field}`]: newValue });
  },

  chooseImage() {
    const currentImages = this.data.formData.images || [];
    const maxCount = 9; // 最多9张
    const remainCount = maxCount - currentImages.length;

    if (remainCount <= 0) {
      wx.showToast({ title: '最多上传9张', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remainCount, // 还能选几张
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFiles = res.tempFiles;
        wx.showLoading({ title: '上传中...' });

        // 循环上传 (为了保持顺序，使用 for...of 和 await)
        // 我们需要封装一下或者用 Promise.all
        // 这里用简单的 Promise 封装来实现并发上传

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
                  try {
                    const resData = JSON.parse(uploadRes.data);
                    if (resData.url) resolve(resData.url);
                    else reject('无URL');
                  } catch(e) { reject(e); }
                } else {
                  reject('状态码错误');
                }
              },
              fail: (err) => reject(err)
            });
          });
        });

        try {
          // 等待所有图片上传完成
          const newUrls = await Promise.all(uploadPromises);

          // 追加到现有数组
          this.setData({
            'formData.images': currentImages.concat(newUrls)
          });
          wx.hideLoading();
          wx.showToast({ title: '上传成功' });

        } catch (error) {
          wx.hideLoading();
          console.error(error);
          wx.showToast({ title: '部分图片上传失败', icon: 'none' });
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


  handleSubmit() {
    if (this.data.isSubmitting) return;

    const data = this.data.formData;

    // 基础校验
    if (!data.name || data.images.length === 0 || !data.contact || !data.price) {
      wx.showToast({ title: '必填信息未完成', icon: 'none' });
      return;
    }
    // ... (分类校验保持不变) ...
    if (data.category === '二手书' && !data.isbn) {
        wx.showToast({ title: '二手书需填写 ISBN', icon: 'none' });
        return;
    }
    if (data.way === '送上门' && !data.range) {
        wx.showToast({ title: '送货上门需填写范围', icon: 'none' });
        return;
    }

    this.setData({ isSubmitting: true });

    // 将图片数组转为 JSON 字符串
    const imagesJson = JSON.stringify(data.images);

    const postData = {
      ...data,
      userId: this.data.currentUser.id,
      images: imagesJson, // 传字符串给后端
      price: parseFloat(data.price),
      range: data.range,
    };


    wx.request({
      url: `${host}/api/addProduct`,
      method: 'POST',
      data: postData,
      success: (res) => {
        if (res.statusCode === 201) {
          wx.showToast({ title: '发布成功！', icon: 'success' });
          setTimeout(() => wx.navigateBack(), 1500);
        } else {
          wx.showToast({ title: res.data.error || '发布失败', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '网络错误', icon: 'error' }),
      complete: () => this.setData({ isSubmitting: false }),
    });
  },

  openRangePopup() {
    const currentRange = this.data.formData.range || [];
    this.setData({
      showRangePopup: true,
      tempRange: Array.isArray(currentRange) ? [...currentRange] : [],
      isSelectAll: Array.isArray(currentRange) && currentRange.length === this.data.addressList.length
    });
  },

  // 弹窗中的多选框被点击
  onRangeCheckboxChange(e) {
    const selectedValues = Array.isArray(e.detail.value) ? [...e.detail.value] : [];
    this.setData({
      tempRange: selectedValues,
      isSelectAll: selectedValues.length === this.data.addressList.length
    });
  },

  // 弹窗中的“全选”按钮被点击
  onRangeSelectAll() {
    const newSelectAll = !this.data.isSelectAll;
    this.setData({
      isSelectAll: newSelectAll,
      tempRange: newSelectAll ? [...this.data.addressList] : []
    });
  },

  // 弹窗“取消”按钮
  onRangeCancel() {
    this.setData({
      showRangePopup: false,
      tempRange: [], // 清空临时值
    });
  },

  // 弹窗“确认”按钮
  onRangeConfirm() {
    this.setData({
      'formData.range': Array.isArray(this.data.tempRange) ? [...this.data.tempRange] : [],
      showRangePopup: false
    });
  },
  preventScroll() {
    // 阻止底层页面的滚动
  },
});