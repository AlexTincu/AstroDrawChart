# AstroCharts Codebase Documentation

This folder contains documentation about the AstroCharts codebase, including findings about the architecture, technologies used, and logic behind the scripts.

## Core Components

### 1. Api (`/Api/`)
- **Technology**: Node.js + Express.
- **Purpose**: A REST API that calculates planetary positions.
- **Key Library**: Uses `swisseph` (Swiss Ephemeris) for high-precision astrological calculations.
- **Output**: Returns a JSON object with planetary positions and house cusps.

### 2. AstroChart (`/`)
- **Technology**: TypeScript / JavaScript.
- **Purpose**: A client-side library that renders the astrological chart based on the API's JSON response.
- **Rendering Method**: **SVG (Scalable Vector Graphics)**.
    - It does **not** use `<canvas>`.
    - It creates vector elements (`path`, `circle`, `g`) dynamically in the DOM.
    - Benefits: High quality at any zoom level and easier styling via CSS.
- **Browser Dependency**: **Yes**. The current implementation relies on DOM APIs (`document.createElementNS`, `setAttribute`, etc.). To run it on the server (Node.js), a DOM environment must be provided.

## Server-Side Generation and Export

Since `AstroChart` requires a DOM, there are two main approaches to generate charts on the server (e.g., for an API that returns an image/SVG):

### 1. JSDOM (Lightweight)
- **What it is**: A JavaScript implementation of the WHATWG DOM and HTML standards.
- **How to use**: Initialize a `jsdom` instance in Node.js, set the global `document` and `window`, and then run the `AstroChart` library.
- **Pros**: Fast, runs in the same Node process.
- **Cons**: Might lack some advanced browser features (though for SVG generation it is usually sufficient).

### 2. Puppeteer (Robust & Recommended for Exports)
- **What it is**: A headless Chrome/Chromium browser controlled via Node.js.
- **How to use**: Launch a headless browser, load the library and data into a page, and extract the generated SVG.
- **Pros**: 100% fidelity to the browser, easy export to **PNG** or **PDF**.
- **Cons**: Heavier (requires browser binary), slightly slower than JSDOM.

## History & Findings
- **2026-02-01**: 
    - Analyzed the rendering engine of `AstroChart` and confirmed it uses SVG instead of Canvas. 
    - Identified `swisseph` as the core calculation engine in the API.
    - Investigated browser dependencies: the rendering library is tightly coupled with the DOM API.
    - Proposed JSDOM and Puppeteer as solutions for server-side automated export.
