const { Configuration, OpenAIApi } = require("openai-edge");

// We have decided to block access from the *.pages.dev domain as it is not possible to apply Cloudflare's WAF to this domain.
const denyHostname = /^(?:[^\.]+\.pages\.dev)$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const contentType = request.headers.get("content-type");

    if (denyHostname.test(url.hostname)) {
      return await this.deny(env, "Access denied.");
    }

    if (url.pathname.startsWith("/api/")) {
      // preflight
      if (request.method === "OPTIONS") {
        return new Response(JSON.stringify({}), {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
            "Access-Control-Allow-Headers": "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization",
            "Content-Type": "application/json",
          },
        });
      }

      if (request.method === "POST" && contentType.includes("application/json")) {
        return await this.chatGPT(env, await request.json());
      } else {
        return await this.error(env, {});
      }
    }
    // Otherwise, serve the static assets.
    // Without this, the Worker will error and no assets will be served.
    return env.ASSETS.fetch(request);
  },

  async chatGPT(env, json) {
    const configuration = new Configuration({
      apiKey: env.OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const parameters = {
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a coder of the video synth language Hydra. Render visuals in Hydra code for every request. Any question has to be represented in Hydra code with relevant visuals. No more than 20 lines of hydra code. Do not use anything other than these objects: `src`, `osc`, `gradient`, `shape`, `voronoi`, `noise`, `s0`, `s1`, `s2`, `s3`, `o0`, `o1`, `o2`, `o3`, `mouse`, `a`. Do not define variables and do not use URL in the `src()` function. Do not explain the code or limit it to 100 characters. Don't give long explanations, keep it simple." },
        { role: "user", content: "Simple one." },
        { role: "assistant", content: "```\nosc(4, 0.1, 1.2).out()\n```\n" },
      ],
      stream: true,
    };

    if ("messages" in json) {
      parameters.messages = parameters.messages.concat(json["messages"]);
    } else {
      parameters.messages.push({
        role: "user",
        content: "one more.",
      });
    }

    try {
      const completion = await openai.createChatCompletion(parameters);
      return new Response(completion.body, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "text/event-stream;charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    } catch (error) {
      return await this.error(env, error);
    }
  },

  async error(env, data) {
    return new Response(JSON.stringify(data), {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  },

  async deny(env, data) {
    return new Response(JSON.stringify(data), {
      status: 403,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  },
};
