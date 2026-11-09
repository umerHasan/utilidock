'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { FeatureCollection, Geometry } from 'geojson';
import worldData from 'world-atlas/countries-110m.json';
import { Download, Eraser, Globe2, MousePointer2, Paintbrush, Pencil, RotateCcw, Trash2 } from 'lucide-react';

type CountryProperties = { name: string };
type Point = [number, number];
type Stroke = { points: Point[]; color: string };
type MapState = { colors: Record<string, string>; strokes: Stroke[] };
type Mode = 'fill' | 'draw' | 'erase';

// JSON imports widen the TopoJSON geometry discriminants to strings.
const topology = worldData as unknown as Topology;
const countries = (feature(topology, topology.objects.countries) as FeatureCollection<Geometry, CountryProperties>).features
  .map((country) => ({ ...country, key: String(country.id ?? country.properties.name) }))
  .sort((a, b) => a.properties.name.localeCompare(b.properties.name));
const projection = geoEquirectangular().fitExtent([[24, 22], [976, 478]], { type: 'Sphere' });
const path = geoPath(projection);
const palette = [
  { name: 'Forest', color: '#347d68' },
  { name: 'Mint', color: '#91cbb0' },
  { name: 'Yellow', color: '#edc979' },
  { name: 'Coral', color: '#e7937b' },
  { name: 'Rose', color: '#dca6ab' },
  { name: 'Lavender', color: '#aaa6d3' },
  { name: 'Blue', color: '#84b7d1' },
  { name: 'Slate', color: '#596c73' },
];
const emptyMap = (): MapState => ({ colors: {}, strokes: [] });

