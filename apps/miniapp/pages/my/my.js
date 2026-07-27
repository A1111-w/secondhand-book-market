// pages/my/my.js
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
    userInfo: null,
    editNameValue: '',
    addressList: ADDRESS_LIST,
    addressIndex: 0,
    displayAddress: '现在设置',
    contact: '',
    avatarPreview: '',   // 临时显示的本地图片路径
    avatarBase64: '',    // dataURI 格式或纯 base64
    avatarUrl: ''        // 用于显示最终头像（缓存或网络URL）
  },

  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');

    if (userInfo && token) {
      console.log('检测到缓存登录信息:', userInfo);
      this.setData({
        userInfo: userInfo,
        editNameValue: userInfo.username || '',
        contact: userInfo.phone || '',
        displayAddress: userInfo.address || '现在设置',
        avatarUrl: userInfo.avatar || '', // 确保这里读的是最新的
      });
    } else {
      this.autoLogin();
    }
  },

  // 自动登录函数
  autoLogin() {
    wx.showLoading({ title: '更新中...' }); // 加个提示体验更好

    wx.login({
      success: (res) => {
        if (!res.code) {
          wx.hideLoading();
          wx.stopPullDownRefresh(); // 停止下拉
          return;
        }

        wx.request({
          url: `${host}/api/user/wechatlogin`,
          method: 'POST',
          data: { code: res.code },
          success: (resp) => {
            wx.hideLoading();
            wx.stopPullDownRefresh(); // 【核心】请求成功，停止下拉

            if (resp.statusCode === 200 && resp.data?.user) {
              const { user, token } = resp.data;
              wx.setStorageSync('userInfo', user);
              wx.setStorageSync('token', token);

              this.setData({
                userInfo: user,
                editNameValue: user.username || '',
                contact: user.phone || '',
                displayAddress: user.address || '现在设置',
                avatarUrl: user.avatar || '',
              });

              wx.showToast({ title: '已更新', icon: 'success' });
            }
          },
          fail: () => {
            wx.hideLoading();
            wx.stopPullDownRefresh();
            wx.showToast({ title: '网络错误', icon: 'none' });
          },
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.stopPullDownRefresh();
      },
    });
  },

  onNameInput(e) { this.setData({ editNameValue: e.detail.value }); },
  onInput(e) { this.setData({ contact: e.detail.value }); },

  onAddressChange(e) {
    const idx = Number(e.detail.value);
    const chosen = ADDRESS_LIST[idx];
    this.setData({ addressIndex: idx, displayAddress: chosen });
  },

  chooseAvatar() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0];
        // 只更新预览，不上传
        that.setData({
          avatarPreview: tempFilePath
        });
      }
    });
  },

  handleUploadError(title) {
    wx.hideLoading();
    wx.showToast({ title: title, icon: 'none' });
    // 上传失败，恢复显示原来的头像
    this.setData({
      avatarUrl: this.data.userInfo.avatar || ''
    });
  },

  saveAll() {
    const token = wx.getStorageSync('token');
    if (!token) return wx.showToast({ title: '请先登录', icon: 'none' });

    wx.showLoading({ title: '保存中...' });

    // 定义保存资料的内部函数
    const saveProfileData = (finalAvatarUrl) => {
      const payload = {
        username: (this.data.editNameValue || '').trim() || undefined,
        address: (this.data.displayAddress && this.data.displayAddress !== '现在设置') ? this.data.displayAddress : undefined,
        contact: (this.data.contact || '').trim() || undefined
        // 注意：后端 api/user/updata/profile 目前不支持直接传 avatarUrl 更新字段
        // 但我们在 upload-avatar 接口里已经更新了数据库的 avatar 字段
        // 所以这里只需要更新文字信息
      };

      if (!payload.username && !payload.address && !payload.contact && !this.data.avatarPreview) {
        wx.hideLoading();
        return wx.showToast({ title: '没有可保存的修改', icon: 'none' });
      }

      wx.request({
        url: `${host}/api/user/updata/profile`,
        method: 'POST',
        header: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: payload,
        success: (res) => {
          wx.hideLoading();
          if (res.statusCode === 200) {
            // 更新本地缓存
            const newUser = { ...this.data.userInfo, ...res.data.user };
            // 如果有新头像，也更新进去
            if (finalAvatarUrl) newUser.avatar = finalAvatarUrl;

            wx.setStorageSync('userInfo', newUser);
            this.setData({
              userInfo: newUser,
              avatarPreview: '', // 清空预览
              avatarUrl: newUser.avatar // 显示最新头像
            });
            wx.showToast({ title: '保存成功', icon: 'success' });
          } else {
            wx.showToast({ title: res.data.error || '保存失败', icon: 'none' });
          }
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: '请求失败', icon: 'none' });
        }
      });
    };

    // --- 判断逻辑：是否有新头像需要上传 ---
    if (this.data.avatarPreview) {
      // 有新头像，先上传
      wx.uploadFile({
        url: `${host}/api/user/upload-avatar`,
        filePath: this.data.avatarPreview,
        name: 'file',
        header: { 'Authorization': `Bearer ${token}` },
        success: (uploadRes) => {
          if (uploadRes.statusCode === 200) {
            const resData = JSON.parse(uploadRes.data);
            // 上传成功后，继续保存文字资料
            saveProfileData(resData.avatarUrl);
          } else {
            wx.hideLoading();
            wx.showToast({ title: '头像上传失败', icon: 'none' });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          wx.showToast({ title: '头像上传网络错误', icon: 'none' });
        }
      });
    } else {
      // 没有新头像，直接保存文字资料
      saveProfileData(null);
    }
  },

  handleLogin() {
    const that = this;
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        wx.login({
          success: (loginRes) => {
            wx.request({
              url: `${host}/api/user/wechatlogin`,
              method: 'POST',
              data: { code: loginRes.code, nickname: res.userInfo.nickName, avatar: res.userInfo.avatarUrl },
              success: (resp) => {
                if (resp.data && resp.data.user && resp.data.token) {
                  const user = resp.data.user;
                  console.log('微信登录后后端返回的用户信息:', user);
                  wx.setStorageSync('userInfo', user);
                  wx.setStorageSync('token', resp.data.token);
                  this.setData({
                    userInfo: user,
                    editNameValue: user.username || '',
                    contact: user.phone || '',
                    displayAddress: user.address || '现在设置',
                    avatarUrl: user.avatar || '', // 设置头像显示
                  });
                  wx.pageScrollTo({ scrollTop: 0, duration: 200 });
                  wx.showToast({ title: '登录成功', icon: 'success' });
                } else {
                  wx.showToast({ title: '登录失败', icon: 'none' });
                }
              },
              fail: (err) => {
                console.error('登录请求失败', err);
                wx.showToast({ title: '登录请求失败', icon: 'none' });
              }
            });
          }
        });
      },
      fail: (err) => { console.log('用户拒绝授权', err); }
    });
  },

  onReady() {},
  onHide() {},
  onUnload() {},
  onPullDownRefresh() {this.autoLogin()},
  onReachBottom() {},
  onShareAppMessage() {}
})
