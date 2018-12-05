import $ from 'jquery'
import _ from 'lodash'
import humps from 'humps'
import numeral from 'numeral'
import socket from '../socket'
import { createStore, connectElements } from '../lib/redux_helpers.js'
import { batchChannel } from '../lib/utils'
import listMorph from '../lib/list_morph'
import { createAsyncLoadStore } from '../lib/async_listing_load'

const BATCH_THRESHOLD = 10

export const initialState = {
  channelDisconnected: false,

  pendingTransactionCount: null,

  pendingTransactionsBatch: []
}

function reducer (state = initialState, action) {
  switch (action.type) {
    case 'ELEMENTS_LOAD': {
      return Object.assign({}, state, _.omit(action, 'type'))
    }
    case 'CHANNEL_DISCONNECTED': {
      return Object.assign({}, state, {
        channelDisconnected: true
      })
    }
    case 'RECEIVED_NEW_TRANSACTION': {
      if (state.channelDisconnected) return state

      console.log(state)
      return Object.assign({}, state, {
        items: [action.msg.transactionHtml, ...state.items],
        pendingTransactionCount: state.pendingTransactionCount - 1
      })
    }
    case 'RECEIVED_NEW_PENDING_TRANSACTION_BATCH': {
      if (state.channelDisconnected) return state

      const pendingTransactionCount = state.pendingTransactionCount + action.msgs.length

      if (!state.pendingTransactionsBatch.length && action.msgs.length < BATCH_THRESHOLD) {
        return Object.assign({}, state, {
          items: [
            ...action.msgs.reverse(),
            ...state.items
          ],
          pendingTransactionCount
        })
      } else {
        return Object.assign({}, state, {
          pendingTransactionsBatch: [
            ...action.msgs.reverse(),
            ...state.pendingTransactionsBatch
          ],
          pendingTransactionCount
        })
      }
    }
    case 'REMOVE_PENDING_TRANSACTION': {
      return Object.assign({}, state, {
        items: state.items.filter((transaction) => action.msg.transactionHash !== transaction.transactionHash)
      })
    }
    default:
      return state
  }
}

const elements = {
  '[data-selector="channel-disconnected-message"]': {
    render ($el, state) {
      if (state.channelDisconnected) $el.show()
    }
  },
  '[data-selector="channel-batching-count"]': {
    render ($el, state, oldState) {
      const $channelBatching = $('[data-selector="channel-batching-message"]')
      if (state.pendingTransactionsBatch.length) {
        $channelBatching.show()
        $el[0].innerHTML = numeral(state.pendingTransactionsBatch.length).format()
      } else {
        $channelBatching.hide()
      }
    }
  },
  '[data-selector="transaction-pending-count"]': {
    load ($el) {
      return { pendingTransactionCount: numeral($el.text()).value() }
    },
    render ($el, state, oldState) {
      if (oldState.transactionCount === state.transactionCount) return
      $el.empty().append(numeral(state.transactionCount).format())
    }
  }
}

const $transactionPendingListPage = $('[data-page="transaction-pending-list"]')
if ($transactionPendingListPage.length) {
  const store = createAsyncLoadStore(reducer, initialState, 'dataset.transactionHash')
  connectElements({ store, elements })

  const transactionsChannel = socket.channel(`transactions:new_transaction`)
  transactionsChannel.join()
  transactionsChannel.onError(() => store.dispatch({
    type: 'CHANNEL_DISCONNECTED'
  }))
  transactionsChannel.on('transaction', (msg) => {
    console.log(msg)
    store.dispatch({
      type: 'RECEIVED_NEW_TRANSACTION',
      msg: humps.camelizeKeys(msg)
    })
    setTimeout(() => store.dispatch({
      type: 'REMOVE_PENDING_TRANSACTION',
      msg: humps.camelizeKeys(msg)
    }), 1000)
  })

  const pendingTransactionsChannel = socket.channel(`transactions:new_pending_transaction`)
  pendingTransactionsChannel.join()
  pendingTransactionsChannel.onError(() => store.dispatch({
    type: 'CHANNEL_DISCONNECTED'
  }))
  pendingTransactionsChannel.on('pending_transaction', batchChannel((msgs) => store.dispatch({
    type: 'RECEIVED_NEW_PENDING_TRANSACTION_BATCH',
    msgs: humps.camelizeKeys(msgs)
  })))
}
