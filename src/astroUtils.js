// only the planets are displayed
const planetsToFilter = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith",
  "NNode",
  "SNode",
  "AS",
  "MC",
];

// only the planet aspects are displayed
const anglesToFilter = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
  "Chiron",
  "Lilith",
  "NNode",
  "SNode",
];

/**
 * Găsește poziția longitude a unei planete într-un obiect de date astrologice.
 * @param {object} planetsData - Obiectul ce conține datele planetelor.
 * @param {string} planetName - Numele planetei căutate.
 * @returns {number|null} Poziția longitude sau null dacă planeta nu este găsită.
 */
function getPlanetPosition(planetsData, planetName) {
  if (planetsData[planetName]) {
    const longitude = planetsData[planetName].longitude;
    // Dacă longitude este un array, luăm prima valoare, altfel luăm direct valoarea
    return Array.isArray(longitude) ? longitude[0] : longitude;
  }
  return null; // Returnează null dacă planeta nu este găsită
}

/**
 * Transformă datele astrologice brute într-un format specificat.
 * @param {object} inputData - Obiectul cu datele astrologice de intrare.
 * @returns {object} Obiectul transformat.
 */
function toAstrochart(planets, houses, aspects = []) {
  const outputData = {
    planets: {},
    cusps: [],
    aspects: [],
  };

  // filter data
  outputData.planets = filterPlanets(planets, planetsToFilter);
  outputData.planets = processPlanets(outputData.planets, planetsToFilter);

  outputData.cusps = processHouses(houses);

  if (aspects && aspects.length > 0) {
    outputData.aspects = filterAspectsByPlanets(aspects, anglesToFilter);
    outputData.aspects = processAspects(outputData.aspects, planets);
  }

  return outputData;
}

function processHouses(houses) {
  const cusps = [];
  // Procesarea caselor (cusps)
  if (houses && Array.isArray(houses)) {
    houses.forEach((house) => {
      if (house.hasOwnProperty("cusp")) {
        cusps.push(house.cusp);
      }
    });
  }

  return cusps;
}

function processPlanets(planets) {
  const outputData = {};
  for (const planetName in planets) {
    if (planets.hasOwnProperty(planetName)) {
      const planetData = planets[planetName];
      // Verificăm dacă există o a doua valoare pentru longitude (cum este cazul Pluto în exemplu)
      const longitude = Array.isArray(planetData.longitude)
        ? planetData.longitude
        : [planetData.longitude];
      outputData[planetName] = longitude;
    }
  }

  return outputData;
}

function processAspects(inputAspects, planets) {
  const aspects = [];

  if (inputAspects && Array.isArray(inputAspects)) {
    inputAspects.forEach((aspect) => {
      let color = "";
      // Verificăm dacă proprietatea 'aspect' există înainte de a o utiliza
      if (aspect.hasOwnProperty("aspect")) {
        switch (aspect.aspect) {
          case "opposition":
          case "square":
            color = "#FC0D0D";
            break;
          case "sextile":
            color = "#0088f0ff";
          case "trine":
            color = "#0075cfff";
            break;
          // Poți adăuga și alte cazuri aici dacă este necesar
        }
      }

      // Verificăm dacă proprietățile necesare există înainte de a le accesa
      const planet1 = aspect.planet1;
      const planet2 = aspect.planet2;
      const angle = aspect.angle;
      const orb = aspect.orb;
      const aspectName = aspect.aspect ? aspect.aspect.toLowerCase() : "";

      if (
        (planet1 === "NNode" || planet2 === "NNode") &&
        aspectName === "opposition"
      ) {
        return;
      }

      if (aspectName === "conjunction") {
        return;
      }

      if (planet1 && planet2 && angle !== undefined && orb !== undefined) {
        aspects.push({
          point: {
            name: planet1,
            position: getPlanetPosition(planets, planet1),
          },
          toPoint: {
            name: planet2,
            position: getPlanetPosition(planets, planet2),
          },
          aspect: {
            name: aspectName,
            degree: angle,
            color: color,
            orbit: orb,
          },
          precision: "0",
        });
      }
    });
  }

  return aspects;
}

