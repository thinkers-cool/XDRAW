import { Excalidraw } from '@excalidraw/excalidraw'
import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types'

interface DrawingCanvasProps {
  elements: readonly ExcalidrawElement[]
  onElementsChange: (elements: readonly ExcalidrawElement[]) => void
  onExcalidrawAPIChange: (api: ExcalidrawImperativeAPI) => void
}

export function DrawingCanvas({ elements, onElementsChange, onExcalidrawAPIChange }: DrawingCanvasProps) {
  return (
    <Excalidraw
      excalidrawAPI={onExcalidrawAPIChange}
      initialData={{
        elements: elements,
        appState: {}
      }}
      onChange={onElementsChange}
      gridModeEnabled
      theme="dark"
      zenModeEnabled={false}
      viewModeEnabled={false}
    />
  )
}