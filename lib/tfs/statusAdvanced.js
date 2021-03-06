/* global console */

const statusManager = require('../utils/statusManager')
const tfs = require('tfs')
const vscode = require('vscode')

/**
 * Get the list of pending changes for the entire workspace.
 *
 * @module  TFS Status
 * @version 0.7.0
 *
 * @param {Array} itemspec File(s) and folder(s) to get status of.
 */
module.exports = (itemspec) => {
  vscode.window.setStatusBarMessage('TFS: Listing pending changes...')

  const callback = (responseError, response) => {
    if (responseError) {
      vscode.window.setStatusBarMessage(null)
      vscode.window.showErrorMessage('TFS: ' + responseError.error)
      return
    }

    vscode.window.setStatusBarMessage('TFS: Pending changes successfully listed.')

    if (!response.hasPendingChanges) {
      vscode.window.showInformationMessage('TFS: ' + response.message)
      return
    }

    let changes = []
    let excludedChanges = []
    let excludedFilesPaths = statusManager.list()

    if (response.status.includedChanges.length) {
      response.status.includedChanges.forEach((change) => {
        if (excludedFilesPaths.indexOf(change.filePath) !== -1) {
          excludedChanges.push(change)
          return
        }

        changes.push({
          label:       change.fileName,
          detail:      change.filePath,
          description: change.action.toUpperCase(),
          action:      'exclude'
        })
      })

      if (changes.length) {
        changes.unshift({
          label:       '◊ INCLUDED CHANGES',
          description: '⏎ or click to exclude a file from the next checkin.',
          detail:      '‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾'
        })
      }
    }

    if (response.status.detectedChanges.length) {
      if (changes.length) {
        changes.push('')
      }

      changes.push({
        label:       '◊ DETECTED CHANGES (= out of TFS)',
        description: '⏎ or click to make TFS take into account this change.',
        detail:      '‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾'
      })

      response.status.detectedChanges.forEach((change) => {
        changes.push({
          label:       change.fileName,
          detail:      change.filePath,
          description: change.action.toUpperCase(),
          action:      change.action
        })
      })
    }

    if (excludedChanges.length) {
      if (changes.length) {
        changes.push('')
      }

      changes.push({
        label:       '◊ EXCLUDED CHANGES',
        description: '⏎ or click to include a file to the next checkin.',
        detail:      '‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾'
      })

      excludedChanges.forEach((change) => {
        changes.push({
          label:       change.fileName,
          detail:      change.filePath,
          description: change.action.toUpperCase(),
          action:      'include'
        })
      })
    }

    vscode.window.showQuickPick(changes)
      .then((change) => {
        if (!change || !change.action) {
          status(itemspec)
          return
        }

        switch (change.action) {
          case 'exclude':
            statusManager.exclude(change.detail)
            break

          case 'include':
            statusManager.include(change.detail)
            break
        }

        status(itemspec)
      })
  }

  tfs('status', itemspec, {
    recursive: true
  }, callback)
}
