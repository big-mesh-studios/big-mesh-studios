// What a figure looks like as a solid rather than as a drawing, and what a file
// format says about that solid.
//
// A model leaves this editor two ways. As a sprite stack, which is six drawings
// and everything the drawings cannot say — that is `./format`, and a file
// somebody can open and edit again. Or as a thing to be printed, which is
// triangles standing on a bed at a size in millimetres, carrying the colours
// they were drawn in — that is here, and a file a slicer opens rather than an
// editor.
//
// Its own entry from `./renderer` because it needs none of that: the geometry
// is the mesher's, over the same packed volumes the preview draws, and standing
// a model up and measuring it is arithmetic. Nothing here reaches for a graphics
// card, which is what lets the volumes it reads be solved apart from the scene
// graph that usually solves them.
export { printFigure, type PrintOptions, type PrintPart } from "./figure-print";
export { encodeThreeMf, MODEL_PART, type ThreeMfOptions } from "./three-mf";
