# Êrthur, The Infinite Universe

Êrthur is a tool to extract a high-resolution embark map of an entire [Dwarf
Fortress](https://bay12games.com/dwarves/) world.

It's not in a well-packaged format for ease of use currently, but if you'd like
to try it out for yourself despite that, here's a description of the parts
you'll need to run and how they work.

You'll need [DFHack](https://docs.dfhack.org/en/stable/) and
[NodeJS](https://nodejs.org/).

1. Clone this repo in the root of your DF install, and copy
   `export-embark-map.lua` to the `hack/scripts` DFHack folder.
2. Enter the embark screen. If your save is mid-fortress, make a copy of your
   save and retire the fortress, and enter the embark screen on the copy.
3. Run `export-embark-map` from the DFHack console. This will take a while, and
   when it's done it will produce a `map.json` file in the root DF folder.
4. Run `npm install` in the `erthur` folder to fetch the dependencies.
5. Run `node draw.js` in the `erthur` folder. This will read the `map.json`
   file as well as the palette in `../data/init/colors.txt`.
6. Once this script is done, open `index.html`. Tada!
