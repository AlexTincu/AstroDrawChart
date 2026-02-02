const swisseph = require('swisseph');
const { filterAspects } = require('./utils/astroUtils');


/**
 * Professional Astrological Calculator using Swiss Ephemeris
 * Calculates natal charts, transits, synastry aspects, and solar returns.
 */
class AstrologicalCalculator {
    constructor(houseSystem = 'P', considerAspectsCompatibility = true) {
        // Initialize Swiss Ephemeris
        swisseph.swe_set_ephe_path('./ephemeris');

        // Planet constants
        this.planets = {
            Sun: swisseph.SE_SUN,
            Moon: swisseph.SE_MOON,
            Mercury: swisseph.SE_MERCURY,
            Venus: swisseph.SE_VENUS,
            Mars: swisseph.SE_MARS,
            Jupiter: swisseph.SE_JUPITER,
            Saturn: swisseph.SE_SATURN,
            Uranus: swisseph.SE_URANUS,
            Neptune: swisseph.SE_NEPTUNE,
            Pluto: swisseph.SE_PLUTO,
            NNode: swisseph.SE_TRUE_NODE,
            Chiron: swisseph.SE_CHIRON,
            Lilith: swisseph.SE_MEAN_APOG, // Mean Black Moon Lilith
            // Vertex: swisseph.SE_VERTEX,
            // Ceres: swisseph.SE_CERES,
            // Pallas: swisseph.SE_PALLAS,
            Juno: swisseph.SE_JUNO,
            // Vesta: swisseph.SE_VESTA,
        };

        // Natal Aspect definitions (in degrees)
        this.aspects = {
            CONJUNCTION: { angle: 0, orb: 8, name: 'conjunction' },
            OPPOSITION: { angle: 180, orb: 8, name: 'opposition' },
            TRINE: { angle: 120, orb: 8, name: 'trine' },
            SQUARE: { angle: 90, orb: 8, name: 'square' },
            SEXTILE: { angle: 60, orb: 6, name: 'sextile' },
        };

        // Transit/Synastry aspect definitions
        this.transitAspects = {
            CONJUNCTION: { angle: 0, name: 'conjunction', symbol: '☌' },
            OPPOSITION: { angle: 180, name: 'opposition', symbol: '☍' },
            TRINE: { angle: 120, name: 'trine', symbol: '△' },
            SQUARE: { angle: 90, name: 'square', symbol: '□' },
            SEXTILE: { angle: 60, name: 'sextile', symbol: '⚹' },
        };

        // Transit orbs based on the transiting planet
        this.transitOrbs = {
            Saturn: { major: 2, minor: 1 },
            Uranus: { major: 2, minor: 1 },
            Neptune: { major: 2, minor: 1 },
            Pluto: { major: 2, minor: 1 },
            Jupiter: { major: 1.5, minor: 0.5 },
            Sun: { major: 1, minor: 0.5 },
            Moon: { major: 1, minor: 0.5 },
            Mercury: { major: 1, minor: 0.5 },
            Venus: { major: 1, minor: 0.5 },
            Mars: { major: 1, minor: 0.5 },
            NNode: { major: 1, minor: 0.5 },
            SNode: { major: 1, minor: 0.5 },
            Chiron: { major: 1, minor: 0.5 },
            Lilith: { major: 1, minor: 0.5 }
        };

        this.majorAspects = ['conjunction', 'opposition', 'trine', 'square', 'sextile'];
        this.minorAspects = ['quincunx', 'semisextile', 'semisquare', 'sesquiquadrate'];

        // House system (Placidus by default)
        this.houseSystem = houseSystem;
        this.considerAspectsCompatibility = considerAspectsCompatibility;
    }

    // =========================================================================
    // == CORE CHART CALCULATION METHODS (from natal.js)
    // =========================================================================

