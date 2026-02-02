# AstroChart

![GitHub release](https://img.shields.io/github/v/release/AstroDraw/AstroChart?style=flat-square)

A free and open-source TypeScript library for generating SVG charts to display planets in astrology. It does not calculate any positions of the planets in Universe.

- Pure TypeScript implementation without dependencies.
- SVG graphics.
- Tested code.

## Example:

<img width="764" alt="Chart wheel with transits" src="https://github.com/AstroDraw/AstroChart/blob/main/doc/images/transits.png?raw=true">

## Documentation

A documentation is in progress, please checkout [website](https://astrodraw.github.io/).

## Contribution

Contribution is always welcome. You can contribute in different ways:

- Start or participate in the [discussions](https://github.com/AstroDraw/AstroChart/discussions)
- Check opened issues, or improve our documentation
- Open [an issue](https://github.com/AstroDraw/AstroChart/issues) to report a bug or give some enchancement idea
- Open a PR with bug fixes or new features. To avoid rework, if is not small, is always good to open an issue to discuss before.

## Development with Docker

If you are using Docker for development (e.g., with an Express API), you can use the `astro_compiler` service to automate the Webpack build process.

### Starting the Compiler

The compiler is configured in `docker-compose.yml`. To start it:

```bash
docker compose up -d astro_compiler
```

### Automatic Recompilation

The service runs `webpack --watch`. Any changes made to the source files in `project/src/` will be automatically recompiled into `dist/astrochart.js`.

### Verifying Build

To check the logs of the compiler:

```bash
docker logs -f astro_charts_compiler
```

### Manual Build

To run a one-off build inside the container:

```bash
docker compose run --rm astro_compiler npm run build
```

## Customizing Symbols

### Using Unicode/Fonts

You can use the `CUSTOM_SYMBOL_FN` hook in the settings to render zodiac signs as text/Unicode characters instead of SVG paths.

Example implementation:

```javascript
settings.CUSTOM_SYMBOL_FN = (name, x, y, context) => {
  const signChars = { Aries: "♈", Taurus: "♉" /* ... */ };
  if (signChars[name]) {
    const node = context.root.ownerDocument.createElementNS(
      context.root.namespaceURI,
      "text",
    );
    node.setAttribute("x", x);
    node.setAttribute("y", y);
    node.setAttribute("text-anchor", "middle");
    node.setAttribute("dominant-baseline", "central");
    node.setAttribute("font-size", "24px");
    node.textContent = signChars[name];
    return node;
  }
  return null;
};
```

### Modifying SVG Paths

To permanently change the symbols, you can edit the path data in `project/src/svg.ts` and recompile the library.

## Support

Do you want to support the development of AstroChart? Here is some ways:

Is your project using? Please [comment here](https://github.com/AstroDraw/AstroChart/discussions/48) so we can share nice projects that are using.

A nice way to support is sharing this project with other people.

Also, if you are a company consider sponsoring the project or [buying me a coffee](https://ko-fi.com/afucher)
