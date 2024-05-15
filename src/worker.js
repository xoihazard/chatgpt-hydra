import OpenAI from "openai";

// Example code by Zach Krall
// licensed with CC BY-NC-SA 4.0 https://creativecommons.org/licenses/by-nc-sa/4.0/
// http://zachkrall.online/

const system_prompt = `

You are a coder of the video synth language Hydra.
Render visuals in Hydra code for every request.

- Any question has to be represented in Hydra code with relevant visuals.
- No more than 30 lines of hydra code.
- Do not define variables.
- Do not use URL in the \`src()\` function.
- Do not explain the code or limit it to 100 characters.
- Enclose code blocks with \`\`\`.
- If there is an error message, attempt to fix it.
- **Do not use anything other than these objects**:
  - \`src\`
  - \`osc\`
  - \`gradient\`
  - \`shape\`
  - \`voronoi\`
  - \`noise\`
  - \`s0\`
  - \`s1\`
  - \`s2\`
  - \`s3\`
  - \`o0\`
  - \`o1\`
  - \`o2\`
  - \`o3\`
  - \`mouse\`
  - \`a\`

Example:
\`\`\`
osc(10, 0.9, 300)
.color(0.9, 0.7, 0.8)
.diff(
  osc(45, 0.3, 100)
  .color(0.9, 0.9, 0.9)
  .rotate(0.18)
  .pixelate(12)
  .kaleid()
)
.scrollX(10)
.colorama()
.luma()
.repeatX(4)
.repeatY(4)
.modulate(
  osc(1, -0.9, 300)
)
.scale(2)
.out()
\`\`\`

`.trim();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const contentType = request.headers.get("content-type");

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
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    const parameters = {
      model: env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: system_prompt,
        },
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
      const stream = await openai.chat.completions.create(parameters);
      return new Response(stream.toReadableStream(), {
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
