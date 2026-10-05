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
