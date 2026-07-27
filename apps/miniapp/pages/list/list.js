// pages/list/list.js
import { host } from '../../config.js';
Page({

  /**
   * 页面的初始数据
   */
  data: {
    info: "hello world",
    count: 0,
    msg: "你好",
    flag: true,
    userlist: [
      {id:1, name:"xiao"},
      {id:2, name:"zhong"},
      {id:3, name:"da"}
    ],
    swiperList: []

  },

  getSwiperList(){
    wx.request({
      url: `${host}/api/carousel`,
      method: 'GET',
      success: (res) =>{
        console.log(res)
        this.setData({
          swiperList: res.data.data
        })
      }
    })
  },
  inputhandler(e){
    // console.log(e.detail.value);
    // console.log(e)
    this.setData({
      msg: e.detail.value
    })
},


  // wang(e){
  //   console.log(e)
  // },

  // countchange(){
  //   this.setData({
  //     count: this.data.count + 1
  //       })
  // },

  // bidTap2(e){
  //   this.setData({
  //     count: this.data.count + e.target.dataset.info
  //   })
  // },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.getSwiperList();

  },

  GoTotaBarinfo(){
    wx.switchTab({
      url: '/pages/homepage/homepage',
    })
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
    console.log('ok');
    this.getSwiperList();
    wx.stopPullDownRefresh();

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