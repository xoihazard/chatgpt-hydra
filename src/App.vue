<template>
  <div>
    <canvas class="absolute inset-0 w-screen h-screen -z-50" />
    <Navbar />
    <Chat v-model="prompt" :title="title" :response="responseText" :error="error" :messages="messages" :isPending="isPending" :isFetching="isFetching" @send="processForm" @regenerate="regenerate" />
  </div>
</template>

<script>
import Navbar from "./components/Navbar.vue";
import Chat from "./components/Chat.vue";
import HydraSynth from "hydra-synth";

export default {
  setup() {},
  components: {
    Navbar,
    Chat,
  },
  data() {
    return {
      title: "",
      prompt: "",
      responseText: "",
      error: null,
      messages: [],
      canvas: null,
      hydra: null,
      code: "",
      isPending: false,
      isFetching: false,
      isAborted: false,
    };
  },
  mounted() {
    this.canvas = this.$el.querySelector("canvas");
    this.hydra = new HydraSynth({ canvas: this.canvas, makeGlobal: false });

    this.handleResize();
    window.addEventListener("resize", this.handleResize);

    this.chat("Express a modern and beautiful pattern which reflects mouse movement.");
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.handleResize);
  },
  watch: {
    responseText() {
      // Extract code from response text
      const regex = /```[^\n]*\n([\s\S]*?)```/gm;
      let matches;

      while ((matches = regex.exec(this.responseText))) {
        this.code = matches[1];
        break;
      }
    },
    code() {
      this.updateHydra(this.code);
    },
  },
  methods: {
    updateHydra(code) {
      const { src, osc, gradient, shape, voronoi, noise, solid, s0, s1, s2, s3, o0, o1, o2, o3, render, time, a, mouse, width, height } = this.hydra.synth;
      const mouseX = mouse.x,
        mouseY = mouse.y;

      try {
        this.error = null;
        eval(`(() => ${code})()`);
      } catch (error) {
        this.error = String(error);
      }
    },
    processForm() {
      if (this.prompt.length > 0) {
        this.chat(this.prompt);
        this.prompt = "";
        this.error = null;
      }
    },
    addUserMessage(prompt) {
      this.messages.push({
        role: "user",
        content: `${prompt}\n\nNo more than 12 lines of hydra code.`,
      });
    },
    regenerate() {
      // Delete last assistant role message
      while (this.messages.length > 0 && this.messages[this.messages.length - 1].role == "assistant") {
        this.messages.pop();
      }
      this.chat();
    },
    async chat(prompt = null) {
      this.isPending = true;

      if (prompt !== null) {
        this.title = prompt;
        this.addUserMessage(prompt);
      }

      // Get last 4 messages

      const messages = this.messages.slice(Math.max(this.messages.length - 4, 0));

      // Fetch response from API

      if (this.isFetching) this.isAborted = true;
      this.isFetching = true;

      const controller = new AbortController();
      const signal = controller.signal;

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: messages }),
        signal: signal,
      });

      this.isPending = false;
      this.responseText = "";

      // Decode Server-Sent Events

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      try {
        while (true) {
          if (this.isAborted) {
            controller.abort();
            this.isAborted = false;
            break;
          }

          const { done, value } = await reader.read();

          if (done) break;

          const chunks = decoder.decode(value).trim().split("\n\n");

          try {
            const dataArray = [];

            for (const chunk of chunks) {
              if (chunk.startsWith("data: {")) {
                // Remove "data: " header and parse JSON
                dataArray.push(JSON.parse(chunk.substring(6)));
              }
            }

            // Extract text from ChatGPT choices
            for (const data of dataArray) {
              if ("choices" in data) {
                if ("content" in data.choices[0].delta) {
                  this.responseText += data.choices[0].delta.content;
                }
              }
            }
          } catch (error) {
            if (error.name === "AbortError") {
              console.error("Fetch aborted.");
            } else {
              console.error(error);
            }
          }
        }

        this.messages.push({
          role: "assistant",
          content: this.responseText,
        });
      } catch (error) {
        console.error(error);
      }

      this.isFetching = false;
      this.isAborted = false;
    },
    handleResize() {
      const aspect = this.canvas.scrollWidth / this.canvas.scrollHeight;
      const width = 1024 * aspect;
      const height = 1024;
      this.hydra.setResolution(width, height);
    },
  },
};
</script>
