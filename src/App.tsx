import { useDrawing } from '@/hooks/useDrawing'
import { DrawingCanvas } from '@/components/DrawingCanvas'
import { Toolbar } from '@/components/Toolbar'
import { AIAssistant } from '@/components/AIAssistant'
import '@/App.css'

function App() {
  const {
    elements,
    setElements,
    excalidrawAPI,
    setExcalidrawAPI,
    updateDrawing
  } = useDrawing()

  return (
    <div className="absolute w-full h-full -translate-x-1/2 -translate-y-1/2">
      <DrawingCanvas
        elements={elements}
        onElementsChange={setElements}
        onExcalidrawAPIChange={setExcalidrawAPI}
      />
      <Toolbar excalidrawAPI={excalidrawAPI} />
      <AIAssistant
        onSuggest={(data) => updateDrawing(data)}
        endpoint="/api/generate-drawing"
        storageKey="xdraw-chat"
        sections={["drawing"]}
        includeHistory={true}
      />
    </div>
  )
}

export default App
