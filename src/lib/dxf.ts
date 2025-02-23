import { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'
import DxfParser from 'dxf-parser'

interface DXFBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const calculateDXFBounds = (entities: any[]): DXFBounds => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  entities.forEach((entity: any) => {
    if (entity.type === 'LINE') {
      minX = Math.min(minX, entity.vertices[0].x, entity.vertices[1].x)
      minY = Math.min(minY, entity.vertices[0].y, entity.vertices[1].y)
      maxX = Math.max(maxX, entity.vertices[0].x, entity.vertices[1].x)
      maxY = Math.max(maxY, entity.vertices[0].y, entity.vertices[1].y)
    } else if (entity.type === 'CIRCLE') {
      minX = Math.min(minX, entity.center.x - entity.radius)
      minY = Math.min(minY, entity.center.y - entity.radius)
      maxX = Math.max(maxX, entity.center.x + entity.radius)
      maxY = Math.max(maxY, entity.center.y + entity.radius)
    }
  })

  return { minX, minY, maxX, maxY }
}

export const importDXF = async (file: File): Promise<ExcalidrawElement[]> => {
  const text = await file.text()
  const parser = new DxfParser()
  const dxf = parser.parseSync(text)

  const newElements: ExcalidrawElement[] = []
  if (!dxf || !dxf.entities) return newElements

  const bounds = calculateDXFBounds(dxf.entities)
  const dxfWidth = bounds.maxX - bounds.minX
  const dxfHeight = bounds.maxY - bounds.minY
  const targetWidth = 800
  const scale = targetWidth / Math.max(dxfWidth, dxfHeight)
  const offsetX = 100 - bounds.minX * scale
  const offsetY = 100 - bounds.minY * scale

  dxf.entities.forEach((entity: any, index: number) => {
    switch (entity.type) {
      case 'LINE': {
        const x1 = entity.vertices[0].x * scale + offsetX
        const y1 = entity.vertices[0].y * scale + offsetY
        const x2 = entity.vertices[1].x * scale + offsetX
        const y2 = entity.vertices[1].y * scale + offsetY

        newElements.push({
          type: 'line',
          id: `line_${index}`,
          x: x1,
          y: y1,
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),
          points: [[0, 0], [x2 - x1, y2 - y1]],
          strokeColor: '#000000',
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 2,
          roughness: 1,
          opacity: 100,
          angle: 0,
          version: 1,
          groupIds: [],
          boundElements: null,
          link: null,
          locked: false,
          startBinding: null,
          endBinding: null,
          lastCommittedPoint: null,
          startArrowhead: null,
          endArrowhead: null,
          strokeStyle: 'solid',
          roundness: { type: 2 },
          seed: Math.random(),
          versionNonce: Math.random(),
          isDeleted: false,
          updated: 0,
          frameId: null,
        })
        break
      }
      case 'CIRCLE': {
        const centerX = entity.center.x * scale + offsetX
        const centerY = entity.center.y * scale + offsetY
        const radius = entity.radius * scale

        newElements.push({
          type: 'ellipse',
          id: `circle_${index}`,
          x: centerX - radius,
          y: centerY - radius,
          width: radius * 2,
          height: radius * 2,
          strokeColor: '#000000',
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 2,
          roughness: 1,
          opacity: 100,
          angle: 0,
          version: 1,
          groupIds: [],
          boundElements: null,
          link: null,
          locked: false,
          strokeStyle: 'solid',
          roundness: { type: 2 },
          seed: Math.random(),
          versionNonce: Math.random(),
          isDeleted: false,
          updated: 0,
          frameId: null,
        })
        break
      }
    }
  })

  return newElements
}

export const exportDXF = (elements: readonly ExcalidrawElement[]): string => {
  let dxfContent = '0\nSECTION\n2\nENTITIES\n'

  elements.forEach(element => {
    switch (element.type) {
      case 'line': {
        const startX = element.x
        const startY = element.y
        const endX = startX + element.points[1][0]
        const endY = startY + element.points[1][1]
        dxfContent += `0\nLINE\n8\n0\n10\n${startX}\n20\n${startY}\n11\n${endX}\n21\n${endY}\n`
        break
      }
      case 'ellipse': {
        if (Math.abs(element.width - element.height) < 0.1) {
          const radius = element.width / 2
          const centerX = element.x + radius
          const centerY = element.y + radius
          dxfContent += `0\nCIRCLE\n8\n0\n10\n${centerX}\n20\n${centerY}\n40\n${radius}\n`
        }
        break
      }
    }
  })

  dxfContent += '0\nENDSEC\n0\nEOF\n'
  return dxfContent
}