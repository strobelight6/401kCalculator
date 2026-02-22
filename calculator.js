// ---------------------------------------------------------------------------
// Pure calculation functions — no DOM dependencies, fully unit-testable
// ---------------------------------------------------------------------------

/**
 * Compute the required contribution rate and per-paycheck amount.
 *
 * @param {number} salary          Annual gross salary
 * @param {number} ytd             Amount already contributed year-to-date
 * @param {number} goal            Target contribution amount for the year
 * @param {number} totalPeriods    Number of pay periods in the year
 * @param {number} remainingPeriods Number of pay periods left in the year
 * @returns {{ requiredPercent: number, perCheck: number, remainingAmount: number, remainingGrossPay: number }}
 */
function computeContribution(salary, ytd, goal, totalPeriods, remainingPeriods) {
    const remainingAmount = goal - ytd;
    const grossPerPeriod = salary / totalPeriods;
    const remainingGrossPay = grossPerPeriod * remainingPeriods;

    let requiredPercent = 0;
    let perCheck = 0;

    if (remainingGrossPay > 0 && remainingAmount > 0) {
        requiredPercent = (remainingAmount / remainingGrossPay) * 100;
        perCheck = remainingAmount / remainingPeriods;
    }

    return { requiredPercent, perCheck, remainingAmount, remainingGrossPay };
}

/**
 * Compute the "what-if" scenario for a given contribution percentage.
 *
 * @param {number} adjustedRate     Chosen contribution rate (0–100)
 * @param {number} remainingGrossPay Gross pay left for the year
 * @param {number} ytd             Amount already contributed year-to-date
 * @param {number} goal            Target contribution amount for the year
 * @returns {{ totalYearEnd: number, diff: number }}
 */
function computeScenario(adjustedRate, remainingGrossPay, ytd, goal) {
    const contributionFromNow = (adjustedRate / 100) * remainingGrossPay;
    const totalYearEnd = ytd + contributionFromNow;
    const diff = totalYearEnd - goal;
    return { totalYearEnd, diff };
}

/**
 * Estimate the number of pay periods remaining in the year from a given date.
 *
 * @param {Date}   now          Current date
 * @param {number} totalPeriods Number of pay periods in the year
 * @returns {number} Estimated remaining pay periods (minimum 1)
 */
function estimateRemainingPeriods(now, totalPeriods) {
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = (yearEnd - now) / msPerDay;
    const daysInPeriod = 365 / totalPeriods;
    const estimate = Math.floor(daysLeft / daysInPeriod);
    return Math.max(1, estimate);
}

// ---------------------------------------------------------------------------
// DOM wiring — only runs in a browser context
// ---------------------------------------------------------------------------

if (typeof document !== 'undefined') {
    const salaryInput = document.getElementById('salary');
    const ytdInput = document.getElementById('ytd');
    const ageBracket = document.getElementById('ageBracket');
    const customGoalDiv = document.getElementById('customGoalDiv');
    const customGoalInput = document.getElementById('customGoal');
    const totalPeriodsInput = document.getElementById('totalPeriods');
    const remainingPeriodsInput = document.getElementById('remainingPeriods');
    const slider = document.getElementById('adjustmentSlider');
    const sliderValueDisplay = document.getElementById('sliderValue');

    function initRemainingPeriods() {
        const totalPeriods = parseInt(totalPeriodsInput.value) || 26;
        remainingPeriodsInput.value = estimateRemainingPeriods(new Date(), totalPeriods);
    }

    function calculate() {
        const salary = parseFloat(salaryInput.value) || 0;
        const ytd = parseFloat(ytdInput.value) || 0;
        const totalPeriods = parseInt(totalPeriodsInput.value) || 26;
        const remainingPeriods = parseInt(remainingPeriodsInput.value) || 1;

        let goal = 0;
        if (ageBracket.value === 'custom') {
            customGoalDiv.classList.remove('hidden');
            goal = parseFloat(customGoalInput.value) || 0;
        } else {
            customGoalDiv.classList.add('hidden');
            goal = parseFloat(ageBracket.value);
        }

        const { requiredPercent, perCheck, remainingAmount, remainingGrossPay } =
            computeContribution(salary, ytd, goal, totalPeriods, remainingPeriods);

        document.getElementById('percentResult').innerText =
            requiredPercent > 100 ? '100%+' : requiredPercent.toFixed(1) + '%';
        document.getElementById('perCheckResult').innerText =
            `$${perCheck.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / paycheck`;

        const progress = goal > 0 ? Math.min(100, (ytd / goal) * 100) : 0;
        document.getElementById('progressBar').style.width = progress + '%';
        document.getElementById('progressLabel').innerText = Math.round(progress) + '% Complete';
        document.getElementById('remainingDollarLabel').innerText =
            `$${Math.max(0, remainingAmount).toLocaleString()} left`;

        const adjustedRate = parseFloat(slider.value);
        sliderValueDisplay.innerText = adjustedRate + '%';

        const { totalYearEnd, diff } = computeScenario(adjustedRate, remainingGrossPay, ytd, goal);

        document.getElementById('scenarioTotal').innerText =
            `$${totalYearEnd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

        const diffEl = document.getElementById('scenarioDiff');
        const statusEl = document.getElementById('scenarioStatus');

        if (diff >= 0) {
            diffEl.innerText = `+$${diff.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            diffEl.className = 'font-mono text-sm font-medium text-neutral-900';
            statusEl.innerText = 'Goal Met';
            statusEl.className = 'mt-3 px-3 py-2 text-[10px] font-semibold tracking-[0.15em] uppercase text-center border border-neutral-900 bg-neutral-900 text-white';
        } else {
            diffEl.innerText = `-$${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
            diffEl.className = 'font-mono text-sm font-medium text-red-700';
            statusEl.innerText = 'Shortfall';
            statusEl.className = 'mt-3 px-3 py-2 text-[10px] font-semibold tracking-[0.15em] uppercase text-center border border-red-700 text-red-700';
        }

        const warningBox = document.getElementById('warningBox');
        if (requiredPercent > 100) {
            warningBox.classList.remove('hidden');
        } else {
            warningBox.classList.add('hidden');
        }
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.innerText = message;
        toast.className = 'show';
        setTimeout(function () { toast.className = toast.className.replace('show', ''); }, 3000);
    }

    function copyToClipboard() {
        const text = window.location.href;
        const dummy = document.createElement('input');
        document.body.appendChild(dummy);
        dummy.value = text;
        dummy.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast('Link copied to clipboard!');
            }
        } catch (err) {
            console.error('Unable to copy', err);
        }
        document.body.removeChild(dummy);
    }

    async function shareLink() {
        const shareData = {
            title: '2026 401k Pacer',
            text: 'Helpful tool to calculate your 401k contributions for the rest of 2026.',
            url: window.location.href,
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    copyToClipboard();
                }
            }
        } else {
            copyToClipboard();
        }
    }

    // Expose share functions for inline onclick handlers
    window.copyToClipboard = copyToClipboard;
    window.shareLink = shareLink;

    [salaryInput, ytdInput, ageBracket, customGoalInput, totalPeriodsInput, remainingPeriodsInput, slider].forEach(el => {
        el.addEventListener('input', calculate);
    });

    window.onload = function () {
        initRemainingPeriods();
        calculate();
    };
}