    addAnglesToPositions(positions, angles, houses) {
        const { AS, MC } = angles;
        let onlyAngles = { AS, MC };
        const merged = { ...positions, ...onlyAngles };
        onlyAngles = this.addHouse(onlyAngles, houses);

        return merged;
    }
    /**
     * Generates a complete astrological chart for a specific moment.
     * @param {Object} birthData - Birth information { date, latitude, longitude }.
     * @returns {Object} Complete chart with planets, houses, and natal aspects.
     */
    generateChart(birthData) {
        const { date, latitude, longitude } = birthData;
        const julianDay = this.dateToJulianDay(date);
        const houses = this.calculateHouses(julianDay, latitude, longitude);
        let planets = this.calculatePlanetaryPositions(julianDay, houses.houses);

        const { AS, MC } = houses.angles;
        let angles = { AS, MC };

        angles = this.addHouse(angles, houses.houses);

        let aspects = this.calculateNatalAspects(planets, angles);
        aspects = filterAspects(aspects, { ...planets, ...angles }, this.considerAspectsCompatibility);

        planets = this.addAnglesToPositions(planets, houses.angles, houses.houses);

        return {
            planets,
            houses: houses.houses,
            angles: houses.angles,
            aspects,
            // meta: {
            //     julianDay,
            //     date: date.toISOString(),
            //     latitude,
            //     longitude,
            // },
        };
    }

    generateTransitsChart(transitData, houses, angles) {
        const { date, latitude, longitude } = transitData;
        const julianDay = this.dateToJulianDay(date);
        const planets = this.calculatePlanetaryPositions(julianDay, houses);

        const { AS, MC } = angles;
        const filteredAngles = { AS, MC };

        let aspects = this.calculateNatalAspects(planets, filteredAngles);
        aspects = filterAspects(aspects, { ...planets, ...filteredAngles }, this.considerAspectsCompatibility);

        return {
            angles,
            planets,
            houses,
            aspects,
            meta: {
                julianDay,
                date: date.toISOString(),
                latitude,
                longitude,
            },
        };
    }

    // =========================================================================
    // == SOLAR RETURN CALCULATION METHODS
    // =========================================================================

    /**
     * Calculate solar return chart for a given year and location.
     * @param {Object} solarReturnData - Solar return parameters
     * @param {Date} solarReturnData.birthDate - Original birth date in UTC
     * @param {Object} solarReturnData.birthPlace - {latitude, longitude} of birth
     * @param {number} solarReturnData.returnYear - Year for solar return
     * @param {Object} solarReturnData.currentLocation - Optional {latitude, longitude} for current location
     * @returns {Object} Solar return chart with positions, houses, and aspects
     */
    calculateSolarReturn(solarReturnData, natalChart) {
        const { birthDate, birthPlace, returnYear, currentLocation } = solarReturnData;

        try {
            // Step 1: Get natal Sun's exact longitude
            const natalSunLongitude = this.getNatalSunLongitude(birthDate);

            // Step 2: Find exact moment when Sun returns to natal longitude in target year
            // PASĂM ÎNTREAGA DATĂ DE NAȘTERE PENTRU UN PUNCT DE START MAI BUN
            const solarReturnMoment = this.findSolarReturnMoment(natalSunLongitude, returnYear, birthDate);

            // Step 3: Use current location if provided, otherwise use birth location
            const location = currentLocation || birthPlace;

            // Step 4: Calculate chart for solar return moment and location
            const solarReturnChart = this.generateChart({
                date: solarReturnMoment,
                latitude: location.latitude,
                longitude: location.longitude
            });

            solarReturnChart.planets = this.addHouse(solarReturnChart.planets, natalChart.houses, 'natal_house');
            solarReturnChart.angles = this.addHouse(solarReturnChart.angles, natalChart.houses, 'natal_house');

            return {
                ...solarReturnChart,
                meta: {
                    birth: {
                        date: birthDate.toISOString(),
                        ...birthPlace
                    },
                    solar_return: {
                        date: solarReturnMoment.toISOString(),
                        year: returnYear,
                        ...location,
                        natalSunLongitude: natalSunLongitude,
                        same_location: JSON.stringify(location) === JSON.stringify(birthPlace)
                    },
                    house_system: this.houseSystem
                }
            };

        } catch (error) {
            console.error('Error calculating solar return:', error);
            throw new Error(`Solar return calculation failed: ${error.message}`);
        }
    }

