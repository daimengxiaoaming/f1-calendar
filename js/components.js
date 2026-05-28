// DOM rendering functions
const DOM = {

    // Country → flag emoji mapping
    FLAGS: {
        'Australia': '🇦🇺', 'China': '🇨🇳', 'Japan': '🇯🇵',
        'USA': '🇺🇸', 'Canada': '🇨🇦', 'Monaco': '🇲🇨',
        'Spain': '🇪🇸', 'Austria': '🇦🇹', 'UK': '🇬🇧',
        'Belgium': '🇧🇪', 'Hungary': '🇭🇺', 'Netherlands': '🇳🇱',
        'Italy': '🇮🇹', 'Azerbaijan': '🇦🇿', 'Singapore': '🇸🇬',
        'Mexico': '🇲🇽', 'Brazil': '🇧🇷', 'UAE': '🇦🇪',
        'Bahrain': '🇧🇭', 'Saudi Arabia': '🇸🇦', 'Qatar': '🇶🇦',
    },

    getFlag(country) {
        return this.FLAGS[country] || '';
    },

    // --- Driver Standings ---
    renderStandings(standings) {
        if (!standings || standings.length === 0) {
            return '<div class="standings-empty">赛季尚未开始，暂无积分数据</div>';
        }
        const rows = standings.map((s, i) => {
            const medal = i < 3 ? ['🥇', '🥈', '🥉'][i] : '';
            return `
                <div class="standing-row" style="--delay: ${i * 30}ms">
                    <span class="standing-pos">${medal || s.position}</span>
                    <span class="standing-code">${DOM.escape(s.code)}</span>
                    <span class="standing-driver">${DOM.escape(s.driver)}</span>
                    <span class="standing-constructor">${DOM.escape(s.constructor)}</span>
                    <span class="standing-pts">${s.points}<span class="pts-label">pts</span></span>
                    ${s.wins > 0 ? `<span class="standing-wins" title="${s.wins} wins">${s.wins}🏆</span>` : ''}
                </div>`;
        }).join('');
        return `<div class="standings-list">${rows}</div>`;
    },

    // --- Race Cards ---
    renderRaceCard(race, isExpanded, num) {
        const past = DOM.isPastRace(race.date);
        const hasResults = !!(race.qualifyingResults || race.raceResults);
        const hasSprint = race.hasSprint;
        const expandClass = isExpanded ? 'expanded' : '';
        const pastClass = past && hasResults ? 'has-results' : '';
        const sprintClass = hasSprint ? 'has-sprint' : '';

        // Circuit map: use F1 CDN image or fallback SVG
        const mapUrl = F1API.getCircuitMapUrl(race.circuitId);
        const fallbackPath = F1API.getFallbackCircuitPath(race.circuitId);
        const mapHTML = mapUrl
            ? `<img src="${mapUrl}" alt="${DOM.escape(race.circuitName)} 赛道地图" class="circuit-map-img" loading="lazy" />`
            : fallbackPath
                ? `<svg viewBox="0 0 400 150" class="circuit-map-svg" preserveAspectRatio="xMidYMid meet"><path d="${fallbackPath}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/></svg>`
                : `<svg viewBox="0 0 400 150" class="circuit-map-svg" preserveAspectRatio="xMidYMid meet"><ellipse cx="200" cy="75" rx="150" ry="55" fill="none" stroke="currentColor" stroke-width="4" opacity="0.3" stroke-dasharray="10,6"/></svg>`;

        return `
        <article class="race-card ${expandClass} ${pastClass} ${sprintClass}" data-round="${race.round}" style="--i: ${num}">
            <div class="card-surface" role="button" tabindex="0" aria-expanded="${isExpanded}" aria-label="${race.name}">
                <div class="card-map" aria-hidden="true">
                    ${mapHTML}
                </div>
                <div class="card-header">
                    <span class="card-round">R${race.round}</span>
                    <span class="card-country">${DOM.getFlag(race.country)} ${DOM.escape(race.country)}</span>
                    ${hasSprint ? '<span class="sprint-badge">Sprint</span>' : ''}
                </div>
                <div class="card-circuit">${DOM.escape(race.name)} — ${DOM.escape(race.circuitName)}</div>
                <div class="card-date">${DOM.formatDate(race.date)}</div>
                <div class="card-chevron" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 20 20"><path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                </div>
            </div>
            <div class="card-details">
                <div class="details-inner">
                    ${DOM.renderSessions(race)}
                    ${past && hasResults ? DOM.renderResults(race) : (past ? DOM.renderNoResults() : DOM.renderUpcoming())}
                </div>
            </div>
        </article>`;
    },

    renderSessions(race) {
        const s = race.sessions;
        const items = [];
        if (s.sprintQualifying) items.push({ label: '冲刺排位赛', icon: '⚡', ...s.sprintQualifying });
        if (s.sprint) items.push({ label: '冲刺赛', icon: '🏁', ...s.sprint });
        if (s.fp1) items.push({ label: '一练', icon: '🔧', ...s.fp1 });
        if (s.fp2) items.push({ label: '二练', icon: '🔧', ...s.fp2 });
        if (s.fp3) items.push({ label: '三练', icon: '🔧', ...s.fp3 });
        if (s.qualifying) items.push({ label: '排位赛', icon: '⏱️', ...s.qualifying });
        if (race.date) items.push({ label: '正赛', icon: '🏆', date: race.date, time: race.time });

        if (items.length === 0) {
            return '<div class="sessions-empty">赛程时间待公布</div>';
        }

        return `
        <div class="sessions">
            <h4 class="section-label">赛程时间</h4>
            ${items.map(i => `
                <div class="session-row">
                    <span class="session-icon">${i.icon}</span>
                    <span class="session-label">${i.label}</span>
                    <span class="session-time">${DOM.formatDateTime(i.date, i.time)}</span>
                </div>
            `).join('')}
        </div>`;
    },

    renderResults(race) {
        let html = '';
        if (race.qualifyingResults) {
            html += `
            <div class="results-block">
                <h4 class="section-label">排位赛成绩</h4>
                <div class="podium">
                    ${race.qualifyingResults.map((r, i) => `
                        <div class="podium-row" style="--delay: ${i * 50}ms">
                            <span class="podium-medal">${['🥇', '🥈', '🥉'][i]}</span>
                            <span class="podium-code">${DOM.escape(r.code)}</span>
                            <span class="podium-driver">${DOM.escape(r.driver)}</span>
                            <span class="podium-constructor">${DOM.escape(r.constructor)}</span>
                            ${r.q3 ? `<span class="podium-time">${DOM.escape(r.q3)}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }
        if (race.raceResults) {
            html += `
            <div class="results-block">
                <h4 class="section-label">正赛成绩</h4>
                <div class="podium">
                    ${race.raceResults.map((r, i) => `
                        <div class="podium-row" style="--delay: ${i * 50}ms">
                            <span class="podium-medal">${['🥇', '🥈', '🥉'][i]}</span>
                            <span class="podium-code">${DOM.escape(r.code)}</span>
                            <span class="podium-driver">${DOM.escape(r.driver)}</span>
                            <span class="podium-constructor">${DOM.escape(r.constructor)}</span>
                            <span class="podium-time">${DOM.escape(r.time)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }
        return html;
    },

    renderNoResults() {
        return '<div class="results-pending">比赛已结束，成绩待公布</div>';
    },

    renderUpcoming() {
        return '<div class="results-upcoming">比赛尚未开始</div>';
    },

    // --- Utilities ---
    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return `${month}月${day}日 ${weekdays[d.getDay()]}`;
    },

    formatDateTime(dateStr, timeStr) {
        if (!dateStr) return '待定';
        if (!timeStr) timeStr = '00:00:00Z';
        // Ensure exactly one 'Z' suffix
        const cleanTime = timeStr.replace(/Z$/, '');
        const d = new Date(`${dateStr}T${cleanTime}Z`);
        if (isNaN(d.getTime())) return '待定';
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${month}月${day}日 ${h}:${m}`;
    },

    isPastRace(dateStr) {
        if (!dateStr) return false;
        const raceDate = new Date(dateStr + 'T23:59:59Z');
        return raceDate < new Date();
    },

    escape(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // --- Loading / Error ---
    showLoading(show) {
        document.getElementById('loading').hidden = !show;
        document.getElementById('raceList').hidden = show;
    },

    showError(show, msg = '') {
        const el = document.getElementById('errorMsg');
        el.hidden = !show;
        if (msg) el.querySelector('p').textContent = msg;
    }
};
