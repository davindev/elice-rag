import OpenAI from 'openai';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
}

/**
 * LLM/Embedding 호출 경계 인터페이스.
 * 엘리스 ML API의 OpenAI 계열 모델은 mlapi.run으로 OpenAI 호환이지만,
 * 비호환(BentoML 커스텀 엔드포인트) 모델로 교체될 가능성에 대비해
 * 파이프라인 코드는 이 인터페이스에만 의존한다.
 */
export interface LlmClient {
  chat(
    model: string,
    messages: ChatMessage[],
    options?: { temperature?: number },
  ): Promise<ChatResult>;
  chatStream(
    model: string,
    messages: ChatMessage[],
    options?: { temperature?: number },
  ): AsyncIterable<string>;
  embed(model: string, texts: string[]): Promise<number[][]>;
}

export interface ClientConfig {
  apiKey: string;
  /** model 이름 → 그 모델의 base_url. 엘리스는 모델(엔드포인트)마다 base_url이 다르다 */
  endpoints: Record<string, string>;
  /**
   * temperature를 지원하지 않는 모델 집합. reasoning 모델(예: GPT-5.6 Sol)은
   * temperature=0을 400으로 거부하므로, 이 집합의 모델에는 temperature를 아예 보내지 않는다.
   * (스모크 테스트로 실측해 채운다)
   */
  noTemperatureModels?: ReadonlySet<string>;
}

export function createOpenAiCompatibleClient(config: ClientConfig): LlmClient {
  const noTemperature = config.noTemperatureModels ?? new Set<string>();
  // model → OpenAI SDK 클라이언트 (엔드포인트별로 1개씩 캐시)
  const clients = new Map<string, OpenAI>();
  const clientFor = (model: string): OpenAI => {
    const cached = clients.get(model);
    if (cached !== undefined) return cached;
    const baseURL = config.endpoints[model];
    if (baseURL === undefined) {
      throw new Error(`모델 '${model}'의 base_url이 설정되지 않았습니다 (config.endpoints 확인)`);
    }
    const client = new OpenAI({ apiKey: config.apiKey, baseURL });
    clients.set(model, client);
    return client;
  };

  // temperature 지원 모델에만 값을 실어 보낸다 (미지원 모델엔 파라미터 자체를 생략)
  const temperatureParam = (model: string, value: number | undefined) =>
    noTemperature.has(model) ? {} : { temperature: value ?? 0 };

  return {
    async chat(model, messages, options = {}) {
      const response = await clientFor(model).chat.completions.create({
        model,
        messages,
        ...temperatureParam(model, options.temperature),
      });
      const choice = response.choices[0];
      if (choice?.message.content == null) {
        throw new Error(`LLM 응답에 content가 없습니다 (model: ${model})`);
      }
      return {
        content: choice.message.content,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    },

    async *chatStream(model, messages, options = {}) {
      const stream = await clientFor(model).chat.completions.create({
        model,
        messages,
        ...temperatureParam(model, options.temperature),
        stream: true,
      });
      for await (const part of stream) {
        const delta = part.choices[0]?.delta?.content;
        if (delta != null && delta !== '') yield delta;
      }
    },

    async embed(model, texts) {
      const response = await clientFor(model).embeddings.create({ model, input: texts });
      // API는 index 순서를 보장하지 않으므로 명시적으로 정렬한다
      return [...response.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
    },
  };
}
