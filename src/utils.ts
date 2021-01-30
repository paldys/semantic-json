interface SuccessfulSafeJsonParse {
  status: 'ok'
  json: ReturnType<JSON['parse']>
}

interface FailingSafeJsonParse {
  status: 'error'
  message: string
}

export const safeJsonParse = (s: string): SuccessfulSafeJsonParse | FailingSafeJsonParse => {
  try {
    const json = JSON.parse(s)
    return {status: 'ok', json}
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {status: 'error', message: error.message}
    }
    throw error
  }
}
