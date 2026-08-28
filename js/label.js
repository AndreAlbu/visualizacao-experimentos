import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// Cria um rótulo HTML (CSS2DObject) para anotar elementos da cena 3D
// com aparência de legenda científica.
export function createLabel(text, variant = 'default') {
  const el = document.createElement('div');
  el.className = `sci-label sci-label--${variant}`;
  el.textContent = text;
  const obj = new CSS2DObject(el);
  obj.element.style.pointerEvents = 'none';
  return obj;
}
