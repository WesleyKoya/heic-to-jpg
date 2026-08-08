# Mesa de Luz

Conversor de imagens HEIC para JPG que roda inteiramente no navegador, sem backend e sem upload de arquivos para nenhum servidor.

## Funcionalidades

- Conversão de HEIC/HEIF para JPG com qualidade máxima, sem perda adicional
- Arrastar e soltar arquivos, ou seleção manual
- Processamento em lote com fila: até 10 conversões simultâneas, o restante entra na fila automaticamente
- Download individual de cada imagem convertida
- Download de todas as imagens convertidas em um único arquivo .zip
- Nenhum dado sai do navegador do usuário

## Como funciona

A conversão é feita com a biblioteca [heic2any](https://github.com/alexcorvi/heic2any), que usa WebAssembly (libheif) para decodificar arquivos HEIC diretamente no navegador. O empacotamento em .zip usa a biblioteca [JSZip](https://stuk.github.io/jszip/). Ambas são carregadas via CDN (cdnjs) e não exigem instalação.

Como todo o processamento acontece no cliente, o projeto é composto apenas por arquivos estáticos (HTML, CSS e JS), o que o torna compatível com qualquer hospedagem estática, incluindo GitHub Pages.

## Estrutura do projeto

```
mesa-de-luz/
├── index.html      estrutura da página
├── style.css       estilos
├── script.js       lógica de conversão, fila e download
└── README.md
```

## Executando localmente

Por usar módulos e requisições de CDN, o ideal é servir os arquivos por um servidor local em vez de abrir o index.html direto pelo sistema de arquivos.

Com Python instalado, dentro da pasta do projeto:

```
python3 -m http.server 8000
```

Depois acesse http://localhost:8000 no navegador.

## Publicando no GitHub Pages

1. Crie um repositório público no GitHub.
2. Envie os arquivos desta pasta (index.html, style.css, script.js) para a raiz do repositório.
3. No repositório, vá em Settings, depois Pages.
4. Em "Build and deployment", em "Source", escolha "Deploy from a branch".
5. Em "Branch", selecione main e a pasta / (root). Clique em Save.
6. Após alguns minutos, o site estará disponível em:
   https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/

## Tecnologias

- HTML, CSS e JavaScript puro, sem frameworks
- heic2any (conversão HEIC para JPG via WebAssembly)
- JSZip (empacotamento em .zip)

## Licença

heic2any e JSZip são distribuídos sob licença MIT pelos respectivos autores.
