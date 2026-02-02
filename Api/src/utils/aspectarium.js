// https://aistudio.google.com/prompts/1xM1v4P0_GU2bdLnLGnJV7rGM1tJXRMGE
// The provided JSON data
const jsonData = {
  "positions": {
    "Sun": { "longitude": 224.251, "longitudeSpeed": 1.0034504419146015, "isRetrograde": false, "sign": "Scorpio", "degree": "14°15'", "house": 5 },
    "Moon": { "longitude": 145.125, "longitudeSpeed": 13.337648961616429, "isRetrograde": false, "sign": "Leo", "degree": "25°07'", "house": 2 },
    "Mercury": { "longitude": 247.171, "longitudeSpeed": 1.08292663707807, "isRetrograde": false, "sign": "Sagittarius", "degree": "7°10'", "house": 6 },
    "Venus": { "longitude": 206.375, "longitudeSpeed": 1.250308735972669, "isRetrograde": false, "sign": "Libra", "degree": "26°22'", "house": 4 },
    "Mars": { "longitude": 186.325, "longitudeSpeed": 0.6258490354309477, "isRetrograde": false, "sign": "Libra", "degree": "6°19'", "house": 4 },
    "Jupiter": { "longitude": 309.012, "longitudeSpeed": 0.10643218410004907, "isRetrograde": false, "sign": "Aquarius", "degree": "9°00'", "house": 8 },
    "Saturn": { "longitude": 238.78, "longitudeSpeed": 0.11651958481501291, "isRetrograde": false, "sign": "Scorpio", "degree": "28°46'", "house": 5 },
    "Uranus": { "longitude": 256.225, "longitudeSpeed": 0.05399969014121066, "isRetrograde": false, "sign": "Sagittarius", "degree": "16°13'", "house": 6 },
    "Neptune": { "longitude": 271.659, "longitudeSpeed": 0.02785682539468426, "isRetrograde": false, "sign": "Capricorn", "degree": "1°39'", "house": 7 },
    "Pluto": { "longitude": 215.067, "longitudeSpeed": 0.04010284891706051, "isRetrograde": false, "sign": "Scorpio", "degree": "5°04'", "house": 5 },
    "NN": { "longitude": 39.174, "longitudeSpeed": 0.00358145580012292, "isRetrograde": false, "sign": "Taurus", "degree": "9°10'", "house": 11 },
    "Chiron": { "longitude": 73.462, "longitudeSpeed": -0.047967741195432005, "isRetrograde": true, "sign": "Gemini", "degree": "13°27'", "house": 12 },
    "Lilith": { "longitude": 47.496, "longitudeSpeed": 0.11076757105129541, "isRetrograde": false, "sign": "Taurus", "degree": "17°29'", "house": 11 },
    "Vertex": { "longitude": 206.375, "longitudeSpeed": 1.250308735972669, "isRetrograde": false, "sign": "Libra", "degree": "26°22'", "house": 4 },
    "Juno": { "longitude": 220.958, "longitudeSpeed": 0.3429821113243773, "isRetrograde": false, "sign": "Scorpio", "degree": "10°57'", "house": 5 },
    "NS": { "longitude": 219.174, "longitudeSpeed": 0.00358145580012292, "isRetrograde": false, "sign": "Scorpio", "degree": "9°10'", "house": 5 }
},
"houses": [], // Omitted for brevity, not directly used in the current display
"angles": {
    "AS": { "longitude": 90.625, "sign": "Cancer", "degree": "0°37'", "house": 1 },
    "MC": { "longitude": 333.781, "sign": "Pisces", "degree": "3°46'", "house": 9 }, // Note: MC is typically H10
    "DS": { "longitude": 270.625, "sign": "Capricorn", "degree": "0°37'" },
    "IC": { "longitude": 153.781, "sign": "Virgo", "degree": "3°46'" }
},
"aspects": [
    { "planet1": "Sun", "planet2": "Jupiter", "aspect": "square", "angle": 90, "orb": 5.24, "applying": false },
    { "planet1": "Sun", "planet2": "Lilith", "aspect": "opposition", "angle": 180, "orb": 3.25, "applying": true },
    { "planet1": "Sun", "planet2": "Juno", "aspect": "conjunction", "angle": 0, "orb": 3.29, "applying": false },
    { "planet1": "Sun", "planet2": "NS", "aspect": "conjunction", "angle": 0, "orb": 5.08, "applying": false },
    { "planet1": "Moon", "planet2": "Venus", "aspect": "sextile", "angle": 60, "orb": 1.25, "applying": true },
    { "planet1": "Moon", "planet2": "Saturn", "aspect": "square", "angle": 90, "orb": 3.66, "applying": true },
    { "planet1": "Moon", "planet2": "Lilith", "aspect": "square", "angle": 90, "orb": 7.63, "applying": false },
    { "planet1": "Moon", "planet2": "Vertex", "aspect": "sextile", "angle": 60, "orb": 1.25, "applying": true },
    { "planet1": "Mercury", "planet2": "Mars", "aspect": "sextile", "angle": 60, "orb": 0.85, "applying": false },
    { "planet1": "Mercury", "planet2": "Jupiter", "aspect": "sextile", "angle": 60, "orb": 1.84, "applying": true },
    { "planet1": "Mercury", "planet2": "Chiron", "aspect": "opposition", "angle": 180, "orb": 6.29, "applying": true },
    { "planet1": "Venus", "planet2": "Vertex", "aspect": "conjunction", "angle": 0, "orb": 0, "applying": false },
    { "planet1": "Mars", "planet2": "Jupiter", "aspect": "trine", "angle": 120, "orb": 2.69, "applying": true },
    { "planet1": "Mars", "planet2": "Neptune", "aspect": "square", "angle": 90, "orb": 4.67, "applying": false },
    { "planet1": "Mars", "planet2": "Chiron", "aspect": "trine", "angle": 120, "orb": 7.14, "applying": true },
    { "planet1": "Jupiter", "planet2": "Pluto", "aspect": "square", "angle": 90, "orb": 3.94, "applying": false },
    { "planet1": "Jupiter", "planet2": "NN", "aspect": "square", "angle": 90, "orb": 0.16, "applying": true },
    { "planet1": "Jupiter", "planet2": "Chiron", "aspect": "trine", "angle": 120, "orb": 4.45, "applying": true },
    { "planet1": "Jupiter", "planet2": "Juno", "aspect": "square", "angle": 90, "orb": 1.95, "applying": false },
    { "planet1": "Jupiter", "planet2": "NS", "aspect": "square", "angle": 90, "orb": 0.16, "applying": true },
    { "planet1": "Uranus", "planet2": "Chiron", "aspect": "opposition", "angle": 180, "orb": 2.76, "applying": false },
    { "planet1": "Neptune", "planet2": "Pluto", "aspect": "sextile", "angle": 60, "orb": 3.41, "applying": false },
    { "planet1": "Neptune", "planet2": "NN", "aspect": "trine", "angle": 120, "orb": 7.52, "applying": true },
    { "planet1": "Pluto", "planet2": "Juno", "aspect": "conjunction", "angle": 0, "orb": 5.89, "applying": false },
    { "planet1": "Pluto", "planet2": "NS", "aspect": "conjunction", "angle": 0, "orb": 4.11, "applying": true },
    { "planet1": "Lilith", "planet2": "Juno", "aspect": "opposition", "angle": 180, "orb": 6.54, "applying": true },
    { "planet1": "Juno", "planet2": "NS", "aspect": "conjunction", "angle": 0, "orb": 1.78, "applying": false },
    { "planet1": "AS", "planet2": "Mars", "aspect": "square", "angle": 90, "orb": 5.7, "applying": false },
    { "planet1": "AS", "planet2": "Neptune", "aspect": "opposition", "angle": 180, "orb": 1.03, "applying": false },
    { "planet1": "AS", "planet2": "Pluto", "aspect": "trine", "angle": 120, "orb": 4.44, "applying": false },
    { "planet1": "MC", "planet2": "Mercury", "aspect": "square", "angle": 90, "orb": 3.39, "applying": false },
    { "planet1": "MC", "planet2": "Neptune", "aspect": "sextile", "angle": 60, "orb": 2.12, "applying": false },
    { "planet1": "MC", "planet2": "Pluto", "aspect": "trine", "angle": 120, "orb": 1.29, "applying": false },
    { "planet1": "MC", "planet2": "NN", "aspect": "sextile", "angle": 60, "orb": 5.39, "applying": false },
    { "planet1": "MC", "planet2": "Juno", "aspect": "trine", "angle": 120, "orb": 7.18, "applying": false },
    { "planet1": "MC", "planet2": "NS", "aspect": "trine", "angle": 120, "orb": 5.39, "applying": false }
]
};

