import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Download } from 'lucide-react'
import { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types/types'
import { importDXF, exportDXF } from '@/lib/dxf'

interface ToolbarProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null
}

export function Toolbar({ excalidrawAPI }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDXFImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !excalidrawAPI) return

    try {
      const newElements = await importDXF(file)
      if (newElements.length > 0) {
        excalidrawAPI.updateScene({ elements: newElements })
      }
    } catch (error) {
      console.error('Error parsing DXF file:', error)
    }
  }

  const handleDXFExport = () => {
    if (!excalidrawAPI) return

    const elements = excalidrawAPI.getSceneElements()
    const dxfContent = exportDXF(elements)

    const blob = new Blob([dxfContent], { type: 'application/dxf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'drawing.dxf'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-4 z-20">
      <Input
        type="file"
        accept=".dxf"
        onChange={handleDXFImport}
        ref={fileInputRef}
        className="hidden"
      />
      <div className="flex gap-2 justify-end">
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="ghost"
          size="icon"
          className="bg-gray-800/95 backdrop-blur-md shadow-xl text-white hover:bg-gray-700/90 transition-all duration-200 hover:scale-105"
        >
          <Upload size={20} />
        </Button>
        <Button
          onClick={handleDXFExport}
          variant="ghost"
          size="icon"
          className="bg-gray-800/95 backdrop-blur-md shadow-xl text-white hover:bg-gray-700/90 transition-all duration-200 hover:scale-105"
        >
          <Download size={20} />
        </Button>
      </div>
    </div>
  )
}