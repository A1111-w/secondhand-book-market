// pages/feedback/feedback.js
import { host } from '../../config.js';
Page({

  data: {
    contact: '',
    content: '',
    images: [], // 用于预览的临时路径
    imageBase64s: [], // 用于提交的 base64 数组
    isLoading: false
  },

  onLoad(options) {
    // 优先读取用户缓存中的联系方式
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.phone) {
      this.setData({
        contact: userInfo.phone
      });
    }
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  chooseImage() {
    const count = 3 - this.data.images.length;
    wx.chooseMedia({
      count: count,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles;
        tempFiles.forEach(file => this.readFileAsBase64(file.tempFilePath));
      }
    });
  },

  readFileAsBase64(filePath) {
    const fsm = wx.getFileSystemManager();
    fsm.readFile({
      filePath: filePath,
      encoding: 'base64',
      success: (res) => {
        const base64Data = `data:image/png;base64,${res.data}`;
        this.setData({
          images: this.data.images.concat(filePath),
          imageBase64s: this.data.imageBase64s.concat(base64Data)
        });
      },
      fail: console.error
    });
  },

  previewImage(e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images,
    });
  },

  deleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    const imageBase64s = [...this.data.imageBase64s];
    images.splice(index, 1);
    imageBase64s.splice(index, 1);
    this.setData({ images, imageBase64s });
  },

  submitFeedback(e) {
    const { contact, content } = this.data;

    if (!contact.trim() || !content.trim()) {
      wx.showToast({ title: '联系方式和内容不能为空', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });

    wx.request({
      url: `${host}/api/feedback`,
      method: 'POST',
      data: {
        contact: contact,
        content: content,
        images: this.data.imageBase64s
      },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({ title: '提交成功！感谢您的反馈', icon: 'success' });
          this.setData({
            contact: '',
            content: '',
            images: [],
            imageBase64s: []
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({ title: res.data.error || '提交失败，请稍后再试', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('反馈请求失败', err);
        wx.showToast({ title: '网络错误，请稍后再试', icon: 'none' });
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  },



  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})