// --- Astrological Symbol Mappings ---
const planetSymbols = {
    "Sun": "☉", "Moon": "☽", "Mercury": "☿", "Venus": "♀", "Mars": "♂",
    "Jupiter": "♃", "Saturn": "♄", "Uranus": "♅", "Neptune": "♆", "Pluto": "♇",
    "NN": "☊", // North Node (True Node)
    "NS": "☋", // South Node (Desc. Node)
    "Chiron": "⚷", // Chiron
    "Lilith": "⚸", // Black Moon Lilith
    "Vertex": "Vtx", // Often text or custom symbol. Using text as Unicode is rare.
    "Juno": "⚵", // Juno asteroid
    "AS": "AC", // Ascendant (using text for consistency)
    "MC": "MC"   // Midheaven (using text)
};

// Aspect symbols and colors as seen in the second image.
// Red square for hard aspects (conjunction, opposition, square).
// Blue triangle for trine, blue star for sextile.
const aspectSymbolsModern = {
    "conjunction": "☌",
    "opposition": "☍",
    "square": "■",
    "trine": "△",
    "sextile": "*",
};

const aspectColorsModern = {
    "conjunction": "text-red-600",
    "opposition": "text-red-600",
    "square": "text-red-600",
    "trine": "text-blue-600",
    "sextile": "text-blue-600",
};