    /**
     * Get the exact longitude of the natal Sun.
     * ...
     */
    getNatalSunLongitude(birthDate) {
        // ... funcția ta este corectă, nu necesită modificări
        const julianDay = this.dateToJulianDay(birthDate);
        const flags = swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED;

        // for Swiss Ephemeris => swisseph.SEFLG_SPEED | swisseph.SEFLG_SWIEPH

        try {
            const result = swisseph.swe_calc_ut(julianDay, swisseph.SE_SUN, flags);
            if (result.rflag >= 0) {
                return result.longitude;
            } else {
                throw new Error('Failed to calculate natal Sun position');
            }
        } catch (error) {
            throw new Error(`Error getting natal Sun longitude: ${error.message}`);
        }
    }

    /**
     * Find the exact moment when Sun returns to its natal longitude in a given year.
     * @param {number} natalSunLongitude - Target longitude for Sun
     * @param {number} year - Target year
     * @param {Date} birthDate - The original birth date, used to create a good starting point
     * @returns {Date} Moment of solar return
     */
    findSolarReturnMoment(natalSunLongitude, year, birthDate) {
        // =======================================================================
        // == BUG FIX: Construim un punct de start mult mai precis.
        // Folosim luna, ziua și ora nașterii, dar în anul țintă.
        // =======================================================================
        const searchStartDate = new Date(Date.UTC(
            year,
            birthDate.getUTCMonth(),
            birthDate.getUTCDate(),
            birthDate.getUTCHours(),
            birthDate.getUTCMinutes(),
            birthDate.getUTCSeconds()
        ));

        let searchJD = this.dateToJulianDay(searchStartDate);

        const flags = swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED;
        const tolerance = 0.00001; // O toleranță mică pentru precizie
        const maxIterations = 20; // Ar trebui să conveargă în 2-3 iterații acum

        try {
            for (let i = 0; i < maxIterations; i++) {
                const result = swisseph.swe_calc_ut(searchJD, swisseph.SE_SUN, flags);

                if (result.rflag < 0) {
                    throw new Error('Failed to calculate Sun position during search');
                }

                let currentLongitude = result.longitude;
                let targetLongitude = natalSunLongitude;

                // Gestionarea corectă a trecerii peste 0°/360°
                let longitudeDiff = targetLongitude - currentLongitude;
                if (longitudeDiff > 180) {
                    longitudeDiff -= 360;
                } else if (longitudeDiff < -180) {
                    longitudeDiff += 360;
                }

                // Verificăm dacă am atins precizia dorită
                if (Math.abs(longitudeDiff) < tolerance) {
                    return this.julianDayToDate(searchJD);
                }

                // Calculăm următoarea aproximație folosind viteza Soarelui
                const sunSpeed = result.longitudeSpeed; // grade pe zi
                if (Math.abs(sunSpeed) < 0.0001) {
                    throw new Error('Sun speed too small for calculation');
                }

                const daysToTarget = longitudeDiff / sunSpeed;
                searchJD += daysToTarget;
            }

            // Dacă nu a convers, returnăm cea mai bună aproximație găsită
            return this.julianDayToDate(searchJD);

        } catch (error) {
            throw new Error(`Error finding solar return moment: ${error.message}`);
        }
    }


    /**
     * Convert Julian Day back to JavaScript Date object.
     * @param {number} julianDay - Julian Day Number
     * @returns {Date} JavaScript Date object
     */
    julianDayToDate(julianDay) {
        try {
            const result = swisseph.swe_revjul(julianDay, swisseph.SE_GREG_CAL);
            return new Date(Date.UTC(result.year, result.month - 1, result.day,
                Math.floor(result.hour),
                Math.floor((result.hour % 1) * 60),
                Math.floor(((result.hour % 1) * 60 % 1) * 60)
            ));
        } catch (error) {
            throw new Error(`Error converting Julian Day to Date: ${error.message}`);
        }
    }

    /**
     * Convert date and time to Julian Day Number.
     * @param {Date} date - The date to convert (assumed to be in UTC).
     * @returns {number} Julian Day Number.
     */
    dateToJulianDay(date) {
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
        return swisseph.swe_julday(year, month, day, hour, swisseph.SE_GREG_CAL);
    }

    addHouse(positions, houses, fieldName = "house") {

        Object.keys(positions).forEach(key => {
            positions[key][fieldName] = this.determinePlanetHouse(positions[key].longitude, houses).number;;
        });

        // positions.forEach((position, index) => {
        //     positions[fieldName] = this.determinePlanetHouse(position.longitude, houses).number;
        // });

        return positions;
    }

