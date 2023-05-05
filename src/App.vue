<template>
  <div>
    <canvas class="absolute inset-0 w-screen h-screen -z-50" />
    <div
      class="absolute inset-0 mx-auto max-w-xl px-4 h-screen py-5 sm:px-6 lg:px-8"
    >
      <div
        class="mx-auto max-w-3xl flex flex-col justify-center items-center h-full"
      >
        <div class="self-center w-full overflow-hidden">
          <pre class="whitespace-pre-wrap">{{ message }}</pre>
        </div>
        <form @submit.prevent="processForm" class="mt-auto w-full">
          <div>
            <label for="prompt" class="sr-only">Search candidates</label>
            <div class="mt-2 flex rounded-md shadow-sm">
              <div
                class="relative flex flex-grow items-stretch focus-within:z-10"
              >
                <input
                  type="text"
                  id="prompt"
                  v-model="prompt"
                  class="block w-full rounded-none rounded-l-md border-0 py-1.5 px-3 text-indigo-200 bg-black ring-1 ring-inset ring-indigo-600 placeholder:text-indigo-600 focus:ring-2 focus:ring-inset focus:ring-indigo-600 md:text-lg sm:text-sm sm:leading-6"
                  placeholder="Send a message."
                />
              </div>
              <button
                type="submit"
                class="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-2 text-sm font-semibold text-indigo-400 bg-black ring-1 ring-inset ring-indigo-600 hover:bg-indigo-400 hover:text-black"
              >
                Send
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import Hydra from "hydra-synth";

export default {
  setup() {},
  components: {},
  data() {
    return {
      prompt: "",
      message: "",
      code: "",
      canvas: null,
      hydra: null,
    };
  },
  mounted() {
    this.canvas = this.$el.querySelector("canvas");
    this.handleResize();
    window.addEventListener("resize", this.handleResize);
    this.hydra = new Hydra({ canvas: this.canvas, makeGlobal: false }).synth;
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.handleResize);
  },
  watch: {
    message() {
      const regex = /```([\s\S]*?)```/gm;
      let matches;

      while ((matches = regex.exec(this.message))) {
        this.code = matches[1];
        break;
      }
    },
    code() {
      this.updateHydra(this.code);
    },
  },
  methods: {
    handleResize() {
      const aspect = this.canvas.scrollWidth / this.canvas.scrollHeight;
      this.canvas.width = 1024 * aspect;
      this.canvas.height = 1024;
    },
    updateHydra(code) {
      const {
        src,
        osc,
        gradient,
        shape,
        voronoi,
        noise,
        solid,
        s0,
        s1,
        s2,
        s3,
        o0,
        o1,
        o2,
        o3,
        render,
        time,
      } = this.hydra;
      try {
        eval(code);
      } catch (error) {
        console.error(error);
      }
    },
    async processForm() {
      if (this.prompt.length > 0) {
        this.chat(this.prompt);
        this.prompt = "";
      }
    },
    async chat(prompt) {
      const endpoint = "/api/";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: prompt,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      this.message = "";

      try {
        while (true) {
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
                  this.message += data.choices[0].delta.content;
                }
              }
            }
          } catch (error) {
            console.error(error);
          }
        }
      } catch (error) {
        console.error(error);
      }
    },
  },
};
</script>