// Order of celestial bodies for the grid and position list.
// This order determines the rows and columns of the aspectarium.
const planetOrderForGrid = [
    "Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "NN", "NS", "Chiron", "Lilith", "Vertex", "Juno", "AS", "MC"
];

// --- Helper Functions ---

// Get Unicode symbol for a planet/point
function getPlanetSymbol(planetName) {
    return planetSymbols[planetName] || planetName;
}

// Get Unicode symbol for an aspect type
function getAspectSymbol(aspectName) {
    return aspectSymbolsModern[aspectName] || aspectName;
}

// Get Tailwind color class for an aspect type
function getAspectColorClass(aspectName) {
    return aspectColorsModern[aspectName] || "text-gray-700";
}

// Format orb to one or two decimal places, removing trailing zeros
function formatOrb(orb) {
    const formatted = orb.toFixed(2);
    if (formatted.endsWith('.00')) {
        return parseInt(formatted).toString();
    } else if (formatted.endsWith('0') && !formatted.endsWith('.00')) {
        return formatted.slice(0, -1);
    }
    return formatted;
}

// Get Unicode symbol for a zodiac sign
const signSymbols = {
    "Aries": "♈", "Taurus": "♉", "Gemini": "♊", "Cancer": "♋", "Leo": "♌", "Virgo": "♍", "Libra": "♎", "Scorpio": "♏", "Sagittarius": "♐", "Capricorn": "♑", "Aquarius": "♒", "Pisces": "♓"
};
function getSignSymbol(signName) {
    return signSymbols[signName] || signName.slice(0, 3);
}

// --- Render Planet Positions List ---
function renderPlanetPositions() {
    const container = document.getElementById('planet-positions');
    container.innerHTML = ''; // Clear previous content

    const allCelestialBodies = { ...jsonData.positions, ...jsonData.angles };

    // Iterate through the predefined order to display
    planetOrderForGrid.forEach(planetName => {
        const data = allCelestialBodies[planetName];
        if (data) {
            const div = document.createElement('div');
            div.className = 'flex items-center text-sm planet-info-entry';

            let content = `<span class="symbol font-bold">${getPlanetSymbol(planetName)}</span>`; // Symbol is handled by CSS width

            // Collect other info parts
            let infoParts = [];
            if (data.degree && data.sign) {
                const signSymbol = getSignSymbol(data.sign);
                infoParts.push(`${data.degree} ${signSymbol}`);
            }
            if (data.isRetrograde) {
                infoParts.push(`<span class="text-red-500 font-bold">(R)</span>`);
            }

            // Custom house assignment for AS/MC if needed, otherwise use data.house
            if (planetName === "MC") {
                infoParts.push(`<span class="text-gray-500">(H10)</span>`);
            } else if (planetName === "AS") {
                infoParts.push(`<span class="text-gray-500">(H1)</span>`);
            } else if (data.house !== undefined && data.house !== 0) {
                infoParts.push(`<span class="text-gray-500">(H${data.house})</span>`);
            }

            content += `<span>${infoParts.join(' ')}</span>`;
            div.innerHTML = content;
            container.appendChild(div);
        }
    });
}

