export default ({ body, title }) => {
    return `
      <!DOCTYPE html>
      <html lang="en" data-framework="relay">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <link rel="stylesheet" href="/public/base.css">
    <link rel="stylesheet" href="/public/index.css">
  </head>
  <body>
    <div id="root">${body}</div>
    <script src="http://localhost:3000/webpack-dev-server.js"></script>
    <script src="js/app.js"></script>
  </body>
</html>
    `;
  };