import OpenAI from 'openai';
import type { Config } from '../config.js';

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
  embed(texts: string[]): Promise<number[][]>;
}

export function createOpenAiCompatibleClient(
  config: Pick<Config, 'ELICE_API_KEY' | 'ELICE_BASE_URL' | 'EMBEDDING_MODEL'>,
): LlmClient {
  const openai = new OpenAI({
    apiKey: config.ELICE_API_KEY,
    baseURL: config.ELICE_BASE_URL,
  });

  return {
    async chat(model, messages, options = {}) {
      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0,
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
      const stream = await openai.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0,
        stream: true,
      });
      for await (const part of stream) {
        const delta = part.choices[0]?.delta?.content;
        if (delta != null && delta !== '') yield delta;
      }
    },

    async embed(texts) {
      const response = await openai.embeddings.create({
        model: config.EMBEDDING_MODEL,
        input: texts,
      });
      // API는 index 순서를 보장하지 않으므로 명시적으로 정렬한다
      return [...response.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
    },
  };
}