    /**
     * Calculate planetary positions, including speed and house placement.
     * @param {number} julianDay - Julian Day Number.
     * @param {Object} houses - House data object from calculateHouses.
     * @returns {Object} A map of planets to their positional data.
     */
    calculatePlanetaryPositions(julianDay, houses = null) {
        const positions = {};
        const flags = swisseph.SEFLG_SWIEPH | swisseph.SEFLG_SPEED;

        for (const [planetName, planetId] of Object.entries(this.planets)) {
            try {
                const result = swisseph.swe_calc_ut(julianDay, planetId, flags);
                if (result.rflag >= 0) {
                    const planetData = {
                        longitude: parseFloat(result.longitude.toFixed(3)),
                        longitudeSpeed: result.longitudeSpeed,
                        isRetrograde: result.longitudeSpeed < 0,
                        sign: this.getZodiacSign(result.longitude),
                        degree: this.formatDegree(result.longitude),
                    };

                    if (houses) {
                        planetData.house = this.determinePlanetHouse(result.longitude, houses).number;
                    }
                    positions[planetName] = planetData;
                }
            } catch (error) {
                console.warn(`Error calculating position for ${planetName}:`, error.message);
            }
        }

        if (positions.NNode) {
            const southNode = this.calculateSouthNode(positions);
            if (southNode && houses) {
                southNode.house = this.determinePlanetHouse(southNode.longitude, houses).number;
            }
            positions.SNode = southNode;
        }

        return positions;
    }

    /**
     * Calculate house cusps and main angles (ASC, MC).
     * @param {number} julianDay - Julian Day Number.
     * @param {number} latitude - Latitude in degrees.
     * @param {number} longitude - Longitude in degrees.
     * @returns {Object|null} House cusps and angles or null on error.
     */
    calculateHouses(julianDay, latitude, longitude) {
        try {
            const result = swisseph.swe_houses(julianDay, latitude, longitude, this.houseSystem);
            return {
                houses: result.house.map((cusp, index) => ({
                    house: index + 1,
                    cusp: parseFloat(cusp.toFixed(3)),
                    sign: this.getZodiacSign(cusp),
                    degree: this.formatDegree(cusp),
                })),
                angles: {
                    AS: {
                        longitude: parseFloat(result.ascendant.toFixed(3)),
                        sign: this.getZodiacSign(result.ascendant),
                        degree: this.formatDegree(result.ascendant)
                    },
                    MC: {
                        longitude: parseFloat(result.mc.toFixed(3)),
                        sign: this.getZodiacSign(result.mc),
                        degree: this.formatDegree(result.mc)
                    },
                    DS: {
                        longitude: parseFloat(((result.ascendant + 180) % 360).toFixed(3)),
                        sign: this.getZodiacSign((result.ascendant + 180) % 360),
                        degree: this.formatDegree((result.ascendant + 180) % 360)
                    },
                    IC: {
                        longitude: parseFloat(((result.mc + 180) % 360).toFixed(3)),
                        sign: this.getZodiacSign((result.mc + 180) % 360),
                        degree: this.formatDegree((result.mc + 180) % 360)
                    },
                },
            };
        } catch (error) {
            console.error('Error calculating houses:', error.message);
            return null;
        }
    }

    filterAspect(planet1, planet2, aspect) {
        const valid = !((planet1 === 'NNode' || planet2 === 'NNode') && aspect.name === 'opposition');

        return valid;
    }

