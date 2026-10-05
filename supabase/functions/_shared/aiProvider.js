const REQUEST_TIMEOUT_MS = 90_000

export class AiProviderError extends Error {
  constructor(message, code, status = 502) {
    super(message)
    this.code = code
    this.status = status
  }
}

function getChatCompletionsUrl(configuredUrl) {
  const normalized = configuredUrl.trim().replace(/\/+$/, '')
  return normalized.endsWith('/chat/completions') ? normalized : `${normalized}/chat/completions`
}

function getEmbeddingsUrl(configuredUrl) {
  const normalized = configuredUrl.trim().replace(/\/+$/, '')
  if (normalized.endsWith('/embeddings')) return normalized
  if (normalized.endsWith('/chat/completions')) return `${normalized.slice(0, -'/chat/completions'.length)}/embeddings`
  return `${normalized}/embeddings`
}

export async function embedTexts(texts) {
  const apiUrl = Deno.env.get('AI_API_URL')
  const apiKey = Deno.env.get('AI_API_KEY')
  const model = Deno.env.get('AI_EMBEDDING_MODEL')
  const dimensions = Number(Deno.env.get('AI_EMBEDDING_DIMENSIONS') || 1536)

  if (!apiUrl || !apiKey || !model) {
    throw new AiProviderError('Ask Your Notes embeddings are not configured on the server.', 'EMBEDDINGS_NOT_CONFIGURED', 503)
  }
  if (!Number.isInteger(dimensions) || dimensions !== 1536) {
    throw new AiProviderError('The configured embedding model must return 1536 dimensions.', 'EMBEDDING_DIMENSIONS_MISMATCH', 503)
  }
  if (!Array.isArray(texts) || texts.length < 1 || texts.length > 64) {
    throw new AiProviderError('Embedding batches must contain between 1 and 64 text values.', 'INVALID_EMBEDDING_BATCH', 400)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(getEmbeddingsUrl(apiUrl), {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, input: texts, dimensions }),
      signal: controller.signal,
    })
    if (!response.ok) {
      console.error('Configured AI endpoint rejected an embeddings request.', { status: response.status })
      throw new AiProviderError('The configured AI provider could not create embeddings.', 'EMBEDDING_PROVIDER_ERROR')
    }

    const payload = await response.json()
    if (!Array.isArray(payload?.data) || payload.data.length !== texts.length) {
      throw new AiProviderError('The AI provider returned an incomplete embeddings response.', 'INVALID_EMBEDDING_RESPONSE')
    }
    const ordered = [...payload.data].sort((left, right) => left.index - right.index)
    return ordered.map((item) => {
      if (!Array.isArray(item.embedding) || item.embedding.length !== dimensions || item.embedding.some((value) => !Number.isFinite(value))) {
        throw new AiProviderError('The AI provider returned an embedding with an invalid dimension.', 'EMBEDDING_DIMENSIONS_MISMATCH')
      }
      return item.embedding
    })
  } catch (error) {
    if (error instanceof AiProviderError) throw error
    if (error?.name === 'AbortError') throw new AiProviderError('Embedding generation timed out. Please try again.', 'EMBEDDING_TIMEOUT', 504)
    console.error('AI embeddings request failed.', error)
    throw new AiProviderError('The AI provider could not be reached for embeddings.', 'EMBEDDING_UNAVAILABLE', 502)
  } finally {
    clearTimeout(timeout)
  }
}

export async function completeJson({ systemPrompt, userPrompt, temperature = 0.1, maxTokens = 5000 }) {
  const apiUrl = Deno.env.get('AI_API_URL')
  const apiKey = Deno.env.get('AI_API_KEY')
  const model = Deno.env.get('AI_MODEL')

  if (!apiUrl || !apiKey || !model) {
    throw new AiProviderError('AI summarization is not configured on the server.', 'AI_NOT_CONFIGURED', 503)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(getChatCompletionsUrl(apiUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      console.error('Configured AI endpoint rejected a request.', { status: response.status })
      throw new AiProviderError('The configured AI provider could not complete the summary.', 'AI_PROVIDER_ERROR')
    }

    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      throw new AiProviderError('The AI provider returned an empty response.', 'AI_EMPTY_RESPONSE')
    }

    const jsonText = content.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
    try {
      return JSON.parse(jsonText)
    } catch {
      throw new AiProviderError('The AI provider returned an invalid structured response.', 'AI_INVALID_JSON')
    }
  } catch (error) {
    if (error instanceof AiProviderError) throw error
    if (error?.name === 'AbortError') {
      throw new AiProviderError('Summary generation timed out. Please try again.', 'AI_TIMEOUT', 504)
    }
    console.error('AI provider request failed.', error)
    throw new AiProviderError('The AI provider could not be reached. Please try again.', 'AI_UNAVAILABLE', 502)
  } finally {
    clearTimeout(timeout)
  }
}
