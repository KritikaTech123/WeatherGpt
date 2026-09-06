import { useEffect, useMemo, useState, type CSSProperties } from "react";

const scenes = [
  { id: "opening", label: "An ordinary question", duration: 4800 },
  { id: "map", label: "Everywhere in India", duration: 4700 },
  { id: "language", label: "Your language", duration: 4300 },
  { id: "voice", label: "Ask out loud", duration: 4500 },
  { id: "field", label: "Advice for this field", duration: 4900 },
  { id: "community", label: "A little wisdom travels", duration: 4300 },
  { id: "closing", label: "A clearer day", duration: 4200 },
] as const;

const languages = [
  ["हिंदी", "Hindi"],
  ["मराठी", "Marathi"],
  ["தமிழ்", "Tamil"],
  ["ਪੰਜਾਬੀ", "Punjabi"],
  ["বাংলা", "Bengali"],
  ["తెలుగు", "Telugu"],
];

const fieldTasks = [
  { time: "06:40", text: "Walk the cotton rows", state: "done" },
  { time: "09:15", text: "Hold spraying — wind rising", state: "hold" },
  { time: "18:10", text: "Check soil moisture", state: "next" },
];

function IndiaAtlas() {
  return (
    <div className="atlas" aria-hidden="true">
      <div className="atlas-grid" />
      <div className="india-silhouette">
        <span className="state-line line-one" />
        <span className="state-line line-two" />
        <span className="state-line line-three" />
        <span className="state-line line-four" />
        <span className="state-line line-five" />
      </div>
      <span className="map-pin pin-nashik">●</span>
      <span className="map-pin pin-punjab">●</span>
      <span className="map-pin pin-karnataka">●</span>
      <span className="map-pin pin-assam">●</span>
      <span className="map-pin pin-tamil">●</span>
    </div>
  );
}

function VoiceWave() {
  return (
    <div className="voice-wave" aria-hidden="true">
      {Array.from({ length: 32 }, (_, index) => (
        <i key={index} style={{ "--bar": `${22 + ((index * 17) % 68)}%`, "--delay": `${index * 0.035}s` } as CSSProperties} />
      ))}
    </div>
  );
}

function WeatherRing() {
  return (
    <div className="weather-ring" aria-hidden="true">
      <div className="sun-core" />
      <div className="orbit orbit-a"><span /></div>
      <div className="orbit orbit-b"><span /></div>
      <div className="orbit orbit-c"><span /></div>
    </div>
  );
}