    /**
     * Calculate NATAL aspects between planets in a single chart.
     * @param {Object} positions - Planetary positions from calculatePlanetaryPositions.
     * @returns {Array} Array of natal aspects.
     */
    calculateNatalAspects(positions, angles) {
        const aspects = [];
        const planetNames = Object.keys(positions);

        // planet to planet
        for (let i = 0; i < planetNames.length; i++) {
            for (let j = i + 1; j < planetNames.length; j++) {
                const planet1 = planetNames[i];
                const planet2 = planetNames[j];
                const angle = this.calculateAngleBetweenPlanets(positions[planet1].longitude, positions[planet2].longitude);

                const aspect = this.findNatalAspect(angle);
                if (aspect) {
                    if (this.filterAspect(planet1, planet2, aspect)) {
                        aspects.push({
                            planet1,
                            planet2,
                            aspect: aspect.name,
                            angle: aspect.angle,
                            orb: parseFloat(Math.abs(angle - aspect.angle).toFixed(2)),
                            applying: this.isNatalAspectApplying(positions[planet1], positions[planet2], aspect.angle)
                        });
                    }
                }

            }
        }


        // aspect to planet
        const aspectNames = Object.keys(angles);
        for (let i = 0; i < aspectNames.length; i++) {
            for (let j = i + 1; j < planetNames.length; j++) {
                const planet1 = aspectNames[i];
                const planet2 = planetNames[j];
                const angle = this.calculateAngleBetweenPlanets(angles[planet1].longitude, positions[planet2].longitude);

                const aspect = this.findNatalAspect(angle);
                if (aspect) {
                    if (this.filterAspect(planet1, planet2, aspect)) {
                        aspects.push({
                            planet1,
                            planet2,
                            aspect: aspect.name,
                            angle: aspect.angle,
                            orb: parseFloat(Math.abs(angle - aspect.angle).toFixed(2)),
                            applying: this.isNatalAspectApplying(angles[planet1], positions[planet2], aspect.angle)
                        });
                    }
                }

            }
        }

        return aspects;

        return aspects.sort((a, b) => a.orb - b.orb);
    }

    // =========================================================================
    // == TRANSIT & SYNASTRY CALCULATION METHODS (from synastry.js)
    // =========================================================================

    /**
     * Calculate aspects between two sets of planetary positions (transits or synastry).
     * @param {Object} chart1Positions - The first set of planetary positions (e.g., Natal).
     * @param {Object} chart2Positions - The second set of planetary positions (e.g., Transit or Partner).
     * @param {Date} transitDate - The date of the transit chart, for peak date estimation.
     * @returns {Object} An object containing the list of aspects and a summary.
     */
    calculateAspectsOfTwoCharts(transitPositions, natalPositions, index1 = 'transit', index2 = 'natal', isTransit = false, transitDate = new Date()) {
        const aspects = [];

        for (const [transit_planet, transit_position] of Object.entries(transitPositions)) { // Transit/Partner
            for (const [natal_planet, natal_position] of Object.entries(natalPositions)) { // Natal
                const aspectData = this.findTransitAspect(transit_position.longitude, natal_position.longitude, transit_planet);

                if (aspectData) {
                    let aspect = {
                        title: `${transit_planet} (${transit_position.sign}, H${transit_position.house}) ${aspectData.aspect.name} ${natal_planet} (${natal_position.sign}, H${natal_position.house})`,
                        // transit_planet: transit_planet,
                        // transit_sign: transit_position.sign,
                        // transit_house: transit_position.house,
                        // natal_planet: natal_planet,
                        // natal_sign: natal_position.sign,
                        // natal_house: natal_position.house,
                        aspect: aspectData.aspect.name,
                        orb: parseFloat(aspectData.orb.toFixed(2)),
                    };

                    aspect[index1] = { planet: transit_planet, sign: transit_position.sign, house: transit_position.house, longitude: transit_position.longitude };
                    aspect[index2] = { planet: natal_planet, sign: natal_position.sign, house: natal_position.house, longitude: natal_position.longitude };

                    if (isTransit) {
                        aspect.title = `${transit_planet} in transit (${transit_position.sign}, H${transit_position.house}) ${aspectData.aspect.name} ${natal_planet} natal (${natal_position.sign}, H${natal_position.house})`;
                        aspect.applying = this.isTransitApplying(transit_position, natal_position, aspectData.targetAngle);
                        aspect.peakDate = this.estimatePeakDate(transit_position, natal_position, aspectData.targetAngle, transitDate);
                    }

                    aspects.push(aspect);
                }
            }
        }

        return aspects;
        return aspects.sort((a, b) => a.orb - b.orb);
    }

    // /**
    //  * Calculate transits for a natal chart
    //  * @param {Object} natalPositions - Natal planet positions
    //  * @param {Date} transitDate - Date for transit calculation (default: now)
    //  * @returns {Object} Transit analysis
    //  */
    // calculateAspects(natalPositions, transitPositions) 
    // {
    //     const aspects = [];

