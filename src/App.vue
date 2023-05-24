<template>
  <div>
    <canvas class="absolute inset-0 w-screen h-screen -z-50" />
    <Chat v-model="prompt" :title="title" :response="response" :error="error" :messages="messages" :isFetching="isFetching" @send="processForm" @regenerate="regenerate" />
  </div>
</template>

<script>
import Chat from "./components/Chat.vue";
import HydraSynth from "hydra-synth";

export default {
  setup() {},
  components: {
    Chat,
  },
  data() {
    return {
      title: "",
      prompt: "",
      response: "",
      error: null,
      messages: [],
      canvas: null,
      hydra: null,
      hydraCode: "",
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
    response() {
      const regex = /```[^\n]*\n([\s\S]*?)```/gm;
      let matches;

      while ((matches = regex.exec(this.response))) {
        this.hydraCode = matches[1];
        break;
      }
    },
    hydraCode() {
      this.updateHydra(this.hydraCode);
    },
  },
  methods: {
    handleResize() {
      const aspect = this.canvas.scrollWidth / this.canvas.scrollHeight;
      const width = 1024 * aspect;
      const height = 1024;
      this.hydra.setResolution(width, height);
    },
    updateHydra(code) {
      const { src, osc, gradient, shape, voronoi, noise, solid, s0, s1, s2, s3, o0, o1, o2, o3, render, time, a, mouse, mouseX, mouseY } = this.hydra.synth;
      const jsString = `(() => {${code}})()`;
      try {
        this.error = null;
        eval(jsString);
      } catch (error) {
        this.error = String(error);
      }
    },
    async processForm() {
      if (this.prompt.length > 0) {
        this.chat(this.prompt);
        this.prompt = "";
      }
    },
    async regenerate() {
      while (this.messages.length > 0 && this.messages[this.messages.length - 1].role == "assistant") {
        this.messages.pop();
      }
      this.chat();
    },
    async chat(prompt = null) {
      if (this.isFetching) {
        this.isAborted = true;
      }
      this.isFetching = true;

      if (prompt !== null) {
        this.title = prompt;
        this.messages.push({
          role: "user",
          content: prompt,
        });
      }

      const endpoint = process.env.API_ENDPOINT;
      const messages = this.messages.slice(Math.max(this.messages.length - 4, 0));

      const controller = new AbortController();
      const signal = controller.signal;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: messages }),
        signal: signal,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      this.response = "";

      try {
        while (true) {
          if (this.isAborted) {
            controller.abort();
            this.isAborted = false;
            break;
          }

          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunks = decoder.decode(value).trim().split("\n\n");

          try {
            const dataArray = [];
            for (const chunk of chunks) {
              if (chunk.startsWith("data: {")) {
                dataArray.push(JSON.parse(chunk.substring(6)));
              }
            }
            for (const data of dataArray) {
              if ("choices" in data) {
                if ("content" in data.choices[0].delta) {
                  this.response += data.choices[0].delta.content;
                }
              }
            }
          } catch (error) {
            if (error.name === "AbortError") {
              console.log("Fetch aborted");
            } else {
              console.error(error);
            }
          }
        }

        this.messages.push({
          role: "assistant",
          content: this.response,
        });
      } catch (error) {
        console.error(error);
      }

      this.isFetching = false;
      this.isAborted = false;
    },
  },
};
</script>