// --- Render Aspectarium Grid ---
function renderAspectarium() {
    const gridContainer = document.getElementById('aspectarium-grid');
    gridContainer.innerHTML = ''; // Clear previous content

    // Create a map for quick aspect lookup in both directions
    const aspectMap = new Map();
    jsonData.aspects.forEach(aspect => {
        aspectMap.set(`${aspect.planet1}-${aspect.planet2}`, aspect);
        aspectMap.set(`${aspect.planet2}-${aspect.planet1}`, aspect);
    });

    // Determine the actual list of planets to use in the grid based on available data
    const activeGridPlanets = planetOrderForGrid.filter(p => jsonData.positions[p] || jsonData.angles[p]);
    const gridSize = activeGridPlanets.length;

    // Set CSS grid template columns dynamically: 1 column for row labels + N columns for aspects
    gridContainer.style.gridTemplateColumns = `repeat(${gridSize + 1}, 50px)`; // Each cell is 50px wide

    // --- Create Cells for the Grid ---

    // 1. Top-left empty cell (corner)
    gridContainer.appendChild(createCell('', '')); // Custom CSS handles its borders/background

    // 2. Header row (column labels)
    activeGridPlanets.forEach(planetName => {
        gridContainer.appendChild(createCell(`<span class="symbol">${getPlanetSymbol(planetName)}</span>`, 'grid-header-cell'));
    });

    // 3. Data rows (row labels + aspect cells)
    activeGridPlanets.forEach((rowPlanet, rowIndex) => {
        // First cell in this row (Row label)
        gridContainer.appendChild(createCell(`<span class="symbol">${getPlanetSymbol(rowPlanet)}</span>`, 'grid-header-cell'));

        activeGridPlanets.forEach((colPlanet, colIndex) => {
            let cellContent = '';
            let extraClasses = '';

            if (colIndex > rowIndex) {
                // Upper triangle - empty cells
                extraClasses = 'grid-empty-cell';
            } else if (colIndex === rowIndex) {
                // Diagonal cells - planet symbol (as seen in the second image)
                cellContent = `<span class="symbol">${getPlanetSymbol(colPlanet)}</span>`;
                extraClasses = 'grid-diagonal-cell';
            } else {
                // Lower triangle - aspect between rowPlanet and colPlanet
                const aspect = aspectMap.get(`${rowPlanet}-${colPlanet}`);
                if (aspect) {
                    const aspectSymbol = getAspectSymbol(aspect.aspect);
                    const colorClass = getAspectColorClass(aspect.aspect);
                    const applySepIndicator = aspect.applying ? 'A' : 'S';
                    const orbValue = formatOrb(aspect.orb);

                    cellContent = `
                        <span class="symbol ${colorClass}">${aspectSymbol}</span>
                        <span class="aspect-apply-sep ${applySepIndicator === 'A' ? 'text-red-600' : 'text-gray-500'}">${applySepIndicator}</span>
                        <span class="aspect-orb">${orbValue}</span>
                    `;
                }
            }
            gridContainer.appendChild(createCell(cellContent, extraClasses));
        });
    });
}

// Helper to create a div cell with content and classes
function createCell(content, extraClasses = '') {
    const cell = document.createElement('div');
    cell.className = `aspectarium-cell ${extraClasses}`;
    cell.innerHTML = content;
    return cell;
}

document.addEventListener('DOMContentLoaded', () => {
    renderPlanetPositions();
    renderAspectarium();
});