    //     // Calculate all transit aspects
    //     for (const [transitPlanet, transitPos] of Object.entries(transitPositions)) {
    //         for (const [natalPlanet, natalPos] of Object.entries(natalPositions)) {
    //             const aspectData = this.findTransitAspect(
    //                 transitPos.longitude,
    //                 natalPos.longitude,
    //                 transitPlanet,
    //             );

    //             if (aspectData) {
    //                 const aspect = {
    //                     planet1: transitPlanet,
    //                     sign1: transitPos.sign,
    //                     planet2: natalPlanet,
    //                     sign2: natalPos.sign,
    //                     aspect: aspectData.aspect.name, // only name for now
    //                     orb: parseFloat(aspectData.orb.toFixed(2)),
    //                     exactness: aspectData.exactness,
    //                     applying: this.isTransitApplying(transitPos, natalPos, aspectData.targetAngle),
    //                     transitPosition: {
    //                         longitude: transitPos.longitude,
    //                         sign: transitPos.sign,
    //                         degree: transitPos.degree,
    //                         isRetrograde: transitPos.isRetrograde,
    //                         natalHouse: transitPositions[transitPlanet]['number']
    //                     },
    //                     natalPosition: {
    //                         longitude: natalPos.longitude,
    //                         sign: natalPos.sign,
    //                         degree: natalPos.degree,
    //                         house: natalPos.house.number
    //                     },
    //                     // peakDate: this.estimatePeakDate(transitPos, natalPos, aspectData.targetAngle, transitDate)
    //                 };

    //                 aspects.push(aspect);
    //             }
    //         }
    //     }

    //     // Sort by exactness (closest aspects first)
    //     transits.aspects.sort((a, b) => a.orb - b.orb);

    //     return transits;
    // }

    /**
     * Find a transit aspect for a given angle, using transit orbs.
     * @param {number} transitLong - Longitude of the transiting planet.
     * @param {number} natalLong - Longitude of the natal planet.
     * @param {string} transitPlanet - Name of the transiting planet (to determine orb).
     * @returns {Object|null} Aspect data or null.
     */
    findTransitAspect(transitLong, natalLong, transitPlanet) {
        const angle = this.calculateAngleBetweenPlanets(transitLong, natalLong);
        for (const [aspectName, aspectData] of Object.entries(this.transitAspects)) {
            const orb = this.getTransitOrb(transitPlanet, aspectData.name);
            const angleDiff = Math.abs(angle - aspectData.angle);
            if (angleDiff <= orb) {
                return {
                    aspect: aspectData,
                    orb: angleDiff,
                    targetAngle: aspectData.angle,
                };
            }
        }
        return null;
    }

    /**
     * Get the appropriate orb for a transit aspect.
     * @param {string} transitPlanet - The transiting planet.
     * @param {string} aspectName - The name of the aspect.
     * @returns {number} Orb in degrees.
     */
    getTransitOrb(transitPlanet, aspectName) {
        const planetOrbs = this.transitOrbs[transitPlanet] || { major: 1, minor: 0.5 };
        return this.majorAspects.includes(aspectName) ? planetOrbs.major : planetOrbs.minor;
    }

    /**
     * Check if a transit aspect is applying or separating.
     * @param {Object} transitPos - Transiting planet position data.
     * @param {Object} natalPos - Natal planet position data.
     * @param {number} targetAngle - The exact angle of the aspect (e.g., 0 for conjunction).
     * @returns {boolean} True if the aspect is applying.
     */
    isTransitApplying(transitPos, natalPos, targetAngle) {
        const speed = transitPos.longitudeSpeed;
        const currentAngle = this.calculateAngleBetweenPlanets(transitPos.longitude, natalPos.longitude);
        const futureTransitLong = (transitPos.longitude + speed / 24) % 360; // A small step into the future
        const futureAngle = this.calculateAngleBetweenPlanets(futureTransitLong, natalPos.longitude);
        return Math.abs(futureAngle - targetAngle) < Math.abs(currentAngle - targetAngle);
    }

