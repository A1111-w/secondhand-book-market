// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    tabList: [

      {
        pagePath: "/pages/homepage/homepage",
        text: "首页",
        iconPath: "/images/tab-home.png",
        selectedIconPath: "/images/tab-home-active.png"
      },
      {
        pagePath: "/pages/my_products/my_products",
        text: "发布",
        iconPath: "/images/tab-product.png",
        selectedIconPath: "/images/tab-product-active.png"
      },
      {
        pagePath: "/pages/message/message",
        text: "消息",
        iconPath: "/images/tab-message.png",
        selectedIconPath: "/images/tab-message-active.png"
      },
      {
        pagePath: "/pages/gr/gr",
        text: "我的",
        iconPath: "/images/tab-my.png",
        selectedIconPath: "/images/tab-my-active.png"
      }
    ]
  },



  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const tab = this.data.tabList[index];

      wx.switchTab({
        url: tab.pagePath
      });
      // 这里我们不再调用 setData
      // 因为页面跳转后，由目标页面的 onShow 来设置
    },


    onChange(index) {
      this.setData({
        selected: index
      });
    },

    goAddPage() {
      wx.navigateTo({
        url: '/pages/add_product/add_product'
      });
    }
  }
});
