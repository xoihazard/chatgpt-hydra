const webpack = require("webpack");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { VueLoaderPlugin } = require("vue-loader");

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
    }),
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "src/index.html",
      minify: false,
      meta: {
        viewport: "width=device-width, initial-scale=1, shrink-to-fit=no",
      },
      chunks: ["app"],
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
