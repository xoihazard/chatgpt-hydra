const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { VueLoaderPlugin } = require("vue-loader");
const package = require("./package.json");
const now = new Date();

module.exports = {
  entry: {
    app: "./src/index.js",
    _worker: "./src/worker.js",
  },

  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
    library: {
      type: "umd",
      export: "default",
    },
    globalObject: "this",
  },

  devServer: {
    watchFiles: ["src/**/*"],
    static: {
      directory: path.resolve(__dirname, "dist"),
    },
    port: 9000,
    open: true,
  },

  plugins: [
    new webpack.DefinePlugin({
      global: { window: {} },
      API_ENDPOINT: JSON.stringify(process.env.API_ENDPOINT || "/api/"),
      BUILT_AT: now.getTime(),
      TITLE: JSON.stringify(package.title),
    }),
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "src/index.html",
      inject: "head",
      minify: false,
      meta: {
        viewport: "width=device-width, initial-scale=1, shrink-to-fit=no",
      },
      chunks: ["app"],
      templateParameters: {
        package: package,
      },
    }),
  ],

  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: "vue-loader",
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
      },
    ],
  },
};
