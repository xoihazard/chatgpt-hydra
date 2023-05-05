import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

const app = createApp(App);

document.addEventListener("DOMContentLoaded", () => {
  const root = app.mount("#app");
});