function isCompatibleByElement(sign1, sign2) {
  const groups = [
    ["Aries", "Leo", "Sagittarius"],
    ["Taurus", "Virgo", "Capricorn"],
    ["Gemini", "Libra", "Aquarius"],
    ["Cancer", "Scorpio", "Pisces"],
  ];

  return groups.some((group) => group.includes(sign1) && group.includes(sign2));
}

function isCompatibleByPolarity(sign1, sign2) {
  const groups = [
    ["Aries", "Gemini", "Leo", "Libra", "Sagittarius", "Aquarius"], // Yang
    ["Taurus", "Cancer", "Virgo", "Scorpio", "Capricorn", "Pisces"], // Yin
  ];

  return groups.some((group) => group.includes(sign1) && group.includes(sign2));
}

function filterAspects(inputAspects, positions = []) {
  const aspects = [];
  if (inputAspects && Array.isArray(inputAspects)) {
    inputAspects.forEach((aspect) => {
      if (!aspect.hasOwnProperty("aspect")) {
        return;
      }

      // Verificăm dacă proprietățile necesare există înainte de a le accesa
      const planet1 = aspect.planet1;
      const planet2 = aspect.planet2;
      const angle = aspect.angle;
      const orb = aspect.orb;
      const aspectName = aspect.aspect ? aspect.aspect.toLowerCase() : "";

      let sign1 = positions[planet1].sign;
      let sign2 = positions[planet2].sign;

      // ne ajunge conjunctia cu SNode
      if (planet1 === "NNode" && aspectName === "opposition") {
        return;
      }

      if (aspectName === "square" && isCompatibleByElement(sign1, sign2)) {
        return;
      }

      if (aspectName === "trine" && !isCompatibleByElement(sign1, sign2)) {
        return;
      }

      if (aspectName === "sextile" && !isCompatibleByPolarity(sign1, sign2)) {
        return;
      }

      if (aspectName === "conjunction" && sign1 !== sign2) {
        return;
      }

      if (planet1 && planet2 && angle !== undefined && orb !== undefined) {
        aspects.push(aspect);
      }
    });
  }

  return aspects;
}

/**
 * Filtrează obiectul de planete, păstrând doar planetele specificate.
 * @param {object} planetsData - Obiectul original cu toate planetele.
 * @param {string[]} planetsToKeep - Un array de nume de planete care vor fi păstrate.
 * @returns {object} Un nou obiect conținând doar planetele specificate.
 */
function filterPlanets(planetsData, planetsToKeep) {
  const planets = {};
  planetsToKeep.forEach((planetName) => {
    if (planetsData.hasOwnProperty(planetName)) {
      planets[planetName] = planetsData[planetName];
    }
  });

  return planets;
}

/**
 * Filtrează array-ul de aspecte, păstrând doar aspectele care implică cel puțin una dintre planetele specificate.
 * @param {object[]} aspectsData - Array-ul original cu toate aspectele.
 * @param {string[]} planetsToKeep - Un array de nume de planete. Aspectele care implică aceste planete vor fi păstrate.
 * @returns {object[]} Un nou array conținând doar aspectele filtrate.
 */
function filterAspectsByPlanets(aspectsData, planetsToKeep) {
  // Creăm un Set pentru căutare rapidă
  const planetsSet = new Set(planetsToKeep);

  return aspectsData.filter((aspect) => {
    // Verificăm dacă ambele planete ale aspectului sunt în Set-ul celor pe care vrem să le păstrăm
    // Sau, dacă doar una dintre ele este în Set
    const involvesPlanet1 = planetsSet.has(aspect.planet1);
    const involvesPlanet2 = planetsSet.has(aspect.planet2);

    return involvesPlanet1 && involvesPlanet2;
  });
}

// Exportarea funcțiilor pentru a fi utilizate în alte module
module.exports = {
  getPlanetPosition,
  filterAspects,
  filterPlanets,
  filterAspectsByPlanets,
  processPlanets,
  processHouses,
  processAspects,
  toAstrochart,
};
