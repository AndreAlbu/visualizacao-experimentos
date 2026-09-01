// Exportação da cena como imagem PNG em alta resolução, sem os painéis da
// interface — para uso direto em dissertação, apresentação ou artigo.
//
// O WebGL é renderizado numa resolução ampliada (pixelRatio temporário) e os
// rótulos, que são elementos HTML (CSS2D), são redesenhados por cima num
// canvas 2D usando o estilo computado de cada um, para que a figura exportada
// fique idêntica ao que aparece na tela.

// Redesenha os rótulos CSS2D sobre o canvas de saída, na escala da exportação.
function drawLabels(ctx, layer, container, scale) {
  const containerRect = container.getBoundingClientRect();

  layer.querySelectorAll('.sci-label').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const x = (rect.left - containerRect.left) * scale;
    const y = (rect.top - containerRect.top) * scale;
    const w = rect.width * scale;
    const h = rect.height * scale;

    // Descarta rótulos fora do quadro
    if (x + w < 0 || y + h < 0 || x > ctx.canvas.width || y > ctx.canvas.height) return;

    const radius = (parseFloat(style.borderRadius) || 0) * scale;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
    else ctx.rect(x, y, w, h);
    ctx.fillStyle = style.backgroundColor;
    ctx.fill();
    ctx.lineWidth = Math.max(1, (parseFloat(style.borderTopWidth) || 0) * scale);
    ctx.strokeStyle = style.borderTopColor;
    ctx.stroke();

    const fontSize = (parseFloat(style.fontSize) || 11) * scale;
    ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
    ctx.fillStyle = style.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el.textContent, x + w / 2, y + h / 2);
  });
}

// Renderiza e baixa a cena como PNG. `scale` multiplica a resolução de tela
// (3 => uma janela de 1200x700 gera uma imagem de 3600x2100).
export function exportSceneImage({
  renderer, scene, camera, labelRenderer, container, scale = 3, filename = 'experimento.png',
}) {
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Renderiza o WebGL na resolução ampliada
  const previousPixelRatio = renderer.getPixelRatio();
  renderer.setPixelRatio(scale);
  renderer.render(scene, camera);

  const out = document.createElement('canvas');
  out.width = Math.round(width * scale);
  out.height = Math.round(height * scale);
  const ctx = out.getContext('2d');
  ctx.drawImage(renderer.domElement, 0, 0, out.width, out.height);

  // Restaura a resolução de tela imediatamente
  renderer.setPixelRatio(previousPixelRatio);
  renderer.render(scene, camera);

  // Rótulos por cima (respeitando o botão que os liga/desliga)
  if (labelRenderer.domElement.style.display !== 'none') {
    drawLabels(ctx, labelRenderer.domElement, container, scale);
  }

  return new Promise((resolve) => {
    out.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      resolve({ width: out.width, height: out.height });
    }, 'image/png');
  });
}