export function WorldMap() {
  const [map, setMap] = useState<MapState>(emptyMap);
  const [history, setHistory] = useState<MapState[]>([]);
  const [mode, setMode] = useState<Mode>('fill');
  const [color, setColor] = useState(palette[0].color);
  const [labels, setLabels] = useState(true);
  const [selected, setSelected] = useState('');
  const [activeStroke, setActiveStroke] = useState<Stroke | null>(null);
  const strokeRef = useRef<Stroke | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function commit(next: MapState) {
    setHistory((previous) => [...previous, map]);
    setMap(next);
  }

  function paintCountry(key: string) {
    if (mode === 'draw') return;
    const nextColors = { ...map.colors };
    if (mode === 'erase') delete nextColors[key];
    else nextColors[key] = color;
    if (nextColors[key] !== map.colors[key]) commit({ ...map, colors: nextColors });
    setSelected(key);
  }

  function pointFromEvent(event: PointerEvent<SVGSVGElement>): Point | null {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transformed = point.matrixTransform(matrix.inverse());
    return [transformed.x, transformed.y];
  }

  function startStroke(event: PointerEvent<SVGSVGElement>) {
    if (mode !== 'draw' || event.button !== 0) return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke = { color, points: [point] };
    strokeRef.current = stroke;
    setActiveStroke(stroke);
  }

  function moveStroke(event: PointerEvent<SVGSVGElement>) {
    if (!strokeRef.current) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const stroke = { ...strokeRef.current, points: [...strokeRef.current.points, point] };
    strokeRef.current = stroke;
    setActiveStroke(stroke);
  }

  function finishStroke() {
    const stroke = strokeRef.current;
    if (!stroke) return;
    commit({ ...map, strokes: [...map.strokes, stroke] });
    strokeRef.current = null;
    setActiveStroke(null);
  }

  function undo() {
    const previous = history[history.length - 1];
    if (!previous) return;
    setMap(previous);
    setHistory(history.slice(0, -1));
  }

  function clearMap() {
    if (window.confirm('Clear all country colors and drawings?')) commit(emptyMap());
  }

  function download() {
    if (!svgRef.current) return;
    const svg = svgRef.current.cloneNode(true) as SVGSVGElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'world-map.svg';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const strokes = activeStroke ? [...map.strokes, activeStroke] : map.strokes;
  const selectedCountry = countries.find((country) => country.key === selected);
  const coloredCount = Object.keys(map.colors).length;

  return (
    <section className="map-workspace" aria-label="World map workspace">
      <div className="map-workspace-top">
        <div className="map-workspace-title"><span className="map-title-icon"><Globe2 size={20} /></span><div><span className="map-overline">YOUR INTERACTIVE CANVAS</span><h2>Explore the world, your way.</h2></div></div>
        <div className="map-top-actions"><button type="button" className="map-action" onClick={undo} disabled={!history.length}><RotateCcw size={15} /> Undo</button><button type="button" className="map-action" onClick={clearMap} disabled={!coloredCount && !map.strokes.length}><Trash2 size={15} /> Clear map</button><button type="button" className="map-download" onClick={download}><Download size={15} /> Export SVG</button></div>
      </div>
      <div className="map-body">
        <aside className="map-sidebar">
          <div className="map-control-section"><span className="map-overline">01 / TOOLS</span><h3>Make your mark</h3><div className="map-tool-list">
            <button type="button" className={mode === 'fill' ? 'active' : ''} aria-pressed={mode === 'fill'} onClick={() => setMode('fill')}><span><Paintbrush size={16} /> Fill countries</span><small>FILL</small></button>
            <button type="button" className={mode === 'draw' ? 'active' : ''} aria-pressed={mode === 'draw'} onClick={() => setMode('draw')}><span><Pencil size={16} /> Draw on map</span><small>DRAW</small></button>
            <button type="button" className={mode === 'erase' ? 'active' : ''} aria-pressed={mode === 'erase'} onClick={() => setMode('erase')}><span><Eraser size={16} /> Erase fill</span><small>ERASE</small></button>
          </div></div>
          <div className="map-control-section"><span className="map-overline">02 / COLOR</span><h3>Choose a color</h3><p>Pick a shade for your next mark.</p><div className="map-palette">{palette.map((swatch) => <button key={swatch.color} type="button" className={color === swatch.color ? 'selected' : ''} style={{ backgroundColor: swatch.color }} aria-label={swatch.name} aria-pressed={color === swatch.color} onClick={() => setColor(swatch.color)} />)}<label className="map-custom-color" title="Custom color"><span>+</span><input aria-label="Custom color" type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label></div></div>
          <div className="map-control-section"><span className="map-overline">03 / DISPLAY</span><div className="map-label-toggle"><div><h3>Country labels</h3><p>Show names on the map</p></div><button type="button" role="switch" aria-label="Country labels" aria-checked={labels} className={labels ? 'on' : ''} onClick={() => setLabels(!labels)}><span /></button></div></div>
          <div className="map-control-section map-country-control"><label htmlFor="map-country">FIND A COUNTRY</label><select id="map-country" value={selected} onChange={(event) => setSelected(event.target.value)}><option value="">Select a country</option>{countries.map((country) => <option key={country.key} value={country.key}>{country.properties.name}</option>)}</select><button type="button" onClick={() => paintCountry(selected)} disabled={!selected || mode === 'draw'}>{mode === 'erase' ? 'Erase selected fill' : 'Fill selected country'}</button></div>
          <div className="map-tip"><MousePointer2 size={16} /><p><strong>A little tip</strong><br />{mode === 'draw' ? 'Drag anywhere on the map to draw.' : mode === 'erase' ? 'Select a country to remove its fill.' : 'Select a color, then click any country to fill it.'}</p></div>
        </aside>
        <div className="map-stage">
          <div className="map-stage-header"><div><span className="map-overline">THE WORLD AT A GLANCE</span><h3>World map <span>·</span> <small>Political overview</small></h3></div><span className="map-live"><span /> READY TO EXPLORE</span></div>
          <div className={`map-canvas ${mode === 'draw' ? 'drawing' : ''}`}>
            <svg ref={svgRef} viewBox="0 0 1000 500" role="img" aria-label="Interactive world map" onPointerDown={startStroke} onPointerMove={moveStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke}>
              <rect width="1000" height="500" fill="#edf5f2" />
              <g fill="none" stroke="#dcebe5" strokeWidth="0.7">{[100, 200, 300, 400].map((y) => <line key={`y${y}`} x1="0" x2="1000" y1={y} y2={y} />)}{[100, 200, 300, 400, 500, 600, 700, 800, 900].map((x) => <line key={`x${x}`} x1={x} x2={x} y1="0" y2="500" />)}</g>
              <g>{countries.map((country) => <path key={country.key} d={path(country) ?? ''} fill={map.colors[country.key] ?? '#e1e9df'} stroke="#a9beb1" strokeWidth="0.8" strokeLinejoin="round" className="map-country" tabIndex={mode === 'draw' ? -1 : 0} role="button" aria-label={country.properties.name} onClick={() => paintCountry(country.key)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); paintCountry(country.key); } }}><title>{country.properties.name}</title></path>)}</g>
              {labels && <g pointerEvents="none" fill="#526b5e" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="600">{countries.filter((country) => path.area(country) > 400).map((country) => { const [x, y] = path.centroid(country); return <text key={country.key} x={x} y={y}>{country.properties.name}</text>; })}</g>}
              <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">{strokes.map((stroke, index) => <path key={index} d={stroke.points.length === 1 ? `M${stroke.points[0][0]},${stroke.points[0][1]} l0.01,0` : `M${stroke.points.map((point) => point.join(',')).join(' L')}`} stroke={stroke.color} strokeWidth="3" />)}</g>
            </svg>
          </div>
          <div className="map-stage-footer"><span><span className="map-footer-dot" /> {selectedCountry ? selectedCountry.properties.name : 'Choose a country to get started'}</span><span>{coloredCount} {coloredCount === 1 ? 'area' : 'areas'} colored</span></div>
          <p className="map-disclaimer">Simplified Natural Earth boundaries · Not an authoritative or real-time political reference</p>
        </div>
      </div>
    </section>
  );
}
