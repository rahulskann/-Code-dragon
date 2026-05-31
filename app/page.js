import Script from "next/script";

export default function Page() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="/css/styles.css" />

      <div id="app">
        <div className="modeTag" id="modeTag">CLASSIC</div>
        <button id="muteBtn" title="toggle sound">♪ ON</button>

        <div className="titlebar">
          <h1 className="pixel">CODE&nbsp;DRAGON</h1>
          <div className="sub">~ The Interview of Fire ~</div>
        </div>

        {/* ===================== SETUP ===================== */}
        <section id="setupScreen" className="active">
          <div className="prompt">Choose how the <b>dragon</b> tests you.</div>
          <div className="setup-note">
            AI Mode uses Google Gemini to ask open-ended questions and grade what you actually
            type — like a real interview. Classic Mode runs offline with a fixed multiple-choice bank.
          </div>

          <div className="toggle-row">
            <div className="toggle aiopt" id="optAI" tabIndex="0">
              <h4>AI MODE</h4>
              <p>Type your answers. Gemini grades them &amp; the dragon talks back.</p>
            </div>
            <div className="toggle classicopt sel" id="optClassic" tabIndex="0">
              <h4>CLASSIC</h4>
              <p>Multiple choice. Works fully offline.</p>
            </div>
          </div>

          <div id="voiceWrap">
            <div className="setup-note" style={{ margin: "18px 0 8px" }}>
              Optional: paste an <b>ElevenLabs</b> key to give the heroes &amp; dragon real voices — they speak when you hover a class and when blows land in battle.
            </div>
            <div className="keyrow">
              <input id="voiceKey" type="password" placeholder="ElevenLabs API key (optional, for voices)" autoComplete="off" />
              <button className="btn ghost" id="voiceSave" style={{ fontSize: "9px" }}>SAVE</button>
            </div>
            <div id="voiceStatus"></div>
          </div>

          <div className="btnrow">
            <button className="btn" id="toSelect">ENTER THE LAIR ▶</button>
          </div>
        </section>

        {/* ===================== SELECT ===================== */}
        <section id="selectScreen">
          <div className="prompt">A <b>dragon</b> guards the offer letter.<br />Choose your class, adventurer.</div>
          <div className="cards" id="cards"></div>
          <div className="hint">Each class is quizzed on its own craft.</div>
        </section>

        {/* ===================== BATTLE ===================== */}
        <section id="battleScreen">
          <div className="stage">
            <canvas id="stageCanvas" width="320" height="160"></canvas>
            <div className="nameplate" id="dragonPlate">
              THE DRAGON
              <div className="bar"><i id="dragonHpFill"></i></div>
              <div className="hpnum"><span id="dragonHpNum">100</span> HP</div>
            </div>
            <div className="nameplate" id="heroPlate">
              <span id="heroName">HERO</span>
              <div className="bar"><i id="heroHpFill"></i></div>
              <div className="hpnum"><span id="heroHpNum">100</span> HP</div>
            </div>
          </div>

          <div className="qpanel">
            <div className="turnflag" id="turnFlag">⚔ YOUR STRIKE — answer to deal damage</div>
            <div id="questionText">…</div>
            <div id="answerArea"></div>
            <div className="verdict" id="verdict"></div>
          </div>
        </section>

        {/* ===================== END ===================== */}
        <section id="endScreen">
          <div id="endTitle"></div>
          <div id="endSub"></div>
          <div id="endStats"></div>
          <div id="endReview"></div>
          <div className="btnrow">
            <button className="btn" id="againBtn">RUN IT BACK</button>
            <button className="btn ghost" id="classBtn">NEW CLASS</button>
          </div>
        </section>
      </div>

      {/* load order matters: each file relies on the ones above it */}
      <Script src="/js/config.js" strategy="beforeInteractive" />
      <Script src="/js/sprites.js" strategy="beforeInteractive" />
      <Script src="/js/data.js" strategy="beforeInteractive" />
      <Script src="/js/gemini.js" strategy="beforeInteractive" />
      <Script src="/js/audio.js" strategy="beforeInteractive" />
      <Script src="/js/render.js" strategy="beforeInteractive" />
      <Script src="/js/game.js" strategy="beforeInteractive" />
      <Script src="/js/ui.js" strategy="beforeInteractive" />
    </>
  );
}
