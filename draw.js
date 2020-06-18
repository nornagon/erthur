const fs = require('fs')
const path = require('path')
const { createCanvas, loadImage } = require('canvas')

const fontFile = './taffer-transparent.png'
const fontWidth = 9
const fontHeight = 9


console.log("Parsing map...")
const {width: mapWidthInEmbarkTiles, height: mapHeightInEmbarkTiles, map} = JSON.parse(fs.readFileSync('../map.json'))
const mapWidthInTiles = mapWidthInEmbarkTiles * 16
const mapHeightInTiles = mapHeightInEmbarkTiles * 16

const colors = {
  BLACK: 0,
  BLUE: 1,
  GREEN: 2,
  CYAN: 3,
  RED: 4,
  MAGENTA: 5,
  BROWN: 6,
  LGRAY: 7,
  DGRAY: 8,
  LBLUE: 9,
  LGREEN: 10,
  LCYAN: 11,
  LRED: 12,
  LMAGENTA: 13,
  YELLOW: 14,
  WHITE: 15,
}
const palette = {}

const paletteRaw = fs.readFileSync('../data/init/colors.txt', 'ascii')
for (const k of Object.keys(colors)) {
  const r = (new RegExp(`\\[${k}_R:(\\d+)\\]`)).exec(paletteRaw)[1]
  const g = (new RegExp(`\\[${k}_G:(\\d+)\\]`)).exec(paletteRaw)[1]
  const b = (new RegExp(`\\[${k}_B:(\\d+)\\]`)).exec(paletteRaw)[1]
  palette[colors[k]] = `rgb(${r}, ${g}, ${b})`
}

console.log("Loading font...")
loadImage(fontFile).then(async (font) => {
  const chunkSizeInTiles = 32
  const mapWidthInChunks = Math.ceil(mapWidthInTiles / chunkSizeInTiles)
  const mapHeightInChunks = Math.ceil(mapHeightInTiles / chunkSizeInTiles)
  const mapWidthInPixels = mapWidthInTiles * fontWidth
  const mapHeightInPixels = mapHeightInTiles * fontHeight
  const chunkWidthInPixels = chunkSizeInTiles * fontWidth
  const chunkHeightInPixels = chunkSizeInTiles * fontHeight

  const maxZoom = Math.ceil(Math.log2(Math.max(mapWidthInChunks, mapHeightInChunks)))

  function chunkFileName(z, x, y) {
    return __dirname + `/tiles/${z}/${x}/${y}.png`
  }

  async function writeChunk(z, x, y, canvas) {
    console.log(`Writing chunk ${z},${x},${y}...`)
    const outFilename = chunkFileName(z, x, y)
    const outDir = path.dirname(outFilename)
    fs.mkdirSync(outDir, {recursive: true})
    const out = fs.createWriteStream(outFilename)
    canvas.createPNGStream().pipe(out)
    await new Promise(resolve => {
      out.on('finish', resolve)
    })
    console.log(`Created ${outFilename}`)
  }

  async function drawChunk(chunkX, chunkY) {
    const canvas = createCanvas(chunkWidthInPixels, chunkHeightInPixels)
    const ctx = canvas.getContext('2d')
    console.log(`Drawing chunk ${chunkX},${chunkY}...`)
    for (let cy = 0; cy < chunkSizeInTiles; cy++) {
      for (let cx = 0; cx < chunkSizeInTiles; cx++) {
        const absX = chunkX * chunkSizeInTiles + cx
        const absY = chunkY * chunkSizeInTiles + cy
        if (absX >= mapWidthInTiles || absY >= mapHeightInTiles)
          continue
        const tile = map[absY*mapWidthInTiles+absX] || {c: 0, f: 0, b: 0, l: 0}

        const char = tile.c
        const charY = (char & 0xf0) >>> 4
        const charX = char & 0xf
        const dx = cx * fontWidth
        const dy = cy * fontHeight
        ctx.globalCompositeOperation = 'source-over'
        ctx.drawImage(font, charX * fontWidth, charY * fontHeight, fontWidth, fontHeight, dx, dy, fontWidth, fontHeight)
        ctx.globalCompositeOperation = 'source-atop'
        const color = tile.f | (tile.l ? 8 : 0)
        ctx.fillStyle = palette[color]
        ctx.fillRect(dx, dy, fontWidth, fontHeight)
        ctx.globalCompositeOperation = 'destination-over'
        ctx.fillStyle = palette[tile.b]
        ctx.fillRect(dx, dy, fontWidth, fontHeight)
      }
    }
    await writeChunk(maxZoom, chunkX, chunkY, canvas)
  }

  for (let chunkY = 0; chunkY < mapHeightInChunks; chunkY++) {
    for (let chunkX = 0; chunkX < mapWidthInChunks; chunkX++) {
      await drawChunk(chunkX, chunkY)
    }
  }

  async function drawZoomedOutChunk(z, x, y) {
    // 1. read in the 4 chunks we'll be compositing
    const [topLeft, topRight, bottomLeft, bottomRight] = await Promise.all([
      loadImage(chunkFileName(z + 1, x * 2, y * 2)).then(i => i, e => null),
      loadImage(chunkFileName(z + 1, x * 2 + 1, y * 2)).then(i => i, e => null),
      loadImage(chunkFileName(z + 1, x * 2, y * 2 + 1)).then(i => i, e => null),
      loadImage(chunkFileName(z + 1, x * 2 + 1, y * 2 + 1)).then(i => i, e => null),
    ])
    const canvas = createCanvas(chunkWidthInPixels, chunkHeightInPixels)
    const ctx = canvas.getContext('2d')
    if (topLeft)
      ctx.drawImage(topLeft, 0, 0, chunkWidthInPixels, chunkHeightInPixels, 0, 0, chunkWidthInPixels / 2, chunkHeightInPixels / 2)
    if (topRight)
      ctx.drawImage(topRight, 0, 0, chunkWidthInPixels, chunkHeightInPixels, chunkWidthInPixels / 2, 0, chunkWidthInPixels / 2, chunkHeightInPixels / 2)
    if (bottomLeft)
      ctx.drawImage(bottomLeft, 0, 0, chunkWidthInPixels, chunkHeightInPixels, 0, chunkHeightInPixels / 2, chunkWidthInPixels / 2, chunkHeightInPixels / 2)
    if (bottomRight)
      ctx.drawImage(bottomRight, 0, 0, chunkWidthInPixels, chunkHeightInPixels, chunkWidthInPixels / 2, chunkHeightInPixels / 2, chunkWidthInPixels / 2, chunkHeightInPixels / 2)
    await writeChunk(z, x, y, canvas)
  }

  for (let zoomLevel = maxZoom - 1; zoomLevel >= 0; zoomLevel--) {
    const chunksXInThisZoomLevel = Math.ceil(mapWidthInChunks / Math.pow(2, maxZoom - zoomLevel))
    const chunksYInThisZoomLevel = Math.ceil(mapHeightInChunks / Math.pow(2, maxZoom - zoomLevel))
    for (let chunkY = 0; chunkY < chunksYInThisZoomLevel; chunkY++) {
      for (let chunkX = 0; chunkX < chunksXInThisZoomLevel; chunkX++) {
        await drawZoomedOutChunk(zoomLevel, chunkX, chunkY)
      }
    }
  }
})
