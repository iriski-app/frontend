import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLocalId } from './ids'

afterEach(() => vi.unstubAllGlobals())

describe('createLocalId', () => {
  it('создаёт разные UUID без randomUUID', () => {
    let nextId = 0
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes[15] = ++nextId
        return bytes
      },
    })

    const first = createLocalId()
    const second = createLocalId()

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(second).not.toBe(first)
  })
})
