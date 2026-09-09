// ==UserScript==
// @name         Auto Lingos
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatyczny bot do lingos.pl
// @author       laweta
// @match        *://*.lingos.pl/*
// @match        *://lingos.pl/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'lingos_db';
    let lastClickTime = 0;
    const CLICK_INTERVAL = 1000;
    let isActive = true;

    const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
            if (e.data === 'start') {
                if (!timer) timer = setInterval(() => self.postMessage('tick'), 300);
            } else if (e.data === 'stop') {
                if (timer) { clearInterval(timer); timer = null; }
            }
        };
    `;
    const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
    const bgWorker = new Worker(URL.createObjectURL(workerBlob));

    function getDb() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    }

    function savePair(q, a) {
        if (!q || !a) return;
        const cleanQ = q.toLowerCase().trim();
        const cleanA = a.trim();
        const db = getDb();

        if (db[cleanQ] !== cleanA) {
            db[cleanQ] = cleanA;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
            console.log(`%c[Lingos Bot] ZAPISANO: "${cleanQ}" -> "${cleanA}"`, 'color: #00ff00; font-weight: bold;');
        }
    }

    function setInputValue(input, val) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, val);

        if (input._valueTracker) {
            input._valueTracker.setValue('');
        }

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const ui = document.createElement('div');
    ui.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:999999;background:#0f172a;color:#f8fafc;padding:12px;border-radius:8px;font-family:monospace;font-size:11px;box-shadow:0 4px 12px rgba(0,0,0,0.5);border:1px solid #334155;max-width:320px;';
    document.body.appendChild(ui);

    ui.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'toggle-bot-btn') {
            isActive = !isActive;
        }
    });

    function getQuestion() {
        const qEl = document.querySelector('p.text-2xl strong') || document.querySelector('p.text-2xl');
        return qEl ? qEl.textContent.trim().toLowerCase() : null;
    }

    function getRedBoxAnswer() {
        const redEl = document.querySelector('div[class*="bg-red"] span.text-foreground strong, div[class*="bg-red"] strong');
        return redEl ? redEl.textContent.trim() : null;
    }

    function clickNextButton() {
        const now = Date.now();
        if (now - lastClickTime < CLICK_INTERVAL) return;

        const btn = Array.from(document.querySelectorAll('button')).find(b =>
            b.textContent.toLowerCase().includes('dalej') ||
            b.type === 'submit'
        );

        if (btn && !btn.disabled) {
            btn.click();
            lastClickTime = Date.now();
        } else {
            const input = document.getElementById('learning-answer');
            if (input) {
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, code: 'Enter', bubbles: true }));
                lastClickTime = Date.now();
            }
        }
    }

    bgWorker.onmessage = function (e) {
        if (e.data !== 'tick') return;

        const question = getQuestion();
        const redAnswer = getRedBoxAnswer();
        const input = document.getElementById('learning-answer');

        const db = getDb();
        const savedAnswer = question ? db[question] : null;

        if (question && redAnswer) {
            savePair(question, redAnswer);
        }

        const statusColor = isActive ? '#4ade80' : '#f87171';
        const statusText = isActive ? 'AKTYWNY (TLE)' : 'WSTRZYMANY';
        const btnColor = isActive ? '#ef4444' : '#22c55e';
        const btnText = isActive ? 'PAUZA' : 'START';

        ui.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="color:#38bdf8;font-weight:bold;">[ AUTO LINGOS ]</span>
                <span style="color:${statusColor};font-weight:bold;font-size:10px;">● ${statusText}</span>
            </div>
            <div>Pytanie: <b style="color:#facc15;">${question || 'NIE WYKRYTO'}</b></div>
            <div>Czerwona ramka: <b style="color:#f87171;">${redAnswer || 'BRAK'}</b></div>
            <div>Odpowiedź w bazie: <b style="color:#4ade80;">${savedAnswer || 'BRAK WPISU'}</b></div>
            <div style="margin-top:6px;padding-top:6px;border-top:1px solid #334155;display:flex;justify-content:space-between;align-items:center;">
                <span style="color:#94a3b8;">Baza słówek: ${Object.keys(db).length}</span>
                <button id="toggle-bot-btn" style="background:${btnColor};color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-weight:bold;font-size:10px;">${btnText}</button>
            </div>
        `;

        if (isActive) {
            if (input && !input.disabled && question && savedAnswer && input.value !== savedAnswer) {
                setInputValue(input, savedAnswer);
            }
            clickNextButton();
        }
    };

    bgWorker.postMessage('start');
})();
