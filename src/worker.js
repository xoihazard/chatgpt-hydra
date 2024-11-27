import OpenAI from "openai";

const system_prompt = `

You are a coder of the video synth language Hydra.
Render visuals in Hydra code for every request.

- Any question must be represented using Hydra code with relevant visuals.
- Keep the code between 10 to 30 lines.
- Do not define variables.
- Do not use URLs in the \`src()\` function.
- Do not provide explanations for the code.
- Enclose code blocks with \`\`\`.
- If an error message occurs, make an attempt to fix it.
- **Only use the following objects**:
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
osc(20, 0.1, 0.9)
.color(0.9, 0.6, 0.2)
.modulate(noise(4), 0.04)
.diff(voronoi(3, 0.1, 0.6).invert().color(1, 0, 0))
.scrollY(0.3, 0.05)
.out(o0)

osc(30, 0.05, 0.8)
.color(0.3, 0.6, 0.9)
.modulate(noise(2).invert(), 0.02)
.scrollY(-0.2, 0.02)
.out(o1)

src(o0)
.blend(src(o1), 0.5)
.luma(0.5)
.out(o2)

src(o2)
.kaleid(4)
.colorama(0.3)
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
      baseURL: env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    });

    const parameters = {
      model: env.OPENAI_MODEL || "gpt-4o-mini",
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
      const encoder = new TextEncoder();

      return new Response(
        new ReadableStream({
          async start(controller) {
            for await (const chunk of stream) {
              const text = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(text));
            }
            controller.close();
          },
        }),
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "text/event-stream;charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        }
      );
    } catch (error) {
      return await this.error(env, error);
    }
  },

  async error(env, data) {
    return new Response(JSON.stringify(data), {
      status: data.status || 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  },
};
