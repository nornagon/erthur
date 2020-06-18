local gui = require 'gui'
local json = require 'json'

local world_width = df.global.world.world_data.world_width
local world_height = df.global.world.world_data.world_height

for i = 1, 16 do
  gui.simulateInput(dfhack.gui.getCurViewscreen(), 'SETUP_LOCAL_Y_UP')
  gui.simulateInput(dfhack.gui.getCurViewscreen(), 'SETUP_LOCAL_X_UP')
end
for i = 1, world_width do
  gui.simulateInput(dfhack.gui.getCurViewscreen(), 'CURSOR_LEFT')
end
for i = 1, world_height do
  gui.simulateInput(dfhack.gui.getCurViewscreen(), 'CURSOR_UP')
end

local map = {}

for map_y = 0, world_width - 1 do
  for map_x = 0, world_height - 1 do
    dfhack.gui.getCurViewscreen():render()
    for y = 0, 15 do
      for x = 0, 15 do
        local tile = dfhack.screen.readTile(1 + x, 2 + y)
        local abs_y = map_y * 16 + y
        local abs_x = map_x * 16 + x
        map[abs_y * world_width * 16 + abs_x + 1] = {
          c = tile.ch,
          f = tile.fg,
          b = tile.bg,
          l = tile.bold,
        }
      end
    end
    gui.simulateInput(dfhack.gui.getCurViewscreen(), 'CURSOR_RIGHT')
  end
  for i = 1, world_width do
    gui.simulateInput(dfhack.gui.getCurViewscreen(), 'CURSOR_LEFT')
  end
  gui.simulateInput(dfhack.gui.getCurViewscreen(), 'CURSOR_DOWN')
    print('.')
end

local ROOT = dfhack.getDFPath() .. "/"
json.encode_file({ width = world_width, height = world_height, map = map }, ROOT .. "map.json", { pretty = false })
