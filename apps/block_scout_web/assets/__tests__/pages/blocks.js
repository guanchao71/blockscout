import { reducer, initialState, placeHolderBlock } from '../../js/pages/blocks'

test('CHANNEL_DISCONNECTED', () => {
  const state = initialState
  const action = {
    type: 'CHANNEL_DISCONNECTED'
  }
  const output = reducer(state, action)

  expect(output.channelDisconnected).toBe(true)
})

describe('RECEIVED_NEW_BLOCK', () => {
  test('receives new block', () => {
    const action = {
      type: 'RECEIVED_NEW_BLOCK',
      msg: {
        blockHtml: 'test',
        blockNumber: 1
      }
    }
    const output = reducer(initialState, action)

    expect(output.blocks).toEqual([
      { blockNumber: 1, blockHtml: 'test' }
    ])
  })
  test.skip('inserts place holders if block received out of order', () => {
    window.localized = {}
    const state = Object.assign({}, initialState, {
      blocks: [
        { blockNumber: 2, blockHtml: 'test 2' }
      ]
    })
    const action = {
      type: 'RECEIVED_NEW_BLOCK',
      msg: {
        blockHtml: 'test 5',
        blockNumber: 5
      }
    }
    const output = reducer(state, action)

    expect(output.blocks).toEqual([
      { blockNumber: 5, blockHtml: 'test 5' },
      { blockNumber: 4, blockHtml: placeHolderBlock(4) },
      { blockNumber: 3, blockHtml: placeHolderBlock(3) },
      { blockNumber: 2, blockHtml: 'test 2' }
    ])
  })
  test('replaces duplicated block', () => {
    const state = Object.assign({}, initialState, {
      blocks: [
        { blockNumber: 5, blockHtml: 'test 5' },
        { blockNumber: 4, blockHtml: 'test 4' }
      ]
    })
    const action = {
      type: 'RECEIVED_NEW_BLOCK',
      msg: {
        blockHtml: 'test5',
        blockNumber: 5
      }
    }
    const output = reducer(state, action)

    expect(output.blocks).toEqual([
      { blockNumber: 5, blockHtml: 'test5' },
      { blockNumber: 4, blockHtml: 'test 4' }
    ])
  })
  test('skips if new block height is lower than lowest on page', () => {
    const state = Object.assign({}, initialState, {
      blocks: [
        { blockNumber: 5, blockHtml: 'test 5' },
        { blockNumber: 4, blockHtml: 'test 4' },
        { blockNumber: 3, blockHtml: 'test 3' },
        { blockNumber: 2, blockHtml: 'test 2' }
      ]
    })
    const action = {
      type: 'RECEIVED_NEW_BLOCK',
      msg: {
        blockNumber: 1,
        blockHtml: 'test 1'
      }
    }
    const output = reducer(state, action)

    expect(output.blocks).toEqual([
      { blockNumber: 5, blockHtml: 'test 5' },
      { blockNumber: 4, blockHtml: 'test 4' },
      { blockNumber: 3, blockHtml: 'test 3' },
      { blockNumber: 2, blockHtml: 'test 2' }
    ])
  })
})
