/*
 * ENERGIZE — data hooks
 *
 * A small, explicit async-state primitive. It never substitutes placeholder
 * data for a failed request: on failure the data stays null and the error
 * message is surfaced verbatim.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export type AsyncState<T> = {
  data: T | null
  error: string | null
  status: AsyncStatus
  reload: () => void
}

export function useAsync<T>(
  run: () => Promise<T>,
  deps: React.DependencyList,
  options?: { enabled?: boolean },
): AsyncState<T> {
  const enabled = options?.enabled ?? true

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<AsyncStatus>('idle')
  const [nonce, setNonce] = useState(0)

  const runRef = useRef(run)
  runRef.current = run

  useEffect(() => {
    if (!enabled) {
      setStatus('idle')
      return
    }

    let active = true
    setStatus('loading')
    setError(null)

    runRef
      .current()
      .then((result) => {
        if (!active) return
        setData(result)
        setStatus('success')
      })
      .catch((cause: unknown) => {
        if (!active) return
        setData(null)
        setError(
          cause instanceof Error
            ? cause.message
            : 'An unexpected error occurred while loading data.',
        )
        setStatus('error')
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled])

  const reload = useCallback(() => {
    setNonce((value) => value + 1)
  }, [])

  return { data, error, status, reload }
}
