<template>
  <div>
    <canvas class="absolute inset-0 w-screen h-screen -z-50" />
    <Navbar />
    <Chat v-model="prompt" :title="title" :response="responseText" :error="error" :messages="messages" :isPending="isPending" :isFetching="isFetching" :isRateLimit="isRateLimit" @send="processForm" @regenerate="regenerate" @tryToFix="tryToFix" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import Navbar from "./components/Navbar.vue";
import Chat from "./components/Chat.vue";
import HydraSynth from "hydra-synth";
import { fetchEventSource } from "@microsoft/fetch-event-source";

const MAX_MESSAGES = 6;
const CANVAS_BASE_WIDTH = 1024;

const title = ref("");
const prompt = ref("");
const responseText = ref("");
const error = ref(null);
const messages = ref([]);
const canvas = ref(null);
const hydra = ref(null);
const code = ref("");
const controller = ref(null);
const isPending = ref(false);
const isFetching = ref(false);
const isRateLimit = ref(false);

watch(responseText, () => {
  // Extract code from response text
  const regex = /```[^\n]*\n([\s\S]*?)```/gm;
  let matches;

  while ((matches = regex.exec(responseText.value))) {
    code.value = matches[1];
    break;
  }
});

watch(code, () => {
  updateHydra(code.value);
});

const updateHydra = (code) => {
  hydra.value.hush();
  const { src, osc, gradient, shape, voronoi, noise, solid, s0, s1, s2, s3, o0, o1, o2, o3, render, time, a, mouse, width, height } = hydra.value.synth;
  const mouseX = mouse.x,
    mouseY = mouse.y;

  try {
    error.value = null;
    eval(`(() => {${code}})()`);
  } catch (err) {
    error.value = String(err);
  }
};

const processForm = () => {
  if (prompt.value.length > 0) {
    chat(prompt.value);
    prompt.value = "";
    error.value = null;
  }
};

const addUserMessage = (prompt) => {
  messages.value.push({
    role: "user",
    content: `${prompt}`,
  });
};

const regenerate = () => {
  // Delete last assistant role message
  while (messages.value.length > 0 && messages.value[messages.value.length - 1].role == "assistant") {
    messages.value.pop();
  }
  chat();
};

const tryToFix = () => {
  chat(error.value, false);
};

const abortChat = () => {
  if (controller.value) {
    controller.value.abort();
    controller.value = null;
    isFetching.value = false;
    isPending.value = false;
  }
};

const chat = async (promptValue = null, updateTitle = true) => {
  if (controller.value) {
    abortChat();
  }

  isPending.value = true;
  isRateLimit.value = false;

  if (promptValue !== null) {
    addUserMessage(promptValue);
    if (updateTitle) {
      title.value = promptValue;
    }
  }

  const latestMessages = messages.value.slice(Math.max(messages.value.length - MAX_MESSAGES, 0));

  controller.value = new AbortController();
  isFetching.value = true;
  responseText.value = "";

  try {
    await fetchEventSource(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: latestMessages }),
      signal: controller.value.signal,
      onopen: (response) => {
        isPending.value = false;
        if (response.ok && response.headers.get("content-type") === "text/event-stream") {
          return;
        } else if (response.status == 429) {
          // Rate limit
          isRateLimit.value = true;
          return;
        } else {
          return;
        }
      },
      onmessage: (event) => {
        const data = JSON.parse(event.data);
        const content = data?.choices?.[0]?.delta?.content || "";
        responseText.value += content;
      },
      onclose: (event) => {},
    });
  } catch (error) {
  } finally {
    isFetching.value = false;
    controller.value = null;

    messages.value.push({
      role: "assistant",
      content: responseText.value,
    });
  }
};

const handleResize = () => {
  const aspect = canvas.value.scrollWidth / canvas.value.scrollHeight;
  const width = CANVAS_BASE_WIDTH * aspect;
  const height = CANVAS_BASE_WIDTH;
  hydra.value.setResolution(width, height);
};

onMounted(() => {
  canvas.value = document.querySelector("canvas");
  hydra.value = new HydraSynth({ canvas: canvas.value, makeGlobal: false });

  handleResize();
  window.addEventListener("resize", handleResize);

  chat("Television");
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", handleResize);
});
</script>