    /**
     * Estimates the date when a transit aspect will be exact.
     * @returns {Date|null} Estimated peak date or null if not applicable.
     */
    estimatePeakDate(transitPos, natalPos, targetAngle, currentDate) {
        if (Math.abs(transitPos.longitudeSpeed) < 0.001) return null; // Stationary
        const currentAngle = this.calculateAngleBetweenPlanets(transitPos.longitude, natalPos.longitude);
        const angleDifference = targetAngle - currentAngle;
        let adjustedDiff = angleDifference;
        if (Math.abs(adjustedDiff) > 180) {
            adjustedDiff = adjustedDiff > 0 ? adjustedDiff - 360 : adjustedDiff + 360;
        }
        const daysToExact = adjustedDiff / transitPos.longitudeSpeed;
        if (Math.abs(daysToExact) > 365 * 5) return null; // Ignore if more than 5 years away
        return new Date(currentDate.getTime() + daysToExact * 24 * 60 * 60 * 1000);
    }

    // =========================================================================
    // == HELPER & UTILITY METHODS
    // =========================================================================

    /**
     * Calculates the angle between two longitudinal points.
     * @returns {number} The shortest angle (0-180).
     */
    calculateAngleBetweenPlanets(long1, long2) {
        let angle = Math.abs(long1 - long2);
        return angle > 180 ? 360 - angle : angle;
    }

    /**
     * Find a natal aspect for a given angle.
     * @param {number} angle - Angle between planets.
     * @returns {Object|null} Aspect object or null.
     */
    findNatalAspect(angle) {
        for (const [, aspectData] of Object.entries(this.aspects)) {
            if (Math.abs(angle - aspectData.angle) <= aspectData.orb) {
                return aspectData;
            }
        }
        return null;
    }

    /**
     * Check if a natal aspect is applying or separating.
     * @returns {boolean} True if applying.
     */
    isNatalAspectApplying(planet1, planet2, aspectAngle) {
        const currentAngle = this.calculateAngleBetweenPlanets(planet1.longitude, planet2.longitude);
        const futureAngle = this.calculateAngleBetweenPlanets(
            planet1.longitude + planet1.longitudeSpeed / 24,
            planet2.longitude + planet2.longitudeSpeed / 24
        );
        return Math.abs(futureAngle - aspectAngle) < Math.abs(currentAngle - aspectAngle);
    }

    /**
     * Determines the house a planet is in.
     * @returns {Object} House information.
     */
    determinePlanetHouse(planetLongitude, houseCusps) {
        let normalizedLong = planetLongitude % 360;
        if (normalizedLong < 0) normalizedLong += 360;
        const cusps = houseCusps.map(h => h.cusp);

        for (let i = 0; i < 12; i++) {
            const currentCusp = cusps[i];
            const nextCusp = cusps[(i + 1) % 12];
            if (nextCusp < currentCusp) { // Wraps around 0 Aries
                if (normalizedLong >= currentCusp || normalizedLong < nextCusp) {
                    return { number: i + 1 };
                }
            } else {
                if (normalizedLong >= currentCusp && normalizedLong < nextCusp) {
                    return { number: i + 1 };
                }
            }
        }
        return { number: 1 }; // Fallback
    }

    /**
     * Get zodiac sign for a given longitude.
     * @returns {string} Zodiac sign.
     */
    getZodiacSign(longitude) {
        const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
        return signs[Math.floor(longitude / 30)];
    }

    /**
     * Format longitude into degrees, minutes, seconds.
     * @returns {string} Formatted degree string.
     */
    formatDegree(longitude) {
        const degree = longitude % 30;
        const d = Math.floor(degree);
        const m = Math.floor((degree - d) * 60);
        return `${d}°${String(m).padStart(2, '0')}'`;
    }

    /**
     * Calculate South Node position.
     * @returns {Object} South Node data.
     */
    calculateSouthNode(positions) {
        if (!positions.NNode) return null;
        const southNodeLongitude = (positions.NNode.longitude + 180) % 360;
        return {
            ...positions.NNode,
            longitude: southNodeLongitude,
            longitudeSpeed: positions.NNode.longitudeSpeed, // Same speed
            sign: this.getZodiacSign(southNodeLongitude),
            degree: this.formatDegree(southNodeLongitude),
        };
    }

    /**
     * Set the house system for calculations.
     * @param {string} system - House system code (e.g., 'P', 'W', 'K').
     */
    setHouseSystem(system = 'P') {
        this.houseSystem = system;
    }

    /**
     * Close the Swiss Ephemeris files.
     */
    close() {
        swisseph.swe_close();
    }
}

module.exports = AstrologicalCalculator;