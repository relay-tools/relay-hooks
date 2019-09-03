const siteConfig = {
  title: 'Morrys Repositories',
  tagline: 'Collection of libraries usable for the web, react and react-native.',
  url: 'https://relay-tools.github.io',
  baseUrl: '/relay-hooks/',
  projectName: 'relay-hooks',
  organizationName: 'relay-tools',
  headerLinks: [
    { doc: 'relay-hooks', label: 'Docs' },
    {
      href: 'https://github.com/relay-tools/relay-hooks',
      label: 'GitHub',
    },
    { languages: false },
  ],

  /* path to images for header/footer */
  headerIcon: 'img/favicon.ico',
  footerIcon: 'img/favicon.ico',
  favicon: 'img/favicon.ico',
  colors: {
    primaryColor: '#008ed8',
    secondaryColor: '#17afff',
  },

  algolia: {
    apiKey: '5713df2c9cd868e3e65975bd55f1698b',
    indexName: 'relay-tools_relay-hooks',
    placeholder: 'Search'
  },
  /* Custom fonts for website */
  /*
  fonts: {
    myFont: [
      "Times New Roman",
      "Serif"
    ],
    myOtherFont: [
      "-apple-system",
      "system-ui"
    ]
  },
  */

  // This copyright info is used in /core/Footer.js and blog RSS/Atom feeds.
  copyright: `Copyright © ${new Date().getFullYear()} Lorenzo Di Giacomo`,

  highlight: {
    // Highlight.js theme to use for syntax highlighting in code blocks.
    theme: 'default',
  },

  // Add custom scripts here that would be placed in <script> tags.
  scripts: ['https://buttons.github.io/buttons.js'],

  // On page navigation for the current documentation page.
  onPageNav: 'separate',
  // No .html extensions for paths.
  cleanUrl: true,
  scrollToTop: true,
  scrollToTopOptions: {
    zIndex: 100,
  },
  enableUpdateTime: true,
  enableUpdateBy: true,
  // docsSideNavCollapsible: true,

  // Open Graph and Twitter card images.
  ogImage: 'img/undraw_online.svg',
  twitterImage: 'img/undraw_tweetstorm.svg',
  twitterUsername: "m0rrys",

  // You may provide arbitrary config keys to be used as needed by your
  // template. For example, if you need your repo's URL...
  repoUrl: 'https://github.com/relay-tools/relay-hooks',
};

module.exports = siteConfig;