import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "AmiaBot",
  description: "以 Project&nbsp;Sekai 的暁山瑞希为主题的基于 OneBot(NapCat) 接口的QQ机器人",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: '使用指南', link: '/guide/' },
      { text: '部署方式', link: '/deploy/' },
      { text: '二次开发', link: '/development/' }
    ],

    sidebar: [
      {
        text: '使用指南',
        items: [
          { text: '核心功能介绍', link: '/guide/' },
          { text: '指令格式说明', link: '/guide/commands' }
        ]
      },
      {
        text: '部署方式',
        items: [
          { text: '部署指南', link: '/deploy/' }
        ]
      },
      {
        text: '二次开发',
        items: [
          { text: '开发指南', link: '/development/' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ]
  }
})
