const { Configuration, OpenAIApi } = require("openai-edge");

const parameters = {
  model: "gpt-3.5-turbo",
  messages: [
    { role: "system", content: "You generate Hydra code in response to requests from a user." },
    { role: "user", content: "simple one." },
    { role: "assistant", content: "osc(4, 0.1, 1.2).out();" },
    { role: "user", content: "like green forest" },
  ],
  stream: true,
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      // TODO: Add your custom /api/* logic here.
      return await this.chatGPT(env);
    }
    // Otherwise, serve the static assets.
    // Without this, the Worker will error and no assets will be served.
    return env.ASSETS.fetch(request);
  },

  async chatGPT(env) {
    const configuration = new Configuration({
      apiKey: env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    try {
      const completion = await openai.createChatCompletion(parameters);
      return new Response(completion.body, {
        headers: {
          "Content-Type": "text/event-stream;charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: {
          "content-type": "application/json",
        },
      });
    }
  },
};