function App() {
  const [scene, setScene] = useState(0);
  const current = scenes[scene];

  useEffect(() => {
    const timer = window.setTimeout(() => setScene((value) => (value + 1) % scenes.length), current.duration);
    return () => window.clearTimeout(timer);
  }, [current.duration]);

  const progress = useMemo(() => `${(scene / scenes.length) * 100}%`, [scene]);

  return (
    <main className={`film film-${current.id}`} data-scene={current.id}>
      <div className="film-grain" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="persistent-mark">
        <span className="mark-sun">✳</span>
        <span>WeatherGPT</span>
        <b>for farmers</b>
      </div>
      <div className="scene-index" aria-hidden="true">
        <span>0{scene + 1}</span>
        <span className="index-rule"><i style={{ width: progress }} /></span>
        <span>07</span>
      </div>

      <section className="scene-layer scene-opening">
        <div className="opening-photo" />
        <div className="opening-wash" />
        <div className="opening-copy">
          <p className="kicker">A weather companion for real life</p>
          <h1>What will<br /><em>today</em> ask<br />of you?</h1>
          <div className="opening-answer">
            <span className="answer-dot" />
            <span>Start with a simple question.</span>
          </div>
        </div>
        <div className="date-stamp">NASHIK / 06:42<br /><span>MONSOON FIELD NOTE 01</span></div>
      </section>

      <section className="scene-layer scene-map">
        <div className="map-copy">
          <p className="kicker">One country. Many skies.</p>
          <h2>Look up<br /><em>anywhere.</em></h2>
          <p className="body-copy">Browse from state to district to city — and find the weather that belongs to your place.</p>
        </div>
        <IndiaAtlas />
        <div className="map-callout callout-one"><b>18%</b><span>rain chance<br />Nashik</span></div>
        <div className="map-callout callout-two"><b>60%</b><span>rain chance<br />Bengaluru</span></div>
        <div className="map-legend"><span className="legend-dot" /> local forecast / field advice</div>
      </section>

      <section className="scene-layer scene-language">
        <div className="language-copy">
          <p className="kicker">No translation needed</p>
          <h2>Weather<br />in <em>your words.</em></h2>
          <p className="body-copy">English, Hindi, Marathi — and voices from across India.</p>
        </div>
        <div className="language-wheel">
          {languages.map(([native, english], index) => (
            <div className={`language-chip chip-${index}`} key={english}>
              <span>{native}</span><small>{english}</small>
            </div>
          ))}
          <div className="language-center"><span>22</span><small>Indian<br />languages</small></div>
        </div>
        <div className="script-ribbon">नमस्ते&nbsp;&nbsp; नमस्कार&nbsp;&nbsp; வணக்கம்&nbsp;&nbsp; నమస్కారం</div>
      </section>

      <section className="scene-layer scene-voice">
        <div className="voice-copy">
          <p className="kicker">Hands busy? Keep them there.</p>
          <h2>Ask the<br /><em>sky out loud.</em></h2>
          <p className="body-copy">Voice-first questions. A calm answer you can hear in the field.</p>
        </div>
        <div className="voice-card">
          <div className="voice-card-top"><span className="record-dot" /> LISTENING IN MARATHI <span className="duration">00:07</span></div>
          <div className="quote">“आज फवारणी<br />करू का?”</div>
          <VoiceWave />
          <div className="voice-card-bottom"><span>तुमचा प्रश्न</span><span className="voice-play">▶</span></div>
        </div>
        <div className="voice-orbit-label">SPEAK<br />NATURALLY</div>
      </section>

      <section className="scene-layer scene-field">
        <div className="field-copy">
          <p className="kicker">Weather is useful when it becomes action.</p>
          <h2>A forecast<br />that knows<br /><em>your field.</em></h2>
        </div>
        <div className="field-dashboard">
          <div className="dashboard-header"><span>MY FARM / NASHIK</span><span className="status-pill">COTTON · 12 ACRES</span></div>
          <div className="dashboard-weather">
            <WeatherRing />
            <div className="temperature"><strong>28°</strong><span>WARM / GENTLE BREEZE</span></div>
          </div>
          <div className="advice-card"><span className="advice-mark">↗</span><div><small>TODAY’S SIMPLE ADVICE</small><p>Good spraying window<br />before late afternoon.</p></div></div>
          <div className="task-list">{fieldTasks.map((task) => <div className={`task-row task-${task.state}`} key={task.text}><span className="task-time">{task.time}</span><span className="task-check">{task.state === "done" ? "✓" : task.state === "hold" ? "!" : "○"}</span><span>{task.text}</span></div>)}</div>
        </div>
      </section>

      <section className="scene-layer scene-community">
        <div className="community-copy">
          <p className="kicker">The field is bigger than one field.</p>
          <h2>Good advice<br /><em>travels.</em></h2>
          <p className="body-copy">Ask a neighbour. Share what worked. Make local knowledge visible.</p>
        </div>
        <div className="post-stack">
          <article className="post post-back"><span>MS</span><div><b>Meena S.</b><small>Tomato / Nashik</small><p>Water at the roots, not the leaves.</p></div></article>
          <article className="post post-front"><span>RK</span><div><b>Ramesh K.</b><small>Cotton / Nashik</small><p>Clouds building over our side.<br />Should I wait before spraying?</p><footer><strong>♡ 14</strong><span>reply</span><span>just now</span></footer></div></article>
          <div className="share-stamp">FIELD<br />NOTES<br /><i>↗</i></div>
        </div>
      </section>

      <section className="scene-layer scene-closing">
        <div className="closing-arc" />
        <div className="closing-copy">
          <span className="closing-sun">✳</span>
          <h2>Make room<br />for a <em>clearer</em><br />day.</h2>
          <p>WeatherGPT for Farmers</p>
          <span className="closing-rule" />
          <small>Weather guidance for everyone, everywhere in India.</small>
        </div>
        <div className="closing-foot">WEATHER / WORK / COMMUNITY</div>
      </section>
    </main>
  );
}

export default App;