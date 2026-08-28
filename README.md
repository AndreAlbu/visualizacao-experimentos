# Visualização 3D — Processo de Gravação de Experimentos

Ilustração 3D interativa (Three.js) do processo de coleta de dados para pesquisa
de visão computacional voltada à detecção/previsão de risco de colisão e auxílio
à mobilidade em ambientes internos.

Um participante percorre um corredor de biblioteca com uma câmera egocêntrica,
em 4 cenários de navegação: desvio à esquerda (mesa), desvio à direita (duas
pessoas), aproximação com parada (corredor bloqueado) e caminhada livre.

## Rodando localmente

```bash
python3 serve.py
```

Depois abra http://localhost:4173. (Precisa de um servidor local por causa dos
ES modules; abrir o index.html direto não funciona.)

## Deploy

Projeto 100% estático — funciona em qualquer host de arquivos estáticos
(Vercel, Netlify, GitHub Pages).
