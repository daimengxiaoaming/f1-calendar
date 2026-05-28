// Main entry point
const App = {

    async init(year = 2026) {
        State.init(year);
        DOM.showLoading(true);
        DOM.showError(false);

        // Render year buttons
        this.renderYearSelector();
        // Bind standings toggle
        this.bindStandingsToggle();

        try {
            const [races, standings, constructorStandings] = await Promise.all([
                F1API.getCalendar(year),
                F1API.getDriverStandings(year),
                F1API.getConstructorStandings(year),
            ]);

            State.setRaces(races);
            State.setStandings(standings);
            State.setConstructorStandings(constructorStandings);
            State.setUsingFallback(false);
        } catch (err) {
            console.warn('API fetch failed, using fallback:', err.message);
            const fallback = F1API.getFallbackCalendar(year);
            State.setRaces(fallback);
            State.setStandings([]);
            State.setUsingFallback(true);
        }

        State.setLoading(false);
        DOM.showLoading(false);

        if (State.usingFallback) {
            DOM.showError(true, 'API 数据加载失败，已使用本地赛历');
        }

        this.renderAll();
        this.bindEvents();
    },

    renderAll() {
        // Standings
        const driverTable = document.getElementById('driverStandingsTable');
        driverTable.innerHTML = DOM.renderStandings(State.standings);

        const constructorTable = document.getElementById('constructorStandingsTable');
        constructorTable.innerHTML = DOM.renderConstructorStandings(State.constructorStandings);

        // Race cards
        const raceList = document.getElementById('raceList');
        const cards = State.races.map((r, i) =>
            DOM.renderRaceCard(r, State.expandedCard === r.round, i)
        ).join('');
        raceList.innerHTML = cards || '<div class="empty-state">暂无赛历数据</div>';
    },

    async expandCard(round) {
        const race = State.getRaceByRound(round);
        if (!race) return;

        const prev = State.expandedCard;
        State.expandCard(round);

        // Collapse previous card first if different
        if (prev && prev !== round) {
            const prevCard = document.querySelector(`.race-card[data-round="${prev}"]`);
            if (prevCard) prevCard.classList.remove('expanded');
        }

        // Expand current card immediately (before API fetch)
        const card = document.querySelector(`.race-card[data-round="${round}"]`);
        if (card) {
            card.classList.add('expanded');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Fetch results in background if past race and not yet loaded
        if (DOM.isPastRace(race.date) && !race.qualifyingResults && !race.raceResults) {
            // Show loading indicator in results area
            const detailsInner = card?.querySelector('.details-inner');
            if (detailsInner) {
                const existingPending = detailsInner.querySelector('.results-pending');
                if (existingPending) {
                    existingPending.innerHTML = '<span class="loading-dot">加载成绩中</span>';
                }
            }

            const [qResults, rResults] = await Promise.all([
                F1API.getQualifyingResults(State.year, round),
                F1API.getRaceResults(State.year, round),
            ]);
            race.qualifyingResults = qResults;
            race.raceResults = rResults;

            // Update just the results portion of this card
            this.updateCardResults(card, race);
        }
    },

    updateCardResults(card, race) {
        if (!card) return;
        const detailsInner = card.querySelector('.details-inner');
        if (!detailsInner) return;

        const past = DOM.isPastRace(race.date);
        const hasResults = !!(race.qualifyingResults || race.raceResults);

        // Find and replace the results/pending/upcoming portion
        const resultsBlock = detailsInner.querySelector('.results-block, .results-pending, .results-upcoming');
        const anchor = detailsInner.querySelector('.sessions');

        if (resultsBlock) resultsBlock.remove();

        const newHTML = past && hasResults
            ? DOM.renderResults(race)
            : (past ? DOM.renderNoResults() : DOM.renderUpcoming());

        if (anchor) {
            anchor.insertAdjacentHTML('afterend', newHTML);
        } else {
            detailsInner.insertAdjacentHTML('beforeend', newHTML);
        }
    },

    collapseCard() {
        const prevRound = State.expandedCard;
        State.expandCard(null);
        if (prevRound) {
            const card = document.querySelector(`.race-card[data-round="${prevRound}"]`);
            if (card) card.classList.remove('expanded');
        }
    },

    bindEvents() {
        // Race card click
        document.querySelectorAll('.card-surface').forEach(surface => {
            surface.removeEventListener('click', this._cardClickHandler);
            surface.removeEventListener('keydown', this._cardKeyHandler);
        });

        this._cardClickHandler = (e) => {
            const card = e.currentTarget.closest('.race-card');
            const round = parseInt(card.dataset.round);
            if (State.expandedCard === round) {
                this.collapseCard();
            } else {
                this.expandCard(round);
            }
        };

        this._cardKeyHandler = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._cardClickHandler(e);
            }
        };

        document.querySelectorAll('.card-surface').forEach(surface => {
            surface.addEventListener('click', this._cardClickHandler);
            surface.addEventListener('keydown', this._cardKeyHandler);
        });

        // Retry button
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.onclick = () => this.init(State.year);
        }
    },

    bindStandingsToggle() {
        const bindToggle = (toggleId, bodyId, hasData) => {
            const toggle = document.getElementById(toggleId);
            const body = document.getElementById(bodyId);
            if (!toggle || !body) return;
            toggle.onclick = () => {
                const open = body.classList.toggle('open');
                toggle.querySelector('.standings-chevron').textContent = open ? '▴' : '▾';
            };
            if (hasData) {
                body.classList.add('open');
                toggle.querySelector('.standings-chevron').textContent = '▴';
            }
        };
        bindToggle('driverStandingsToggle', 'driverStandingsBody', State.standings.length > 0);
        bindToggle('constructorStandingsToggle', 'constructorStandingsBody', State.constructorStandings.length > 0);
    },

    renderYearSelector() {
        const container = document.querySelector('.year-selector');
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let y = 2025; y <= currentYear; y++) {
            years.push(y);
        }
        container.innerHTML = years.map(y =>
            `<button class="year-btn ${y === State.year ? 'active' : ''}" data-year="${y}">${y}</button>`
        ).join('');

        container.querySelectorAll('.year-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const y = parseInt(btn.dataset.year);
                if (y !== State.year) {
                    this.init(y);
                }
            });
        });
    }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init(2026));
