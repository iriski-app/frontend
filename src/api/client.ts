const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export interface ApiErrorDetails {
  instrument_id?: string
  isin?: string
  field?: string
  as_of_date?: string
  currency?: string
}

function parseDetails(value: unknown): ApiErrorDetails | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const data = value as Record<string, unknown>
  const details: ApiErrorDetails = {}
  for (const key of ['instrument_id', 'isin', 'field', 'as_of_date', 'currency'] as const) {
    if (typeof data[key] === 'string') details[key] = data[key]
  }
  return details
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: ApiErrorDetails

  constructor(status: number, code: string, message: string, details?: ApiErrorDetails) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = parseDetails(details)
  }
}

interface ApiErrorResponse {
  code?: string
  message?: string
  details?: unknown
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    let errorData: ApiErrorResponse

    try {
      const data: unknown = await response.json()
      errorData = data && typeof data === 'object' ? (data as ApiErrorResponse) : {}
    } catch {
      errorData = {}
    }

    throw new ApiError(
      response.status,
      typeof errorData.code === 'string' ? errorData.code : 'UNKNOWN_ERROR',
      typeof errorData.message === 'string'
        ? errorData.message
        : `Ошибка сервера: ${response.status}`,
      parseDetails(errorData.details),
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
