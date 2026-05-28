// Jolpica F1 API wrapper with local fallback
// Uses local /api/ proxy to avoid CORS issues
const F1API = {
    BASE: '/api',

    // Circuit map URL mapping: circuitId → F1.com CDN image URL name
    // Uses https://media.formula1.com/ 2018-redesign-assets
    CIRCUIT_MAP_NAMES: {
        albert_park: 'Australia',
        shanghai: 'China',
        suzuka: 'Japan',
        miami: 'Miami',
        villeneuve: 'Canada',
        monaco: 'Monaco',
        catalunya: 'Spain',
        red_bull_ring: 'Austria',
        silverstone: 'Great_Britain',
        spa: 'Belgium',
        hungaroring: 'Hungary',
        zandvoort: 'Netherlands',
        monza: 'Italy',
        madring: null,           // New 2026 circuit — use fallback SVG
        baku: 'Baku',
        marina_bay: 'Singapore',
        americas: null,          // COTA Austin — use fallback SVG
        rodriguez: 'Mexico',
        interlagos: 'Brazil',
        vegas: 'Las_Vegas',
        losail: 'Qatar',
        yas_marina: 'Abu_Dhabi',
    },

    // Fallback circuit shapes for circuits without F1.com map
    FALLBACK_CIRCUITS: {
        americas: 'M30,60 L60,40 L150,35 L210,45 L280,30 C320,30 370,50 370,80 C370,110 320,120 280,110 L210,100 L150,105 L60,95 Z',
        madring: 'M40,60 L80,35 L160,40 L240,30 L320,50 L360,70 L340,100 L240,110 L160,105 L80,100 Z',
    },

    getCircuitMapUrl(circuitId) {
        const name = this.CIRCUIT_MAP_NAMES[circuitId];
        if (name) {
            return `https://media.formula1.com/image/upload/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/${name}_Circuit.png`;
        }
        return null; // Use fallback SVG
    },

    getFallbackCircuitPath(circuitId) {
        return this.FALLBACK_CIRCUITS[circuitId] || null;
    },

    async fetchJSON(path) {
        const res = await fetch(`${this.BASE}${path}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    },

    async getCalendar(year) {
        const data = await this.fetchJSON(`/${year}.json`);
        const races = data.MRData.RaceTable.Races;
        return races.map(r => ({
            round: parseInt(r.round),
            name: r.raceName,
            date: r.date,
            time: r.time,
            country: r.Circuit.Location.country,
            circuitName: r.Circuit.circuitName,
            circuitId: r.Circuit.circuitId,
            sessions: {
                fp1: r.FirstPractice ? { date: r.FirstPractice.date, time: r.FirstPractice.time } : null,
                fp2: r.SecondPractice ? { date: r.SecondPractice.date, time: r.SecondPractice.time } : null,
                fp3: r.ThirdPractice ? { date: r.ThirdPractice.date, time: r.ThirdPractice.time } : null,
                qualifying: r.Qualifying ? { date: r.Qualifying.date, time: r.Qualifying.time } : null,
                sprint: r.Sprint ? { date: r.Sprint.date, time: r.Sprint.time } : null,
                sprintQualifying: r.SprintQualifying ? { date: r.SprintQualifying.date, time: r.SprintQualifying.time } : null,
            },
            hasSprint: !!r.Sprint,
            // Results — populated when available
            qualifyingResults: null,
            raceResults: null,
        }));
    },

    async getQualifyingResults(year, round) {
        try {
            const data = await this.fetchJSON(`/${year}/${round}/qualifying.json`);
            const results = data.MRData.RaceTable.Races[0]?.QualifyingResults || [];
            return results.slice(0, 3).map(r => ({
                position: r.position,
                driver: `${r.Driver.givenName} ${r.Driver.familyName}`,
                code: r.Driver.code || r.Driver.familyName.substring(0, 3).toUpperCase(),
                constructor: r.Constructor.name,
                q1: r.Q1,
                q2: r.Q2,
                q3: r.Q3,
            }));
        } catch {
            return null;
        }
    },

    async getRaceResults(year, round) {
        try {
            const data = await this.fetchJSON(`/${year}/${round}/results.json`);
            const results = data.MRData.RaceTable.Races[0]?.Results || [];
            return results.slice(0, 3).map(r => ({
                position: r.position,
                driver: `${r.Driver.givenName} ${r.Driver.familyName}`,
                code: r.Driver.code || r.Driver.familyName.substring(0, 3).toUpperCase(),
                constructor: r.Constructor.name,
                time: r.Time?.time || r.status,
                points: r.points,
            }));
        } catch {
            return null;
        }
    },

    async getDriverStandings(year) {
        try {
            const data = await this.fetchJSON(`/${year}/driverStandings.json`);
            const standings = data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || [];
            return standings.map(s => ({
                position: s.position,
                driver: `${s.Driver.givenName} ${s.Driver.familyName}`,
                code: s.Driver.code || s.Driver.familyName.substring(0, 3).toUpperCase(),
                constructor: s.Constructors[0]?.name || '',
                points: s.points,
                wins: s.wins,
            }));
        } catch {
            return [];
        }
    },

    async getConstructorStandings(year) {
        try {
            const data = await this.fetchJSON(`/${year}/constructorStandings.json`);
            const standings = data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || [];
            return standings.map(s => ({
                position: s.position,
                constructor: s.Constructor.name,
                points: s.points,
                wins: s.wins,
            }));
        } catch {
            return [];
        }
    },

    // Local fallback calendars
    getFallbackCalendar(year) {
        const data = this.FALLBACK_CALENDARS[year];
        if (!data) return [];
        return data.map(r => ({
            ...r,
            circuitId: r.circuitName.toLowerCase().replace(/\s+/g, '_'),
            time: '14:00:00Z',
            sessions: { fp1: null, fp2: null, fp3: null, qualifying: null, sprint: null, sprintQualifying: null },
            qualifyingResults: null,
            raceResults: null,
        }));
    },

    FALLBACK_CALENDARS: {
        2025: [
            { round: 1, name: 'Australian Grand Prix', date: '2025-03-16', country: 'Australia', circuitName: 'Albert Park Circuit', hasSprint: false },
            { round: 2, name: 'Chinese Grand Prix', date: '2025-03-23', country: 'China', circuitName: 'Shanghai International Circuit', hasSprint: true },
            { round: 3, name: 'Japanese Grand Prix', date: '2025-04-06', country: 'Japan', circuitName: 'Suzuka Circuit', hasSprint: false },
            { round: 4, name: 'Bahrain Grand Prix', date: '2025-04-13', country: 'Bahrain', circuitName: 'Bahrain International Circuit', hasSprint: false },
            { round: 5, name: 'Saudi Arabian Grand Prix', date: '2025-04-20', country: 'Saudi Arabia', circuitName: 'Jeddah Corniche Circuit', hasSprint: false },
            { round: 6, name: 'Miami Grand Prix', date: '2025-05-04', country: 'USA', circuitName: 'Miami International Autodrome', hasSprint: true },
            { round: 7, name: 'Emilia Romagna Grand Prix', date: '2025-05-18', country: 'Italy', circuitName: 'Autodromo Enzo e Dino Ferrari', hasSprint: false },
            { round: 8, name: 'Monaco Grand Prix', date: '2025-05-25', country: 'Monaco', circuitName: 'Circuit de Monaco', hasSprint: false },
            { round: 9, name: 'Spanish Grand Prix', date: '2025-06-01', country: 'Spain', circuitName: 'Circuit de Barcelona-Catalunya', hasSprint: false },
            { round: 10, name: 'Canadian Grand Prix', date: '2025-06-15', country: 'Canada', circuitName: 'Circuit Gilles Villeneuve', hasSprint: false },
            { round: 11, name: 'Austrian Grand Prix', date: '2025-06-29', country: 'Austria', circuitName: 'Red Bull Ring', hasSprint: true },
            { round: 12, name: 'British Grand Prix', date: '2025-07-06', country: 'UK', circuitName: 'Silverstone Circuit', hasSprint: false },
            { round: 13, name: 'Belgian Grand Prix', date: '2025-07-27', country: 'Belgium', circuitName: 'Circuit de Spa-Francorchamps', hasSprint: true },
            { round: 14, name: 'Hungarian Grand Prix', date: '2025-08-03', country: 'Hungary', circuitName: 'Hungaroring', hasSprint: false },
            { round: 15, name: 'Dutch Grand Prix', date: '2025-08-31', country: 'Netherlands', circuitName: 'Circuit Zandvoort', hasSprint: false },
            { round: 16, name: 'Italian Grand Prix', date: '2025-09-07', country: 'Italy', circuitName: 'Autodromo Nazionale di Monza', hasSprint: false },
            { round: 17, name: 'Azerbaijan Grand Prix', date: '2025-09-21', country: 'Azerbaijan', circuitName: 'Baku City Circuit', hasSprint: false },
            { round: 18, name: 'Singapore Grand Prix', date: '2025-10-05', country: 'Singapore', circuitName: 'Marina Bay Street Circuit', hasSprint: false },
            { round: 19, name: 'United States Grand Prix', date: '2025-10-19', country: 'USA', circuitName: 'Circuit of the Americas', hasSprint: true },
            { round: 20, name: 'Mexico City Grand Prix', date: '2025-10-26', country: 'Mexico', circuitName: 'Autódromo Hermanos Rodríguez', hasSprint: false },
            { round: 21, name: 'São Paulo Grand Prix', date: '2025-11-09', country: 'Brazil', circuitName: 'Autódromo José Carlos Pace', hasSprint: true },
            { round: 22, name: 'Las Vegas Grand Prix', date: '2025-11-23', country: 'USA', circuitName: 'Las Vegas Strip Street Circuit', hasSprint: false },
            { round: 23, name: 'Qatar Grand Prix', date: '2025-11-30', country: 'Qatar', circuitName: 'Losail International Circuit', hasSprint: true },
            { round: 24, name: 'Abu Dhabi Grand Prix', date: '2025-12-07', country: 'UAE', circuitName: 'Yas Marina Circuit', hasSprint: false },
        ],
        2026: [
            { round: 1, name: 'Australian Grand Prix', date: '2026-03-08', country: 'Australia', circuitName: 'Albert Park Circuit', hasSprint: false },
            { round: 2, name: 'Chinese Grand Prix', date: '2026-03-15', country: 'China', circuitName: 'Shanghai International Circuit', hasSprint: true },
            { round: 3, name: 'Japanese Grand Prix', date: '2026-03-29', country: 'Japan', circuitName: 'Suzuka Circuit', hasSprint: false },
            { round: 4, name: 'Bahrain Grand Prix', date: '2026-04-12', country: 'Bahrain', circuitName: 'Bahrain International Circuit', hasSprint: false },
            { round: 5, name: 'Saudi Arabian Grand Prix', date: '2026-04-19', country: 'Saudi Arabia', circuitName: 'Jeddah Corniche Circuit', hasSprint: false },
            { round: 6, name: 'Miami Grand Prix', date: '2026-05-03', country: 'USA', circuitName: 'Miami International Autodrome', hasSprint: true },
            { round: 7, name: 'Emilia Romagna Grand Prix', date: '2026-05-17', country: 'Italy', circuitName: 'Autodromo Enzo e Dino Ferrari', hasSprint: false },
            { round: 8, name: 'Monaco Grand Prix', date: '2026-05-24', country: 'Monaco', circuitName: 'Circuit de Monaco', hasSprint: false },
            { round: 9, name: 'Spanish Grand Prix', date: '2026-05-31', country: 'Spain', circuitName: 'Circuit de Barcelona-Catalunya', hasSprint: false },
            { round: 10, name: 'Canadian Grand Prix', date: '2026-06-14', country: 'Canada', circuitName: 'Circuit Gilles Villeneuve', hasSprint: false },
            { round: 11, name: 'Austrian Grand Prix', date: '2026-06-28', country: 'Austria', circuitName: 'Red Bull Ring', hasSprint: true },
            { round: 12, name: 'British Grand Prix', date: '2026-07-05', country: 'UK', circuitName: 'Silverstone Circuit', hasSprint: false },
            { round: 13, name: 'Belgian Grand Prix', date: '2026-07-19', country: 'Belgium', circuitName: 'Circuit de Spa-Francorchamps', hasSprint: true },
            { round: 14, name: 'Hungarian Grand Prix', date: '2026-07-26', country: 'Hungary', circuitName: 'Hungaroring', hasSprint: false },
            { round: 15, name: 'Dutch Grand Prix', date: '2026-08-23', country: 'Netherlands', circuitName: 'Circuit Zandvoort', hasSprint: false },
            { round: 16, name: 'Italian Grand Prix', date: '2026-08-30', country: 'Italy', circuitName: 'Autodromo Nazionale di Monza', hasSprint: false },
            { round: 17, name: 'Azerbaijan Grand Prix', date: '2026-09-13', country: 'Azerbaijan', circuitName: 'Baku City Circuit', hasSprint: false },
            { round: 18, name: 'Singapore Grand Prix', date: '2026-09-27', country: 'Singapore', circuitName: 'Marina Bay Street Circuit', hasSprint: false },
            { round: 19, name: 'United States Grand Prix', date: '2026-10-18', country: 'USA', circuitName: 'Circuit of the Americas', hasSprint: true },
            { round: 20, name: 'Mexico City Grand Prix', date: '2026-10-25', country: 'Mexico', circuitName: 'Autódromo Hermanos Rodríguez', hasSprint: false },
            { round: 21, name: 'São Paulo Grand Prix', date: '2026-11-01', country: 'Brazil', circuitName: 'Autódromo José Carlos Pace', hasSprint: true },
            { round: 22, name: 'Abu Dhabi Grand Prix', date: '2026-11-15', country: 'UAE', circuitName: 'Yas Marina Circuit', hasSprint: false },
        ],
    }
};
