// App state management
const State = {
    year: 2026,
    races: [],
    standings: [],
    constructorStandings: [],
    expandedCard: null,
    loading: true,
    error: false,
    usingFallback: false,

    init(year = 2026) {
        this.year = year;
        this.races = [];
        this.standings = [];
        this.constructorStandings = [];
        this.expandedCard = null;
        this.loading = true;
        this.error = false;
        this.usingFallback = false;
    },

    setRaces(races) {
        this.races = races;
    },

    setStandings(standings) {
        this.standings = standings;
    },

    setConstructorStandings(standings) {
        this.constructorStandings = standings;
    },

    setLoading(val) {
        this.loading = val;
    },

    setError(val) {
        this.error = val;
    },

    setUsingFallback(val) {
        this.usingFallback = val;
    },

    expandCard(round) {
        this.expandedCard = this.expandedCard === round ? null : round;
    },

    getRaceByRound(round) {
        return this.races.find(r => r.round === round);
    }
};
