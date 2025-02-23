import { useState } from 'react'
import { convertToExcalidrawElements } from '@excalidraw/excalidraw'
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types'

export function useDrawing() {
  const [elements, setElements] = useState<readonly ExcalidrawElement[]>(() => convertToExcalidrawElements([]))
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null)

  const updateDrawing = (newElements: ExcalidrawElement[]) => {
    if (!excalidrawAPI) return
    try {
      if (!Array.isArray(newElements)) {
        console.error('Invalid elements data: expected an array')
        return
      }
      const validElements = newElements.filter(element => {
        if (!element || typeof element !== 'object') {
          console.warn('Invalid element:', element)
          return false
        }
        return true
      })
      excalidrawAPI.updateScene({ elements: validElements })
    } catch (error) {
      console.error('Error updating scene:', error)
    }
  }

  return {
    elements,
    setElements,
    excalidrawAPI,
    setExcalidrawAPI,
    updateDrawing
  }
}