const express = require('express');
// const NatalCalculator = require('./natal');
const TransitCalculator = require('./transit');
const AstrologicalCalculator = require('./natalWithTranzits');
const SynastryCalculator = require('./synastry');
const ProgressiveCalculator = require('./progressive'); // Import the progressive calculator
const { generateChartSVG } = require('./utils/chartGenerator');
const { toAstrochart } = require('./utils/astroUtils');

const cors = require('cors');

// const { DateTime } = require("luxon");
// const DateTimeUtils = require("./DateTimeUtils");

const app = express();
app.use(express.json());
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:8089',
            'https://astro-help.ro', // Adaugă domeniul tău aici
            'null' // Păstrează 'null' pentru anumite scenarii (ex. cereri din fișiere locale)
        ];

        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        } else {
            callback(new Error(`Not allowed by CORS: ${origin}`)); // Adaugă originul în mesajul de eroare pentru debug
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));


app.get('/', (req, res) => {
    res.json(`Astro API listening on port ${PORT}`);
});


app.post('/natal', (req, res) => {
    const { settings, birth } = req.body;

    const { date, latitude, longitude } = birth;
    const { house_system = 'W', target_date = null, transits = false, aspects_compatibility = true } = settings;

    if (!date || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Missing required parameters: date, latitude, longitude' });
    }

    let response = {};

    let natal = null;
    let transitChart = null;
    let crossAspects = null;

    try {
        const astrologicalCalculator = new AstrologicalCalculator(house_system, aspects_compatibility);
        const birthData = {
            date: new Date(date), // must be utc date "Z" format. you should reduce with 2h to reflect astro.com ???
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
        };

        natal = astrologicalCalculator.generateChart(birthData);

        if (transits) {
            const transitData = {
                date: target_date ? new Date(target_date) : new Date(),
                latitude: parseFloat(latitude ?? latitude),
                longitude: parseFloat(longitude ?? longitude),
            };

            transitChart = astrologicalCalculator.generateTransitsChart(transitData, natal.houses, natal.angles);
            crossAspects = astrologicalCalculator.calculateAspectsOfTwoCharts(transitChart.planets, natal.planets, 'transit', 'natal', true, transitData.date);
        }

        // Generate SVG and add it to the response
        let dataRadix;
        let dataTransits = null;
        let svg = null;

        try {
            dataRadix = toAstrochart({ ...natal.planets, ...natal.angles }, natal.houses, natal.aspects);

            if (transits) {
                dataTransits = toAstrochart(transitChart.planets, transitChart.houses, transitChart.aspects);
                dataTransits = { planets: dataTransits.planets, cusps: dataRadix.cusps };
            }

            svg = generateChartSVG(dataRadix, dataTransits);
        } catch (svgErr) {
            console.error('Failed to generate SVG:', svgErr);
        }

        response = {
            natal_chart: natal,
            transit_chart: transitChart,
            cross_aspects: crossAspects,
            svg: svg
        };


        res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/upcoming_transit_natal', (req, res) => {
    const { date, latitude, longitude, houseSystem = 'W', start_date, end_date, days = 30 } = req.body;

    if (!date || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Missing required parameters: date, latitude, longitude' });
    }
    try {
        const natalCalc = new AstrologicalCalculator(houseSystem);
        const transitCalculator = new TransitCalculator();

        const birthData = {
            date: new Date(date),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
        };
        const natalChart = natalCalc.generateChart(birthData);

        const transitData = {
            date: start_date ? new Date(start_date) : new Date(),
            latitude: parseFloat(latitude ?? latitude),
            longitude: parseFloat(longitude ?? longitude),
        };

        const transitChart = natalCalc.generateTransitsChart(transitData, natalChart.houses, natalChart.angles);
        const crossAspects = natalCalc.calculateAspectsOfTwoCharts(transitChart.planets, natalChart.planets, 'transit', 'natal', true, transitData.date);

        // Determine start and end dates
        let startDate, endDate;

        if (start_date) {
            startDate = new Date(start_date);
            if (isNaN(startDate.getTime())) {
                return res.status(400).json({ error: 'Invalid start_date format' });
            }
        } else {
            startDate = new Date(); // Default to current date
        }

        if (end_date) {
            endDate = new Date(end_date);
            if (isNaN(endDate.getTime())) {
                return res.status(400).json({ error: 'Invalid end_date format' });
            }
        } else {
            // If no end_date provided, use start_date + days (or current date + days if no start_date)
            endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
        }

        // Validate date range
        if (endDate <= startDate) {
            return res.status(400).json({ error: 'end_date must be after start_date' });
        }

        // Check if date range is not too large (optional safety check)
        const daysDifference = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000));
        if (daysDifference > 365) {
            return res.status(400).json({ error: 'Date range cannot exceed 365 days' });
        }


        // Prepare meta information
        const metaInfo = {
            birthDate: date,
            latitude: latitude,
            longitude: longitude,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            days: days,
            houseSystem: houseSystem
        };

        const upcomingTransits = transitCalculator.getTransitsInPeriod(natalChart.planets, natalChart.houses, startDate, endDate, 1);
        // Create formatted response using TransitCalculator method
        const upcomingTransitsTextual = transitCalculator.createUpcomingTransitsResponse(upcomingTransits, metaInfo);

        // Generate SVG and add it to the response
        let dataRadix;
        let dataTransits = null;
        let svg = null;

        try {
            dataRadix = toAstrochart({ ...natalChart.planets, ...natalChart.angles }, natalChart.houses, natalChart.aspects);

            if (transitChart) {
                dataTransits = toAstrochart(transitChart.planets, transitChart.houses);
                dataTransits = { planets: dataTransits.planets, cusps: dataRadix.cusps };
            }
            console.log(dataTransits);

            svg = generateChartSVG(dataRadix, dataTransits);
        } catch (svgErr) {
            console.error('Failed to generate SVG:', svgErr);
        }

        response = {
            meta: metaInfo,
            natal_chart: natalChart,
            transit_chart: transitChart,
            cross_aspects: crossAspects,
            upcoming_transits: upcomingTransitsTextual,
            svg: svg
        };

        res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/synastry', (req, res) => {
    const { settings, birth, birth2 } = req.body;

    const { date, latitude, longitude } = birth;
    const { house_system = 'W' } = settings;

    if (!birth || birth === undefined) {
        return res.status(400).json({ error: 'Missing required parameters: birth with fields like date, latitude, longitude' });
    }
    if (!birth2 || birth2 === undefined) {
        return res.status(400).json({ error: 'Missing required parameters: birth2 with fields like date, latitude, longitude' });
    }

    if (!date || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Missing required parameters: date, latitude, longitude' });
    }

    if (!birth2.date || birth2.latitude === undefined || birth2.longitude === undefined) {
        return res.status(400).json({ error: 'Missing required parameters: date, latitude, longitude' });
    }

    try {
        const birthData1 = {
            date: new Date(birth.date),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
        };

        const birthData2 = {
            date: new Date(birth2.date),
            latitude: parseFloat(birth2.latitude),
            longitude: parseFloat(birth2.longitude),
        };

        const astroCalc = new AstrologicalCalculator(house_system);

        const natal1 = astroCalc.generateChart(birthData1);
        const natal2 = astroCalc.generateChart(birthData2);

        cross_aspects = astroCalc.calculateAspectsOfTwoCharts(natal2.planets, natal1.planets, 'partner', 'me');

        let svg = null;
        try {
            dataRadix = toAstrochart({ ...natal1.planets, ...natal1.angles }, natal1.houses);
            dataPartner = toAstrochart({ ...natal2.planets, ...natal2.angles }, natal1.houses);
            svg = generateChartSVG(
                dataRadix,
                dataPartner,
                settings
            );
        } catch (svgErr) {
            console.error('Failed to generate Synastry SVG:', svgErr);
        }

        res.json({
            my_chart: natal1,
            partner_chart: natal2,
            cross_aspects: cross_aspects,
            svg: svg
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// New endpoint for progressed chart
app.post('/progressed', (req, res) => {
    const { settings, birth } = req.body;
    const { date, latitude, longitude } = birth;
    const { house_system = 'W', house_method = 'secondary', target_date = null } = settings;

    if (!date || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Missing required parameters: date, latitude, longitude' });
    }

    try {
        const natalCalc = new AstrologicalCalculator(house_system);
        const progressiveCalc = new ProgressiveCalculator(house_method);

        const birthData = {
            date: new Date(date),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude)
        };

        // Generate natal chart first
        const natalChart = natalCalc.generateChart(birthData);

        // Set target date (default to current date if not provided)
        const progressionDate = target_date ? new Date(target_date) : new Date();

        // Generate progressed chart
        const progressedChart = progressiveCalc.generateProgressedChart(
            birthData,
            natalChart.planets,
            progressionDate,
            house_method
        );

        // Get major progressed aspects only
        // const majorAspects = progressiveCalc.getMajorProgressedAspects(progressedChart.progression.aspects, 1.0);

        const response = {
            progressed_chart: progressedChart.chart,
            meta: progressedChart.meta,
            // natal: natalChart,
            // majorProgressedAspects: majorAspects,
            // summary: {
            //     totalProgressedAspects: progressedChart.progression.aspects.length,
            //     majorProgressedAspects: majorAspects.length,
            //     ageAtProgression: progressedChart.progressionData.age,
            //     progressionPeriod: {
            //         birthDate: progressedChart.progressionData.birthDate,
            //         targetDate: progressedChart.progressionData.targetDate,
            //         progressedDate: progressedChart.progressionData.progressedDate
            //     }
            // }
        };

        // Generate SVG and add it to the response
        try {
            // const dataRadix = toAstrochart({ ...natalChart.planets, ...natalChart.angles }, natalChart.houses, natalChart.aspects);
            const dataRadix = toAstrochart({ ...progressedChart.chart.planets, ...progressedChart.chart.angles }, progressedChart.chart.houses, progressedChart.chart.aspects);
            response.svg = generateChartSVG(dataRadix);
        } catch (svgErr) {
            console.error('Failed to generate Progressed SVG:', svgErr);
            response.svg = null;
        }

        res.json(response);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Solar Return endpoint
app.post('/solar_return', (req, res) => {
    const { settings, birth } = req.body;
    const { date: birthDate, latitude: birthLatitude, longitude: birthLongitude } = birth;
    const { house_system = 'W', return_year, current_location } = settings;

    // Validate required parameters
    if (!birthDate || birthLatitude === undefined || birthLongitude === undefined) {
        return res.status(400).json({
            error: 'Missing required birth parameters: date, latitude, longitude'
        });
    }

    if (return_year === undefined) {
        return res.status(400).json({
            error: 'Missing required parameter: return_year'
        });
    }

    // Validate year is reasonable
    const year = parseInt(return_year);
    const return_yearActual = new Date().getFullYear();
    if (year < 2024 || year > return_yearActual + 50) {
        return res.status(400).json({
            error: 'Year must be between 2024 and ' + (return_yearActual + 50)
        });
    }

    try {
        const astrologicalCalculator = new AstrologicalCalculator(house_system);

        const birthData = {
            date: new Date(birthDate), // must be utc date "Z" format. you should reduce with 2h to reflect astro.com ???
            latitude: parseFloat(birthLatitude),
            longitude: parseFloat(birthLongitude),
        };

        const solarReturnData = {
            birthDate: new Date(birthDate),
            birthPlace: {
                latitude: parseFloat(birthLatitude),
                longitude: parseFloat(birthLongitude)
            },
            returnYear: year,
            currentLocation: current_location ? {
                latitude: parseFloat(current_location.latitude),
                longitude: parseFloat(current_location.longitude)
            } : null
        };


        const natalChart = astrologicalCalculator.generateChart(birthData);
        const solarReturnChart = astrologicalCalculator.calculateSolarReturn(solarReturnData, natalChart);
        const cross_chart_aspects = astrologicalCalculator.calculateAspectsOfTwoCharts(solarReturnChart.planets, natalChart.planets, 'solar_return', 'natal');

        const { meta, ...solar_return_chart_clean } = solarReturnChart;

        let svg = null;
        try {
            const dataRadix = toAstrochart({ ...natalChart.planets, ...natalChart.angles }, natalChart.houses, natalChart.aspects);
            const dataSolar = toAstrochart({ ...solarReturnChart.planets, ...solarReturnChart.angles }, natalChart.houses);

            svg = generateChartSVG(
                dataRadix,
                {
                    planets: dataSolar.planets,
                    cusps: dataSolar.cusps,
                    aspects: cross_chart_aspects
                },
                settings
            );
        } catch (svgErr) {
            console.error('Failed to generate Solar Return SVG:', svgErr);
        }

        const response = {
            natal_chart: natalChart,
            solar_return_chart: solar_return_chart_clean,
            cross_chart_aspects,
            metadata: meta,
            svg: svg
        };

        astrologicalCalculator.close();
        res.json(response);
    } catch (err) {
        console.error('Solar return calculation error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        endpoints: ['/natal', '/solar-return']
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: ['GET /', 'POST /natal', 'POST /solar-return', 'GET /health']
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    // console.log(`Astro API server running on port ${PORT}`);
    // console.log(`Available endpoints:`);
    // console.log(`  GET  / - API info`);
    // console.log(`  POST /natal - Natal chart calculation`);
    // console.log(`  POST /solar-return - Solar return chart calculation`);
    // console.log(`  GET  /health - Health check`);
});