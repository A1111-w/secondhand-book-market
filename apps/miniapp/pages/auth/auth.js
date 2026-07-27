// pages/auth/auth.js
import { host } from '../../config.js';

Page({
  data: {
    status: 0,
    statusText: '',
    tempImg: '',
    isSubmitting: false,

    // 表单数据
    formData: {
      realName: '',
      gender: '',
      college: '',
      major: '',
      grade: '',
      className: '',
      studentId: ''
    }
  },

  onShow() {
    this.checkStatus();
  },

  checkStatus() {
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${host}/api/user/verify`,
      method: 'GET',
      header: { 'Authorization': `Bearer ${token}` },
      success: (res) => {
        const s = res.data.status;
        let text = '';
        if(s === 1) text = '审核中';
        if(s === 2) text = '认证通过';
        if(s === 3) text = '认证被驳回';
        this.setData({ status: s, statusText: text });
      }
    });
  },

  // 输入框通用处理
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 性别单选处理
  onGenderChange(e) {
    this.setData({
      'formData.gender': e.detail.value
    });
  },

  chooseImage() {
    const that = this; // 保存上下文
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'], // 建议压缩，减小上传压力
      sourceType: ['album', 'camera'],
      success(res) {
        // 确保拿到的是 tempFilePath
        const path = res.tempFiles[0].tempFilePath;
        console.log('选中的图片路径:', path);
        that.setData({
          tempImg: path
        });
      },
      fail(err) {
        console.error('选择图片失败', err);
      }
    });
  },

  submitVerify() {
    const { realName, gender, studentId, college } = this.data.formData;

    // 简单校验
    if (!this.data.tempImg) {
      return wx.showToast({ title: '请上传证件照', icon: 'none' });
    }
    if (!realName || !studentId || !college) {
      return wx.showToast({ title: '请完善基本信息', icon: 'none' });
    }

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });

    const token = wx.getStorageSync('token');


    wx.uploadFile({
      url: `${host}/api/user/verify`,
      filePath: this.data.tempImg,
      name: 'file', // 后端接收文件的字段名
      header: { 'Authorization': `Bearer ${token}` },
      // 将 formData 对象传给后端
      formData: this.data.formData,
      success: (res) => {
        wx.hideLoading();
        try {
          const data = JSON.parse(res.data); // uploadFile 返回的是字符串，需要 parse
          if (data.success) {
            wx.showToast({ title: '提交成功' });

            // 更新本地缓存状态
            const userInfo = wx.getStorageSync('userInfo') || {};
            userInfo.isStudent = 1;
            wx.setStorageSync('userInfo', userInfo);

            this.checkStatus();
          } else {
            wx.showToast({ title: data.error || '提交失败', icon: 'none' });
          }
        } catch (e) {
          wx.showToast({ title: '服务器返回异常', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this.setData({ isSubmitting: false });
      }
    })
  }
});