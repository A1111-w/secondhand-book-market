import { activeEnvironment, paperSiteUrl } from '../../config.js';

Page({
  data: {
    url: '',
    isConfigured: false,
    configurationMessage: ''
  },

  onLoad() {
    const isHttpUrl = /^https?:\/\//i.test(paperSiteUrl);
    const isProductionUrl = /^https:\/\//i.test(paperSiteUrl);
    const isConfigured = activeEnvironment === 'production' ? isProductionUrl : isHttpUrl;

    this.setData({
      url: isConfigured ? paperSiteUrl : '',
      isConfigured,
      configurationMessage: activeEnvironment === 'production'
        ? '论文写作平台地址尚未配置，请在 config.js 中填写已备案的 HTTPS 业务域名。'
        : '开发环境的论文写作平台地址尚未配置。'
    });
  },

  handleWebViewError() {
    wx.showToast({ title: '论文平台暂时无法打开', icon: 'none' });
  },

  goBack() {
    wx.navigateBack();
  }
});
