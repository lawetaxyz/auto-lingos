// ==UserScript==
// @name         Auto Lingos
// @namespace    http://tampermonkey.net/
// @version      1.0
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
        input.focus();
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

    setInterval(() => {
        const question = getQuestion();
        const redAnswer = getRedBoxAnswer();
        const input = document.getElementById('learning-answer');

        const db = getDb();
        const savedAnswer = question ? db[question] : null;

        if (question && redAnswer) {
            savePair(question, redAnswer);
        }

        ui.innerHTML = `
            <div style="color:#38bdf8;font-weight:bold;margin-bottom:4px;">[ AUTO LINGOS by laweta ]</div>
            <div>Pytanie: <b style="color:#facc15;">${question || 'NIE WYKRYTO'}</b></div>
            <div>Czerwona ramka: <b style="color:#f87171;">${redAnswer || 'BRAK'}</b></div>
            <div>Odpowiedź w bazie: <b style="color:#4ade80;">${savedAnswer || 'BRAK WPISU'}</b></div>
            <div style="margin-top:4px;color:#94a3b8;border-top:1px solid #334155;padding-top:4px;">Baza słówek: ${Object.keys(db).length}</div>
        `;

        if (input && !input.disabled && question && savedAnswer && input.value !== savedAnswer) {
            setInputValue(input, savedAnswer);
        }

        clickNextButton();
    }, 300);
})();
